import { Prisma, type StatisticsExport } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { chmod, mkdir, readdir, rename, stat, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { PERMISSIONS } from '../constants/authorization.constants.js';
import { authorizationService, assertPermission } from './authorization.service.js';
import { backupRuntime } from './backup-runtime.service.js';
import { generateStatisticsWorkbook } from './statistics-workbook.service.js';
import type { AccessContext } from '../types/authorization.types.js';
import type { CreateStatisticsExport } from '../validation/statistics-export.schema.js';
import { AppError } from '../utils/app-error.js';

const day = 86_400_000; const leaseMs = 60_000;
/** Docker can create an existing volume root with public directory permissions; enforce privacy explicitly. */
async function prepareExportDirectory(): Promise<string> {
  if (!env.STATISTICS_EXPORT_DIRECTORY) throw new AppError(503, 'La exportación de Excel no está disponible.');
  const root = resolve(env.STATISTICS_EXPORT_DIRECTORY); await mkdir(root, { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') await chmod(root, 0o700); return root;
}
/** Export authorization is independent of accidental grants to non-administrative roles. */
export function assertStatisticsExportAccess(actor: AccessContext): void {
  if (!actor.roles.some(role => role === 'ADMINISTRATOR' || role === 'SUPER_ADMIN')) throw new AppError(403, 'Solo administradores pueden exportar estadísticas.');
  assertPermission(actor, PERMISSIONS.STATISTICS_READ); assertPermission(actor, PERMISSIONS.STATISTICS_EXPORT);
}
/** Only generated UUID artifact names are accepted, including when DB contents were restored. */
export const statisticsExportPath = (key: string, partial = false): string => {
  if (!env.STATISTICS_EXPORT_DIRECTORY) throw new AppError(503, 'La exportación de Excel no está disponible.');
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(key)) throw new AppError(503, 'El archivo de exportación no es válido.');
  return join(resolve(env.STATISTICS_EXPORT_DIRECTORY), key + (partial ? '.part' : '.xlsx'));
};
/** DTOs never expose storage paths, leases or account identifiers. */
export const statisticsExportView = (job: StatisticsExport, now = new Date()) => ({
  id: job.id, from: job.from.toISOString().slice(0, 10), to: job.to.toISOString().slice(0, 10),
  status: job.status === 'READY' && (!job.expiresAt || job.expiresAt <= now) ? 'EXPIRED' : job.status,
  createdAt: job.createdAt.toISOString(), startedAt: job.startedAt?.toISOString() ?? null, completedAt: job.completedAt?.toISOString() ?? null,
  snapshotAt: job.snapshotAt?.toISOString() ?? null, expiresAt: job.expiresAt?.toISOString() ?? null, sizeBytes: job.sizeBytes, rowCounts: job.rowCounts,
  error: job.error, fileName: `datos_FQA_${job.from.toISOString().slice(0, 10)}_${job.to.toISOString().slice(0, 10)}_${job.id}.xlsx`,
});
/** Serializable retries protect queue admission and global claims from concurrent tabs or backend instances. */
async function serialized<T>(operation: (database: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 20_000 }); }
    catch (error: unknown) {
      if (attempt < 3 && error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code)) continue;
      throw error;
    }
  }
}
/** The same request UUID can never be reused to export another range. */
export async function createStatisticsExport(payload: CreateStatisticsExport, actor: AccessContext) {
  assertStatisticsExportAccess(actor);
  await prepareExportDirectory();
  return serialized(async database => {
    const existing = await database.statisticsExport.findUnique({ where: { userId_requestId: { userId: actor.userId, requestId: payload.requestId } } });
    if (existing) {
      if (existing.from.toISOString().slice(0, 10) !== payload.from || existing.to.toISOString().slice(0, 10) !== payload.to) throw new AppError(409, 'La solicitud ya corresponde a otro período.');
      return statisticsExportView(existing);
    }
    const pending = await database.statisticsExport.findFirst({ where: { userId: actor.userId, status: { in: ['QUEUED', 'PROCESSING'] } } });
    if (pending) {
      if (pending.from.toISOString().slice(0, 10) === payload.from && pending.to.toISOString().slice(0, 10) === payload.to) return statisticsExportView(pending);
      throw new AppError(409, 'Ya tienes una exportación en curso. Espera a que termine antes de solicitar otro período.');
    }
    const job = await database.statisticsExport.create({ data: { userId: actor.userId, requestId: payload.requestId, from: new Date(payload.from), to: new Date(payload.to) } });
    await database.auditLogs.create({ data: { userId: actor.userId, entityType: 'StatisticsExport', entityId: job.id, action: 'REQUEST', changes: { from: payload.from, to: payload.to } } });
    return statisticsExportView(job);
  });
}
/** Private lists are paginated independently from workbook data. */
export async function listStatisticsExports(page: number, pageSize: number, actor: AccessContext) {
  assertStatisticsExportAccess(actor); const where = { userId: actor.userId, createdAt: { gte: new Date(Date.now() - 30 * day) } };
  const [rows, total] = await prisma.$transaction([prisma.statisticsExport.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }), prisma.statisticsExport.count({ where })]);
  return { items: rows.map(row => statisticsExportView(row)), total, page, pageSize };
}
/** Owner checks deliberately return the same response for missing and foreign jobs. */
export async function getStatisticsExport(id: number, actor: AccessContext): Promise<StatisticsExport> {
  assertStatisticsExportAccess(actor); const job = await prisma.statisticsExport.findFirst({ where: { id, userId: actor.userId } });
  if (!job) throw new AppError(404, 'La exportación no existe.'); return job;
}
/** Download is authorized again and recorded before streaming any personal data. */
export async function downloadStatisticsExport(id: number, actor: AccessContext) {
  const job = await getStatisticsExport(id, actor); const view = statisticsExportView(job);
  if (view.status === 'EXPIRED') throw new AppError(410, 'El archivo venció. Confirma el período para generar otro.');
  if (view.status !== 'READY' || !job.fileKey) throw new AppError(409, 'El archivo todavía no está disponible.');
  const path = statisticsExportPath(job.fileKey);
  const file = await stat(path).catch(() => null); if (!file?.isFile() || file.size !== job.sizeBytes) throw new AppError(410, 'El archivo ya no está disponible. Confirma el período para generar otro.');
  const release = backupRuntime.enter(true); if (!release) throw new AppError(503, 'Espera a que termine el mantenimiento para descargar.');
  try { await prisma.auditLogs.create({ data: { userId: actor.userId, entityType: 'StatisticsExport', entityId: id, action: 'DOWNLOAD' } }); }
  finally { release(); }
  return { stream: createReadStream(path), fileName: view.fileName, sizeBytes: file.size };
}
/** FIFO claim and stale-lease recovery are one serializable operation across all requesters. */
export async function claimStatisticsExport(now = new Date()): Promise<StatisticsExport | null> {
  return serialized(async database => {
    const stale = await database.statisticsExport.findMany({ where: { status: 'PROCESSING', lockedUntil: { lte: now } }, select: { id: true, userId: true, attempts: true } });
    for (const job of stale) {
      await database.statisticsExport.update({ where: { id: job.id }, data: { status: job.attempts >= 3 ? 'FAILED' : 'QUEUED', lockedUntil: null, leaseToken: null, nextAttemptAt: now, error: job.attempts >= 3 ? 'La generación se interrumpió. Puedes confirmar el período para reintentar.' : null } });
      if (job.attempts >= 3) await database.auditLogs.create({ data: { userId: job.userId, entityType: 'StatisticsExport', entityId: job.id, action: 'FAILED' } });
    }
    if (await database.statisticsExport.count({ where: { status: 'PROCESSING' } })) return null;
    const first = await database.statisticsExport.findFirst({ where: { status: 'QUEUED', nextAttemptAt: { lte: now } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    if (!first) return null;
    return database.statisticsExport.update({ where: { id: first.id }, data: { status: 'PROCESSING', attempts: { increment: 1 }, startedAt: now, leaseToken: randomUUID(), lockedUntil: new Date(now.getTime() + leaseMs), error: null } });
  });
}
/** One failed attempt cannot publish its artifact after another worker has recovered the lease. */
export async function processStatisticsExport(job: StatisticsExport): Promise<void> {
  const key = randomUUID(); const partial = statisticsExportPath(key, true); const final = statisticsExportPath(key);
  let leaseLost = false; let heartbeat: Promise<void> | null = null;
  const timer = setInterval(() => {
    if (heartbeat) return;
    heartbeat = prisma.statisticsExport.updateMany({ where: { id: job.id, status: 'PROCESSING', leaseToken: job.leaseToken }, data: { lockedUntil: new Date(Date.now() + leaseMs) } })
      .then(result => { if (!result.count) leaseLost = true; }).catch(() => { leaseLost = true; }).finally(() => { heartbeat = null; });
  }, 15_000);
  try {
    assertStatisticsExportAccess(await authorizationService.getAccessContext(job.userId));
    const result = await generateStatisticsWorkbook(partial, { from: job.from.toISOString().slice(0, 10), to: job.to.toISOString().slice(0, 10) });
    assertStatisticsExportAccess(await authorizationService.getAccessContext(job.userId));
    if (leaseLost) throw new Error('lease');
    await rename(partial, final); const file = await stat(final); const completedAt = new Date();
    await prisma.$transaction(async database => {
      const updated = await database.statisticsExport.updateMany({ where: { id: job.id, status: 'PROCESSING', leaseToken: job.leaseToken }, data: { status: 'READY', fileKey: key, sizeBytes: file.size, rowCounts: result.rowCounts, snapshotAt: result.snapshotAt, completedAt, expiresAt: new Date(completedAt.getTime() + day), lockedUntil: null, leaseToken: null } });
      if (!updated.count) throw new Error('lease');
      await database.auditLogs.create({ data: { userId: job.userId, entityType: 'StatisticsExport', entityId: job.id, action: 'READY', changes: { rowCounts: result.rowCounts } } });
    });
  } catch (error: unknown) {
    await unlink(partial).catch(() => undefined);
    // A network interruption after COMMIT must not remove a successfully published file.
    const committed = await prisma.statisticsExport.findUnique({ where: { id: job.id }, select: { status: true, fileKey: true } });
    if (committed?.status === 'READY' && committed.fileKey === key) return;
    await unlink(final).catch(() => undefined);
    const permanent = error instanceof AppError && error.statusCode < 500;
    const retry = !permanent && job.attempts < 3;
    await prisma.$transaction(async database => {
      const updated = await database.statisticsExport.updateMany({ where: { id: job.id, status: 'PROCESSING', leaseToken: job.leaseToken }, data: {
        status: retry ? 'QUEUED' : 'FAILED', nextAttemptAt: new Date(Date.now() + job.attempts * 15_000), lockedUntil: null, leaseToken: null,
        error: permanent ? error.message : 'No se pudo generar el Excel. ' + (retry ? 'Se reintentará automáticamente.' : 'Puedes confirmar el período para reintentar.'),
      } });
      if (updated.count) await database.auditLogs.create({ data: { userId: job.userId, entityType: 'StatisticsExport', entityId: job.id, action: retry ? 'RETRY' : 'FAILED' } });
    });
  } finally { clearInterval(timer); await heartbeat; }
}
/** TTL cleanup also removes orphan artifacts left by interrupted writes or restored metadata. */
export async function cleanupStatisticsExports(now = new Date()): Promise<void> {
  if (!env.STATISTICS_EXPORT_DIRECTORY) return;
  const root = await prepareExportDirectory();
  const expired = await prisma.statisticsExport.findMany({ where: { status: 'READY', OR: [{ expiresAt: { lte: now } }, { expiresAt: null }] }, select: { id: true, fileKey: true } });
  await prisma.statisticsExport.updateMany({ where: { id: { in: expired.map(row => row.id) } }, data: { status: 'EXPIRED', fileKey: null } });
  for (const job of expired) if (job.fileKey) await unlink(statisticsExportPath(job.fileKey)).catch(() => undefined);
  await prisma.statisticsExport.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 30 * day) }, status: { in: ['READY', 'FAILED', 'EXPIRED'] } } });
  const valid = new Set((await prisma.statisticsExport.findMany({ where: { status: 'READY', expiresAt: { gt: now } }, select: { fileKey: true } })).map(row => row.fileKey));
  for (const name of await readdir(root)) {
    const match = /^([a-f0-9-]{36})\.(xlsx|part)$/.exec(name); if (!match) continue;
    const path = statisticsExportPath(match[1]!, match[2] === 'part');
    const file = await stat(path).catch(() => null);
    if (!file?.isFile()) continue;
    if (match[2] === 'xlsx' ? !valid.has(match[1]!) && file.mtimeMs < now.getTime() - leaseMs : file.mtimeMs < now.getTime() - 10 * 60_000) await unlink(path).catch(() => undefined);
  }
}
/** Worker execution shares the existing backup gate and never starts on a router import. */
export function startStatisticsExportWorker(): () => Promise<void> {
  let running = false; let stopped = false; let lastCleanup = 0;
  let active: Promise<void> = Promise.resolve();
  const tick = async (): Promise<void> => {
    if (running || stopped || !env.STATISTICS_EXPORT_DIRECTORY) return;
    const release = backupRuntime.enterWorker(); if (!release) return; running = true;
    try {
      if (Date.now() - lastCleanup >= 60_000) { await cleanupStatisticsExports(); lastCleanup = Date.now(); }
      const job = await claimStatisticsExport(); if (job) await processStatisticsExport(job);
    } catch { console.error('No se pudo procesar la cola de exportaciones de estadísticas.'); }
    finally { running = false; release(); }
  };
  const schedule = (): void => { if (!running && !stopped) active = tick(); };
  schedule(); const timer = setInterval(schedule, 2000); timer.unref();
  return () => { stopped = true; clearInterval(timer); return active; };
}
