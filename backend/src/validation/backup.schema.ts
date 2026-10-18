import { z } from 'zod';
import { loginSchema } from './auth.schema.js';

/** Request IDs allow transport retries without starting another operation. */
export const createBackupSchema = z.object({ requestId: z.string().uuid() }).strict();
export const restoreBackupSchema = createBackupSchema.extend({
  backupId: z.string().uuid(),
  currentPassword: loginSchema.shape.password,
  confirmation: z.literal('RESTAURAR', { errorMap: () => ({ message: 'Escribe RESTAURAR para confirmar.' }) }),
}).strict();
export type RestoreBackupDTO = z.infer<typeof restoreBackupSchema>;

/** Every persisted manifest field is validated before it influences a filesystem path. */
export const encryptionSchema = z.object({ iv: z.string().regex(/^[a-f0-9]{24}$/), tag: z.string().regex(/^[a-f0-9]{32}$/) }).strict();
const artifactSchema = z.object({
  sizeBytes: z.number().int().nonnegative(), sha256: z.string().regex(/^[a-f0-9]{64}$/), encryption: encryptionSchema,
}).strict();
export const backupManifestSchema = z.object({
  format: z.literal(1), id: z.string().uuid(), createdAt: z.string().datetime(),
  postgresMajor: z.literal(17), schemaHash: z.string().regex(/^[a-f0-9]{64}$/),
  activeSuperAdmins: z.number().int().nonnegative(), database: artifactSchema,
  resumes: z.array(artifactSchema.extend({ key: z.string().regex(/^[0-9a-f-]{36}\.pdf$/) }).strict()),
}).strict();
export type BackupManifest = z.infer<typeof backupManifestSchema>;
export type BackupArtifact = z.infer<typeof artifactSchema>;

export const operationRecordSchema = z.object({
  id: z.string().uuid(), kind: z.enum(['BACKUP', 'RESTORE']),
  phase: z.enum(['QUEUED', 'DRAINING', 'BACKING_UP', 'VERIFYING', 'PREPARING', 'RESTORING', 'RECOVERING', 'SUCCEEDED', 'FAILED']),
  startedAt: z.string().datetime(), finishedAt: z.string().datetime().nullable(), message: z.string(),
  requestId: z.string().uuid(), actorId: z.number().int().nullable(), actorEmail: z.string(),
  backupId: z.string().uuid().nullable(), commitAttempted: z.boolean(),
}).strict();
export type BackupOperationRecord = z.infer<typeof operationRecordSchema>;
export const backupJournalSchema = z.object({
  operations: z.array(operationRecordSchema).max(100),
  scheduledSlot: z.string(), failures: z.number().int().nonnegative(), nextAttemptAt: z.string().datetime().nullable(),
}).strict();
export type BackupJournal = z.infer<typeof backupJournalSchema>;
