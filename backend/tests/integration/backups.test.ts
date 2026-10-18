import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { appendFile, mkdtemp, mkdir, readFile, readdir, rm, rmdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import bcrypt from 'bcrypt';
import { env } from '../../src/config/env.js';
import { prisma } from '../../src/config/prisma.js';
import { createApp } from '../../src/app.js';
import { backupCoordinator, BackupCoordinator } from '../../src/services/backup.service.js';
import { BackupPostgres } from '../../src/services/backup-postgres.service.js';
import { BackupRuntime, backupRuntime } from '../../src/services/backup-runtime.service.js';
import { BackupStorage } from '../../src/services/backup-storage.service.js';
import { ROLE_NAMES, PERMISSIONS, type RoleCode } from '../../src/constants/authorization.constants.js';
import { authorizationService } from '../../src/services/authorization.service.js';
import { processEmailOutboxBatch } from '../../src/services/email-worker.service.js';
import { cleanupResumes } from '../../src/services/resume.service.js';
import { AppError } from '../../src/utils/app-error.js';
import type { AccessContext } from '../../src/types/authorization.types.js';
import type { BackupOperationTicket, BackupStatus } from '../../src/types/backup.types.js';
import { startTestServer, stopTestServer, type TestServer } from '../helpers/http.js';

const password = 'Respaldo de prueba 2026'; const prefix = 'backup-' + randomUUID();
const pdf = Buffer.from('%PDF-1.7\nCV histórico de prueba\n%%EOF');
const actors = new Map<RoleCode, { id: number; email: string; token: string }>();
let api: TestServer; let applicationId: number; let jobId: number; let firstFile: number; let secondFile: number; let firstKey: string; let secondKey: string;
const actor = (role: RoleCode = 'SUPER_ADMIN') => { const value = actors.get(role); assert.ok(value); return value; };
const request = (method: string, route: string, role?: RoleCode, body?: unknown, monitor?: string) => fetch(api.baseUrl + '/api' + route, {
  method, headers: { 'Content-Type': 'application/json', 'X-FQA-Request': '1', ...(role ? { Authorization: 'Bearer ' + actor(role).token } : {}), ...(monitor ? { 'X-FQA-Operation-Token': monitor } : {}) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const json = async <T>(response: Response, status = 200): Promise<T> => { assert.equal(response.status, status); return await response.json() as T; };
const login = async (role: RoleCode): Promise<void> => { const value = actor(role); const result = await json<{ accessToken: string }>(await request('POST', '/auth/login', undefined, { email: value.email, password })); value.token = result.accessToken; };
const wait = async (coordinator: BackupCoordinator, ticket: BackupOperationTicket) => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const operation = await coordinator.operation(ticket.operation.id, ticket.monitorToken);
    if (['SUCCEEDED', 'FAILED'].includes(operation.phase)) return operation;
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  throw new Error('La operación de prueba no terminó a tiempo.');
};
const access = (): Promise<AccessContext> => authorizationService.getAccessContext(actor().id);

/** Fault injection exercises the real PostgreSQL transaction, not an implementation-shaped mock. */
class FailingPostgres extends BackupPostgres {
  failDump = false; failTransaction = false; loseAcknowledgement = false; uncertainCommit = false;
  override async restoredOperation(id: string): Promise<boolean | null> { return this.uncertainCommit ? null : await super.restoredOperation(id); }
  override async run(program: 'pg_dump' | 'pg_restore' | 'psql', args: string[], directory: string): Promise<void> {
    if (program === 'pg_dump' && !args.includes('--version') && this.failDump) throw new AppError(503, 'Fallo de almacenamiento simulado.');
    if (program === 'psql' && args.includes('--single-transaction') && this.failTransaction) await appendFile(join(directory, 'after.sql'), '\nSELECT * FROM public.fqa_missing_restore_fixture;');
    await super.run(program, args, directory);
    if (program === 'psql' && args.includes('--single-transaction') && this.loseAcknowledgement) throw new AppError(503, 'Se perdió la confirmación del commit.');
  }
}

describe('respaldos completos y restauración privada', () => {
  before(async () => {
    assert.equal(env.NODE_ENV, 'test'); assert.ok(new URL(env.DATABASE_URL).pathname.endsWith('_test'));
    assert.ok(env.BACKUP_DIRECTORY?.includes('test')); assert.ok(env.RESUME_STORAGE_DIRECTORY?.includes('test'));
    api = await startTestServer(createApp()); const passwordHash = await bcrypt.hash(password, 12);
    for (const role of Object.keys(ROLE_NAMES) as RoleCode[]) {
      const email = prefix + '-' + role.toLowerCase() + '@example.test';
      const user = await prisma.user.create({ data: { email, passwordHash, status: { connect: { name: 'Activo' } }, profile: { create: { firstName: 'Candidato', lastName: 'Respaldo' } },
        userRoles: { create: { roles: { connect: { name: ROLE_NAMES[role] } } } } } });
      actors.set(role, { id: user.id, email, token: '' }); await login(role);
    }
    firstKey = randomUUID() + '.pdf'; secondKey = randomUUID() + '.pdf';
    await mkdir(env.RESUME_STORAGE_DIRECTORY!, { recursive: true }); await writeFile(join(env.RESUME_STORAGE_DIRECTORY!, firstKey), pdf);
    await writeFile(join(env.RESUME_STORAGE_DIRECTORY!, secondKey), pdf);
    firstFile = (await prisma.files.create({ data: { userId: actor('CANDIDATE').id, fileType: 'RESUME', filePath: firstKey, originalName: 'histórico.pdf', mimeType: 'application/pdf', sizeBytes: pdf.length } })).id;
    secondFile = (await prisma.files.create({ data: { userId: actor('CANDIDATE').id, fileType: 'RESUME', filePath: secondKey, originalName: 'actual.pdf', mimeType: 'application/pdf', sizeBytes: pdf.length } })).id;
    await prisma.userProfile.update({ where: { userId: actor('CANDIDATE').id }, data: { resumeFileId: secondFile } });
    jobId = (await prisma.jobs.create({ data: { title: prefix, slug: prefix, description: 'Prueba de respaldo', jobStatuses: { connect: { name: 'Borrador' } } } })).id;
    applicationId = (await prisma.applications.create({ data: { userId: actor('CANDIDATE').id, jobId, statusId: (await prisma.applicationStatuses.findUniqueOrThrow({ where: { name: 'Pendiente' } })).id,
      referenceNumber: randomUUID(), resumeId: firstFile } })).id;
    await prisma.applicationDrafts.create({ data: { userId: actor('CANDIDATE').id, jobId, resumeId: secondFile, data: { motivation: 'Borrador conservado' } } });
    await prisma.passwordResetToken.create({ data: { userId: actor('CANDIDATE').id, tokenHash: randomBytes(32).toString('hex'), expiresAt: new Date(Date.now() + 3_600_000) } });
    await prisma.emailOutbox.create({ data: { eventKey: prefix, kind: 'APPLICATION_SUBMITTED', recipientEmail: actor('CANDIDATE').email, encryptedPayload: 'fixture', iv: 'a'.repeat(24), authTag: 'a'.repeat(24) } });
  });
  after(async () => {
    await backupCoordinator.stop(); backupRuntime.mode = 'OPEN';
    if (jobId) await prisma.jobs.deleteMany({ where: { id: jobId } });
    const ids = [...actors.values()].map(value => value.id);
    await prisma.auditLogs.deleteMany({ where: { OR: [{ userId: { in: ids } }, { entityType: 'DatabaseBackup' }] } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.emailOutbox.deleteMany({ where: { eventKey: prefix } });
    for (const key of [firstKey, secondKey]) if (key) await unlink(join(env.RESUME_STORAGE_DIRECTORY!, key)).catch(() => undefined);
    if (api) await stopTestServer(api.server); await prisma.$disconnect();
  });

  it('aplica sesión, rol y permisos vigentes incluso si se asigna un permiso a Administrador', async () => {
    assert.equal((await request('GET', '/admin/backups')).status, 401);
    assert.equal((await request('GET', '/admin/backups', 'CANDIDATE')).status, 403);
    const role = await prisma.role.findUniqueOrThrow({ where: { name: ROLE_NAMES.ADMINISTRATOR } });
    const permission = await prisma.permissions.findUniqueOrThrow({ where: { name: PERMISSIONS.DATABASE_BACKUP } });
    const grant = await prisma.rolePermissions.create({ data: { roleId: role.id, permissionId: permission.id } });
    try { assert.equal((await request('GET', '/admin/backups', 'ADMINISTRATOR')).status, 403); }
    finally { await prisma.rolePermissions.delete({ where: { roleId_permissionId: grant } }); }
    assert.equal((await request('GET', '/admin/backups/operations/' + randomUUID(), undefined, undefined, 'a'.repeat(64))).status, 403);
  });

  it('crea un respaldo completo idempotente y mantiene consultas mientras bloquea escrituras', async () => {
    const status = await json<BackupStatus>(await request('GET', '/admin/backups', 'SUPER_ADMIN')); assert.equal(status.available, true);
    const requestId = randomUUID(); const release = backupRuntime.enterWorker()!;
    const ticket = await json<BackupOperationTicket>(await request('POST', '/admin/backups', 'SUPER_ADMIN', { requestId }), 202);
    assert.equal((await request('GET', '/admin/backups', 'SUPER_ADMIN')).status, 200);
    assert.equal((await request('PATCH', '/profile/me', 'CANDIDATE', { firstName: 'No guardar' })).status, 503);
    const replay = await json<BackupOperationTicket>(await request('POST', '/admin/backups', 'SUPER_ADMIN', { requestId }), 202); assert.equal(replay.operation.id, ticket.operation.id);
    assert.equal((await request('POST', '/admin/backups', 'SUPER_ADMIN', { requestId: randomUUID() })).status, 409);
    release(); const result = await wait(backupCoordinator, ticket); assert.equal(result.phase, 'SUCCEEDED', result.message);
    const saved = await backupCoordinator.status(await access()); assert.ok(saved.latest); assert.equal(saved.latest.resumeCount, 2);
    const storage = new BackupStorage(env.BACKUP_DIRECTORY!, Buffer.from(env.BACKUP_ENCRYPTION_KEY!, 'hex'));
    assert.equal((await storage.manifest(saved.latest.id)).activeSuperAdmins >= 1, true);
    assert.equal((await readFile(join(storage.generation(saved.latest.id), firstKey + '.enc'))).includes(pdf), false);
    assert.equal((await request('GET', '/admin/backups/operations/' + ticket.operation.id, 'CANDIDATE')).status, 403);
  });

  it('rechaza contraseña, confirmación o referencia incorrectas sin modificar la DB', async () => {
    const latest = (await backupCoordinator.status(await access())).latest!;
    const body = { requestId: randomUUID(), backupId: latest.id, currentPassword: password, confirmation: 'RESTAURAR' };
    assert.equal((await request('POST', '/admin/backups/restore', 'SUPER_ADMIN', { ...body, currentPassword: 'incorrecta' })).status, 400);
    assert.equal((await request('POST', '/admin/backups/restore', 'SUPER_ADMIN', { ...body, confirmation: 'restaurar' })).status, 400);
    assert.equal((await request('POST', '/admin/backups/restore', 'SUPER_ADMIN', { ...body, backupId: randomUUID() })).status, 409);
  });

  it('restaura perfiles, borradores, CV históricos y datos; invalida sesiones, enlaces y correos recuperados', async () => {
    const latest = (await backupCoordinator.status(await access())).latest!;
    await prisma.userProfile.update({ where: { userId: actor('CANDIDATE').id }, data: { firstName: 'Cambio posterior', resumeFileId: null } });
    await unlink(join(env.RESUME_STORAGE_DIRECTORY!, firstKey)); await unlink(join(env.RESUME_STORAGE_DIRECTORY!, secondKey));
    const ticket = await json<BackupOperationTicket>(await request('POST', '/admin/backups/restore', 'SUPER_ADMIN', { requestId: randomUUID(), backupId: latest.id, currentPassword: password, confirmation: 'RESTAURAR' }), 202);
    assert.equal((await request('GET', '/profile/me', 'CANDIDATE')).status, 503);
    const result = await wait(backupCoordinator, ticket); assert.equal(result.phase, 'SUCCEEDED', result.message);
    assert.equal((await request('GET', '/profile/me', 'CANDIDATE')).status, 401);
    const profile = await prisma.userProfile.findUniqueOrThrow({ where: { userId: actor('CANDIDATE').id } }); assert.equal(profile.firstName, 'Candidato'); assert.equal(profile.resumeFileId, secondFile);
    assert.equal(await prisma.applicationDrafts.count({ where: { userId: actor('CANDIDATE').id, resumeId: secondFile } }), 1);
    assert.deepEqual(await readFile(join(env.RESUME_STORAGE_DIRECTORY!, firstKey)), pdf);
    assert.equal(await prisma.authSession.count({ where: { revokedAt: null } }), 0);
    assert.equal(await prisma.passwordResetToken.count({ where: { usedAt: null } }), 0);
    assert.ok((await prisma.emailOutbox.findUniqueOrThrow({ where: { eventKey: prefix } })).discardedAt);
    let delivered = 0; await processEmailOutboxBatch({ sendMail: async () => { delivered += 1; } }); assert.equal(delivered, 0);
    await login('SUPER_ADMIN'); await login('CANDIDATE');
    const download = await request('GET', '/applications/' + applicationId + '/resume/download', 'CANDIDATE'); assert.equal(download.status, 200); assert.deepEqual(Buffer.from(await download.arrayBuffer()), pdf);
    await cleanupResumes(); assert.deepEqual(await readFile(join(env.RESUME_STORAGE_DIRECTORY!, firstKey)), pdf);
  });

  it('detecta corrupción de archivos y conserva el estado actual sin ejecutar una restauración parcial', async () => {
    const latest = (await backupCoordinator.status(await access())).latest!; const path = join(env.BACKUP_DIRECTORY!, latest.id, 'database.enc');
    const previous = await readFile(path); const corrupt = Buffer.from(previous); corrupt[12] = corrupt[12]! ^ 1; await writeFile(path, corrupt);
    try {
      const ticket = await backupCoordinator.restore(await access(), { requestId: randomUUID(), backupId: latest.id, currentPassword: password, confirmation: 'RESTAURAR' });
      assert.equal((await wait(backupCoordinator, ticket)).phase, 'FAILED'); assert.equal(backupRuntime.mode, 'OPEN');
      assert.equal((await prisma.userProfile.findUniqueOrThrow({ where: { userId: actor('CANDIDATE').id } })).firstName, 'Candidato');
    } finally { await writeFile(path, previous); }
  });

  it('revocar database.backup elimina acceso inmediatamente', async () => {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: ROLE_NAMES.SUPER_ADMIN } }); const permission = await prisma.permissions.findUniqueOrThrow({ where: { name: PERMISSIONS.DATABASE_BACKUP } });
    const grant = await prisma.rolePermissions.findUniqueOrThrow({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } } });
    await prisma.rolePermissions.delete({ where: { roleId_permissionId: grant } });
    try { assert.equal((await request('GET', '/admin/backups', 'SUPER_ADMIN')).status, 403); }
    finally { await prisma.rolePermissions.create({ data: { roleId: role.id, permissionId: permission.id } }); }
  });

  it('revierte una transacción fallida, reconoce commits sin confirmación y conserva el último respaldo ante fallos', async () => {
    const root = await mkdtemp(join(env.BACKUP_DIRECTORY!, 'fault-test-')); const native = new FailingPostgres(prisma, env.DATABASE_URL); const runtime = new BackupRuntime();
    const coordinator = new BackupCoordinator({ enabled: true, environment: 'test', directory: root, resumeDirectory: env.RESUME_STORAGE_DIRECTORY, encryptionKey: randomBytes(32).toString('hex') }, native, runtime);
    try {
      const identity = await access(); let ticket = await coordinator.create(identity, randomUUID()); let result = await wait(coordinator, ticket); assert.equal(result.phase, 'SUCCEEDED', result.message);
      const latest = (await coordinator.status(identity)).latest!;
      await prisma.userProfile.update({ where: { userId: actor('CANDIDATE').id }, data: { firstName: 'Conservar si falla' } });
      native.failTransaction = true; ticket = await coordinator.restore(identity, { requestId: randomUUID(), backupId: latest.id, currentPassword: password, confirmation: 'RESTAURAR' });
      result = await wait(coordinator, ticket); assert.equal(result.phase, 'FAILED', result.message);
      assert.equal((await prisma.userProfile.findUniqueOrThrow({ where: { userId: actor('CANDIDATE').id } })).firstName, 'Conservar si falla');
      native.failTransaction = false; native.loseAcknowledgement = true;
      ticket = await coordinator.restore(identity, { requestId: randomUUID(), backupId: latest.id, currentPassword: password, confirmation: 'RESTAURAR' });
      result = await wait(coordinator, ticket); assert.equal(result.phase, 'SUCCEEDED', result.message); native.loseAcknowledgement = false;
      native.failDump = true; ticket = await coordinator.create(identity, randomUUID()); assert.equal((await wait(coordinator, ticket)).phase, 'FAILED');
      assert.equal((await coordinator.status(identity)).latest?.id, latest.id);
      assert.equal((await readdir(root)).filter(name => /^[a-f0-9-]{36}$/.test(name)).length, 1);
      await login('SUPER_ADMIN'); await login('CANDIDATE');
    } finally { await coordinator.stop(); await rm(root, { recursive: true, force: true }); }
  });

  it('programa el primer respaldo, tres reintentos y un nuevo día sin duplicar horarios', async () => {
    const root = await mkdtemp(join(env.BACKUP_DIRECTORY!, 'schedule-test-')); const native = new FailingPostgres(prisma, env.DATABASE_URL); const runtime = new BackupRuntime();
    const coordinator = new BackupCoordinator({ enabled: true, environment: 'test', directory: root, resumeDirectory: env.RESUME_STORAGE_DIRECTORY, encryptionKey: randomBytes(32).toString('hex') }, native, runtime);
    try {
      native.failDump = true;
      const start = Date.parse('2031-01-01T08:00:00Z');
      for (const minutes of [0, 5, 10, 15]) await coordinator.tick(new Date(start + minutes * 60_000));
      const journal = JSON.parse(await readFile(join(root, 'journal.json'), 'utf8')) as { operations: unknown[]; nextAttemptAt: string | null };
      assert.equal(journal.operations.length, 4); assert.equal(journal.nextAttemptAt, null);
      await coordinator.tick(new Date(start + 60 * 60_000));
      assert.equal((JSON.parse(await readFile(join(root, 'journal.json'), 'utf8')) as { operations: unknown[] }).operations.length, 4);
      native.failDump = false; await coordinator.tick(new Date(start + 24 * 60 * 60_000));
      const status = await coordinator.status(await access()); assert.ok(status.latest); assert.equal(status.operation?.phase, 'SUCCEEDED');
      await coordinator.tick(new Date(start + 24 * 60 * 60_000 + 5000));
      assert.equal((JSON.parse(await readFile(join(root, 'journal.json'), 'utf8')) as { operations: unknown[] }).operations.length, 5);
    } finally { await coordinator.stop(); await rm(root, { recursive: true, force: true }); }
  });

  it('recupera un commit interrumpido desde el diario externo y mantiene mantenimiento si no puede comprobarlo', async () => {
    const root = await mkdtemp(join(env.BACKUP_DIRECTORY!, 'recovery-test-')); const key = randomBytes(32).toString('hex');
    const config = { enabled: true, environment: 'test', directory: root, resumeDirectory: env.RESUME_STORAGE_DIRECTORY, encryptionKey: key };
    const native = new FailingPostgres(prisma, env.DATABASE_URL); const runtime = new BackupRuntime(); const coordinator = new BackupCoordinator(config, native, runtime);
    let recovered: BackupCoordinator | undefined;
    try {
      const identity = await access(); const backup = await coordinator.create(identity, randomUUID()); assert.equal((await wait(coordinator, backup)).phase, 'SUCCEEDED');
      const latest = (await coordinator.status(identity)).latest!;
      const restore = await coordinator.restore(identity, { requestId: randomUUID(), backupId: latest.id, currentPassword: password, confirmation: 'RESTAURAR' });
      assert.equal((await wait(coordinator, restore)).phase, 'SUCCEEDED'); await coordinator.stop();
      const path = join(root, 'journal.json');
      const journal = JSON.parse(await readFile(path, 'utf8')) as { operations: Array<{ phase: string; finishedAt: string | null }> };
      journal.operations.at(-1)!.phase = 'RESTORING'; journal.operations.at(-1)!.finishedAt = null; await writeFile(path, JSON.stringify(journal));
      await writeFile(join(root, 'restore-pending.json'), JSON.stringify({ operationId: restore.operation.id }));
      const adapter = new FailingPostgres(prisma, env.DATABASE_URL); adapter.uncertainCommit = true; const recoveredRuntime = new BackupRuntime();
      recovered = new BackupCoordinator(config, adapter, recoveredRuntime); await recovered.initialize();
      assert.equal(recoveredRuntime.mode, 'MAINTENANCE'); assert.equal((await recovered.operation(restore.operation.id, restore.monitorToken)).phase, 'RECOVERING');
      adapter.uncertainCommit = false; await recovered.tick(); assert.equal(recoveredRuntime.mode, 'OPEN');
      assert.equal((await recovered.operation(restore.operation.id, restore.monitorToken)).phase, 'SUCCEEDED');
      await login('SUPER_ADMIN'); await login('CANDIDATE');
    } finally { await coordinator.stop(); await recovered?.stop(); await rm(root, { recursive: true, force: true }); }
  });

  it('rechaza esquema incompatible y CV ausente, y reemplaza únicamente después de verificar un respaldo nuevo', async () => {
    const root = await mkdtemp(join(env.BACKUP_DIRECTORY!, 'compatibility-test-')); const key = randomBytes(32); const native = new BackupPostgres(prisma, env.DATABASE_URL);
    const coordinator = new BackupCoordinator({ enabled: true, environment: 'test', directory: root, resumeDirectory: env.RESUME_STORAGE_DIRECTORY, encryptionKey: key.toString('hex') }, native, new BackupRuntime());
    try {
      const identity = await access(); const first = await coordinator.create(identity, randomUUID()); assert.equal((await wait(coordinator, first)).phase, 'SUCCEEDED');
      const latest = (await coordinator.status(identity)).latest!; const storage = new BackupStorage(root, key); const manifest = await storage.manifest(latest.id);
      await storage.publish({ ...manifest, schemaHash: '0'.repeat(64) });
      await assert.rejects(coordinator.restore(identity, { requestId: randomUUID(), backupId: latest.id, currentPassword: password, confirmation: 'RESTAURAR' }), error => error instanceof AppError && error.statusCode === 409);
      await storage.publish(manifest); const content = await readFile(join(env.RESUME_STORAGE_DIRECTORY!, firstKey)); await unlink(join(env.RESUME_STORAGE_DIRECTORY!, firstKey));
      const missing = await coordinator.create(identity, randomUUID()); assert.equal((await wait(coordinator, missing)).phase, 'FAILED'); assert.equal((await coordinator.status(identity)).latest?.id, latest.id);
      await writeFile(join(env.RESUME_STORAGE_DIRECTORY!, firstKey), content);
      const second = await coordinator.create(identity, randomUUID()); assert.equal((await wait(coordinator, second)).phase, 'SUCCEEDED'); assert.notEqual((await coordinator.status(identity)).latest?.id, latest.id);
      assert.equal((await readdir(root)).filter(name => /^[a-f0-9-]{36}$/.test(name)).length, 1);
    } finally { await coordinator.stop(); await rm(root, { recursive: true, force: true }); }
  });

  it('recupera un almacenamiento temporalmente inaccesible y mantiene producción deshabilitada', async () => {
    const root = await mkdtemp(join(env.BACKUP_DIRECTORY!, 'availability-test-'));
    const config = { enabled: true, environment: 'test', directory: root, resumeDirectory: env.RESUME_STORAGE_DIRECTORY, encryptionKey: randomBytes(32).toString('hex') };
    const coordinator = new BackupCoordinator(config, new BackupPostgres(prisma, env.DATABASE_URL), new BackupRuntime());
    try {
      await mkdir(join(root, 'journal.json'));
      assert.equal((await coordinator.status(await access())).available, false);
      await rmdir(join(root, 'journal.json'));
      assert.equal((await coordinator.status(await access())).available, true);
      const production = new BackupCoordinator({ ...config, environment: 'production' }, new BackupPostgres(prisma, env.DATABASE_URL), new BackupRuntime());
      assert.equal((await production.status(await access())).available, false);
    } finally { await coordinator.stop(); await rm(root, { recursive: true, force: true }); }
  });
});
