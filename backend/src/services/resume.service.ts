import { randomUUID } from 'node:crypto';
import { basename } from 'node:path';
import { Prisma, type Files } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { PERMISSIONS } from '../constants/authorization.constants.js';
import type { AccessContext } from '../types/authorization.types.js';
import type { ResumeMetadata } from '../types/profile.types.js';
import { AppError } from '../utils/app-error.js';
import { assertCandidateAccess } from './profile.service.js';
import { getResumeStorage, type ResumeStorage } from './resume-storage.service.js';

/** Same byte limit advertised by the candidate interface. */
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

/** Safe attachment name strips paths, controls and excessively long filenames. */
export const safeResumeName = (value: string): string =>
  [...basename(value.replace(/\\/g, '/'))].filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
    .join('').replace(/\.pdf$/i, '').slice(0, 246) + '.pdf';

/** Multiple independent checks prevent renamed non-PDF and oversized uploads. */
export const validateResume = (file: Pick<Express.Multer.File, 'originalname' | 'mimetype' | 'buffer' | 'size'>): void => {
  if (file.size > MAX_RESUME_BYTES || file.buffer.length > MAX_RESUME_BYTES) throw new AppError(413, 'El CV no debe superar 5 MB.');
  if (!file.size || !/\.pdf$/i.test(file.originalname) || file.mimetype !== 'application/pdf' ||
      !/^%PDF-\d\.\d/.test(file.buffer.subarray(0, 8).toString('ascii')) ||
      !file.buffer.subarray(-1024).toString('ascii').includes('%%EOF')) {
    throw new AppError(400, 'Selecciona un archivo PDF válido y no vacío.');
  }
};

/** Exposes only download-safe metadata for modern resume records. */
const metadata = (file: Files): ResumeMetadata => ({ id: file.id,
  originalName: file.originalName ?? 'curriculum.pdf', mimeType: file.mimeType ?? 'application/pdf',
  sizeBytes: file.sizeBytes ?? 0, createdAt: file.createdAt?.toISOString() ?? '',
});

/** Ownership comes from the session rather than a supplied document or account ID. */
const activeResume = async (actor: AccessContext, database: Prisma.TransactionClient = prisma): Promise<Files | null> => {
  const profile = await database.userProfile.findUnique({ where: { userId: actor.userId }, include: { resume: true } });
  if (!profile) throw new AppError(404, 'No se encontró tu perfil.');
  if (profile.resume && profile.resume.userId !== actor.userId) throw new AppError(403, 'No tienes acceso al documento.');
  return profile.resume;
};

/** Queries the current document without returning its storage key. */
export const getResume = async (actor: AccessContext): Promise<ResumeMetadata | null> => {
  assertCandidateAccess(actor, PERMISSIONS.PROFILE_READ_OWN); getResumeStorage();
  const file = await activeResume(actor);
  return file ? metadata(file) : null;
};

/** Writes an immutable blob before committing the active pointer; failed commits are compensated. */
export const uploadResume = async (
  file: Express.Multer.File, actor: AccessContext, storage: ResumeStorage = getResumeStorage(),
): Promise<ResumeMetadata> => {
  assertCandidateAccess(actor, PERMISSIONS.PROFILE_RESUME_UPLOAD_OWN); validateResume(file);
  const key = randomUUID() + '.pdf';
  try { await storage.put(key, file.buffer); }
  catch { throw new AppError(503, 'No fue posible guardar el CV. Tu documento anterior se conserva.'); }
  try {
    return await prisma.$transaction(async (database) => {
      await activeResume(actor, database);
      const record = await database.files.create({ data: { userId: actor.userId, filePath: key, fileType: 'RESUME',
        originalName: safeResumeName(file.originalname), mimeType: 'application/pdf', sizeBytes: file.size } });
      await database.userProfile.update({ where: { userId: actor.userId }, data: { resumeFileId: record.id } });
      await database.auditLogs.create({ data: { userId: actor.userId, entityType: 'Resume', entityId: record.id,
        action: 'UPLOAD', changes: { sizeBytes: record.sizeBytes } } });
      return metadata(record);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error: unknown) {
    // The collector also retries compensation failures after its one-hour grace period.
    await storage.remove(key).catch(() => undefined);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      throw new AppError(409, 'El CV cambió al mismo tiempo. Inténtalo de nuevo.');
    }
    throw error;
  }
};

/** Detaches the active CV; historical attachments keep their files and metadata. */
export const deleteResume = async (actor: AccessContext): Promise<void> => {
  assertCandidateAccess(actor, PERMISSIONS.PROFILE_RESUME_UPLOAD_OWN); getResumeStorage();
  try {
    await prisma.$transaction(async (database) => {
      const file = await activeResume(actor, database);
      if (!file) return;
      await database.userProfile.update({ where: { userId: actor.userId }, data: { resumeFileId: null } });
      await database.auditLogs.create({ data: { userId: actor.userId, entityType: 'Resume', entityId: file.id,
        action: 'DELETE', changes: { detached: true } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      throw new AppError(409, 'El CV cambió al mismo tiempo. Inténtalo de nuevo.');
    }
    throw error;
  }
};

/** Authorizes each download and avoids public URLs or filesystem paths. */
export const downloadResume = async (actor: AccessContext): Promise<{ metadata: ResumeMetadata; content: Buffer }> => {
  assertCandidateAccess(actor, PERMISSIONS.PROFILE_READ_OWN);
  const storage = getResumeStorage(); const file = await activeResume(actor);
  if (!file) throw new AppError(404, 'No tienes un CV activo.');
  try { return { metadata: metadata(file), content: await storage.get(file.filePath) }; }
  catch { throw new AppError(503, 'No fue posible descargar tu CV. Inténtalo más tarde.'); }
};

/** Deletes unreferenced modern resumes after a grace period and retries orphaned filesystem blobs. */
export const cleanupResumes = async (storage: ResumeStorage = getResumeStorage(), now = new Date()): Promise<void> => {
  const cutoff = new Date(now.getTime() - 60 * 60_000);
  const unreferenced = { activeProfile: null, applications: { none: {} }, applicationFiles: { none: {} } };
  const files = await prisma.files.findMany({ where: { fileType: 'RESUME', originalName: { not: null },
    createdAt: { lt: cutoff }, ...unreferenced }, select: { id: true, filePath: true } });
  for (const file of files) {
    // Atomic deletion rechecks references; foreign keys protect concurrent attachment writes.
    const removed = await prisma.files.deleteMany({ where: { id: file.id, ...unreferenced } });
    if (removed.count) await storage.remove(file.filePath).catch(() => undefined);
  }
  for (const key of await storage.listOlderThan(cutoff)) {
    if (!await prisma.files.findFirst({ where: { filePath: key }, select: { id: true } })) {
      await storage.remove(key).catch(() => undefined);
    }
  }
};

/** Runs cleanup periodically without making storage a requirement for the rest of the API. */
export const startResumeCleanup = (): (() => void) => {
  let running = false;
  const run = async (): Promise<void> => {
    if (running) return;
    running = true;
    try { await cleanupResumes(); }
    catch { /* A later pass retries; credentials and private paths are never logged. */ }
    finally { running = false; }
  };
  const timer = setInterval(() => { void run(); }, 15 * 60_000); timer.unref();
  void run();
  return () => clearInterval(timer);
};
