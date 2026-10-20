import bcrypt from 'bcrypt';
import { constants, createReadStream } from 'node:fs';
import { chmod, copyFile, mkdir, mkdtemp, open, readFile, readdir, rm, lstat, unlink } from 'node:fs/promises';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { hostname, tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { PERMISSIONS, ROLE_NAMES } from '../constants/authorization.constants.js';
import type { AccessContext } from '../types/authorization.types.js';
import type { BackupOperation, BackupOperationTicket, BackupStatus, BackupSummary } from '../types/backup.types.js';
import { backupJournalSchema, type BackupJournal, type BackupManifest, type BackupOperationRecord, type ImportBackupDTO, type RestoreBackupDTO } from '../validation/backup.schema.js';
import { AppError } from '../utils/app-error.js';
import { assertPermission, authorizationService } from './authorization.service.js';
import { BackupPostgres } from './backup-postgres.service.js';
import { backupRuntime, type BackupRuntime } from './backup-runtime.service.js';
import { backupScheduledSlot, nextBackupAt } from './backup-schedule.service.js';
import { BackupStorage, isMissing, writePrivateJson } from './backup-storage.service.js';
import { readBackupPackage, writeBackupPackage } from './backup-package.service.js';

/** A single backend coordinator is supported by the development Compose deployment. */
export interface BackupConfiguration {
  enabled: boolean; environment: string; directory?: string; encryptionKey?: string; resumeDirectory?: string;
}
const terminal = (operation: BackupOperationRecord): boolean => ['SUCCEEDED', 'FAILED'].includes(operation.phase);
const publicOperation = (operation: BackupOperationRecord): BackupOperation => ({
  id: operation.id, kind: operation.kind, phase: operation.phase, startedAt: operation.startedAt,
  finishedAt: operation.finishedAt, message: operation.message,
});
const summary = (manifest: BackupManifest): BackupSummary => ({ id: manifest.id, createdAt: manifest.createdAt,
  sizeBytes: manifest.database.sizeBytes + manifest.resumes.reduce((total, file) => total + file.sizeBytes, 0), resumeCount: manifest.resumes.length });

/** Owns encrypted generations and a durable journal outside the database being restored. */
export class BackupCoordinator {
  private storage: BackupStorage | null = null;
  private journal: BackupJournal = { operations: [], scheduledSlot: '', failures: 0, nextAttemptAt: null };
  private initialization: Promise<void> | null = null;
  private reason = '';
  private ready = false;
  private ownsLock = false;
  private running: Promise<void> | null = null;
  private admitting: Promise<void> | null = null;
  private stopping = false;
  private tickRunning = false;
  private exporting = false;
  private readonly instanceId = randomUUID();
  private timer: NodeJS.Timeout | null = null;
  constructor(private readonly configuration: BackupConfiguration, private readonly postgres: BackupPostgres, private readonly runtime: BackupRuntime = backupRuntime) {}

  /** Missing optional configuration never prevents the rest of the API from starting. */
  initialize(): Promise<void> {
    if (!this.initialization) {
      const attempt = this.initializeOnce(); this.initialization = attempt;
      void attempt.then(() => { if (!this.ready && this.initialization === attempt) this.initialization = null; });
    }
    return this.initialization;
  }
  private async initializeOnce(): Promise<void> {
    const config = this.configuration;
    if (!config.enabled || config.environment === 'production') { this.reason = 'Los respaldos no están habilitados en este entorno. La configuración de producción está pendiente.'; return; }
    if (config.environment === 'test' && !this.postgres.isTestDatabase) { this.reason = 'Las pruebas de respaldo requieren una DB independiente terminada en _test.'; return; }
    if (!config.directory || !config.resumeDirectory || !/^[a-fA-F0-9]{64}$/.test(config.encryptionKey ?? '')) {
      this.reason = 'Configura el directorio privado, el almacenamiento de CV y la clave de cifrado de respaldos.'; return;
    }
    const backupRoot = resolve(config.directory); const resumeRoot = resolve(config.resumeDirectory);
    if (backupRoot === resumeRoot || backupRoot.startsWith(resumeRoot + sep) || resumeRoot.startsWith(backupRoot + sep)) {
      this.reason = 'Los respaldos y los CV deben usar directorios independientes.'; return;
    }
    const storage = new BackupStorage(backupRoot, Buffer.from(config.encryptionKey!, 'hex')); this.storage = storage;
    try {
      await storage.initialize();
      await this.acquireLock();
      try { await lstat(join(storage.root, 'restore-pending.json')); this.runtime.mode = 'MAINTENANCE'; }
      catch (error: unknown) { if (!isMissing(error)) throw error; }
      try { this.journal = backupJournalSchema.parse(JSON.parse(await readFile(join(storage.root, 'journal.json'), 'utf8'))); }
      catch (error: unknown) { if (!isMissing(error)) throw new Error('journal'); }
      if (this.runtime.mode === 'MAINTENANCE' && !this.journal.operations.some(operation => operation.kind === 'RESTORE')) throw new Error('missing restore journal');
      const latest = await storage.latestId(); if (latest) await storage.manifest(latest);
      this.ready = true;
      await this.recover();
      await storage.prune();
      // Uploads from a terminated process never become valid catalog entries.
      await rm(join(storage.root, 'uploads'), { recursive: true, force: true });
      await mkdir(join(storage.root, 'uploads'), { mode: 0o700 });
    } catch {
      this.reason = 'No se pudo abrir el almacenamiento de respaldos o recuperar su estado. Revisa su disponibilidad y la clave configurada.';
      this.ready = false;
      // An unfinished restore must fail closed even when its journal cannot currently be read.
      if (this.journal.operations.some(operation => !terminal(operation) && operation.kind === 'RESTORE')) this.runtime.mode = 'MAINTENANCE';
    }
  }

  /** A persistent owner file prevents two local processes from coordinating the same volume. */
  private async acquireLock(): Promise<void> {
    const storage = this.requireStorage(); const path = join(storage.root, 'coordinator.lock');
    try {
      const previous: unknown = JSON.parse(await readFile(path, 'utf8'));
      if (!previous || typeof previous !== 'object' || !('host' in previous) || !('pid' in previous) || !Number.isInteger(previous.pid)) throw new Error('lock');
      if (previous.host === hostname() && previous.pid === process.pid && 'instanceId' in previous && previous.instanceId === this.instanceId) { this.ownsLock = true; return; }
      if (previous.host === hostname()) {
        try { process.kill(Number(previous.pid), 0); throw new AppError(409, 'Ya existe un coordinador activo.'); }
        catch (error: unknown) { if (!(error instanceof Error && 'code' in error && error.code === 'ESRCH')) throw error; }
      }
      // Compose replaces the single backend container only after stopping its previous instance.
      await unlink(path);
    } catch (error: unknown) { if (!isMissing(error)) throw error; }
    const handle = await open(path, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify({ host: hostname(), pid: process.pid, instanceId: this.instanceId })); await handle.sync(); }
    finally { await handle.close(); }
    this.ownsLock = true;
  }

  private requireStorage(): BackupStorage {
    if (!this.storage) throw new AppError(503, this.reason || 'El almacenamiento de respaldos no está disponible.'); return this.storage;
  }
  private async persist(): Promise<void> { await writePrivateJson(join(this.requireStorage().root, 'journal.json'), this.journal); }
  private latestOperation(): BackupOperationRecord | undefined { return this.journal.operations.at(-1); }
  /** A committed result becomes public only after cleanup and maintenance have finished. */
  private view(operation: BackupOperationRecord): BackupOperation {
    const result = publicOperation(operation);
    return this.running && operation === this.latestOperation() && terminal(operation)
      ? { ...result, phase: operation.kind === 'RESTORE' ? 'RECOVERING' : 'VERIFYING', finishedAt: null, message: 'Finalizando la operación y reanudando los servicios.' }
      : result;
  }
  private assertReady(): void { if (!this.ready || this.stopping) throw new AppError(503, this.reason || 'Los respaldos no están disponibles.'); }

  /** Privileges are checked again by services, even when invoked outside HTTP routes. */
  private authorize(actor: AccessContext, permission: typeof PERMISSIONS.DATABASE_BACKUP | typeof PERMISSIONS.DATABASE_RESTORE): void {
    assertPermission(actor, permission);
    if (!actor.roles.includes('SUPER_ADMIN')) throw new AppError(403, 'Esta operación requiere Super Admin.');
  }

  /** Returns availability and safe metadata without interpreting storage failures as empty data. */
  async status(actor: AccessContext): Promise<BackupStatus> {
    this.authorize(actor, PERMISSIONS.DATABASE_BACKUP); await this.initialize();
    let latest: BackupSummary | null = null; let available = this.ready; let reason = this.reason;
    if (this.ready) {
      try { const id = await this.requireStorage().latestId(); if (id) latest = summary(await this.requireStorage().manifest(id)); }
      catch { available = false; reason = 'No se pudo comprobar el respaldo disponible.'; }
    }
    const operation = this.latestOperation();
    return { available, unavailableReason: reason, latest, nextScheduledAt: nextBackupAt(), operation: operation ? this.view(operation) : null };
  }

  /** Replaying an accepted request returns its original limited monitor credential. */
  private replay(requestId: string, actorId: number, kind: BackupOperationRecord['kind']): BackupOperationRecord | undefined {
    const previous = this.journal.operations.find(operation => operation.requestId === requestId);
    if (previous && (previous.actorId !== actorId || previous.kind !== kind)) throw new AppError(409, 'La solicitud ya pertenece a otra operación.');
    return previous;
  }
  private ticket(operation: BackupOperationRecord): BackupOperationTicket { return { operation: this.view(operation), monitorToken: this.requireStorage().monitorToken(operation.id) }; }

  /** Admits one authorized manual backup, or returns its original idempotent ticket. */
  async create(actor: AccessContext, requestId: string): Promise<BackupOperationTicket> {
    this.authorize(actor, PERMISSIONS.DATABASE_BACKUP); await this.initialize(); this.assertReady();
    const previous = this.replay(requestId, actor.userId, 'BACKUP'); if (previous) { await this.admitting; return this.ticket(previous); }
    return this.ticket(await this.enqueue('BACKUP', actor.userId, requestId));
  }

  /** Allocates a private upload outside generations, so retention cannot remove in-flight input. */
  async prepareImport(actor: AccessContext): Promise<string> {
    this.authorize(actor, PERMISSIONS.DATABASE_BACKUP); this.authorize(actor, PERMISSIONS.DATABASE_RESTORE);
    await this.initialize(); this.assertReady();
    if (this.runtime.mode === 'MAINTENANCE') throw new AppError(409, 'Espera a que termine la restauración actual.');
    const directory = join(this.requireStorage().root, 'uploads', randomUUID());
    await mkdir(directory, { mode: 0o700 }); return directory;
  }

  /** Accepts a validated multipart upload; import never executes its SQL against the database. */
  async importBackup(actor: AccessContext, payload: ImportBackupDTO, uploadDirectory: string): Promise<BackupOperationTicket> {
    this.authorize(actor, PERMISSIONS.DATABASE_BACKUP); this.authorize(actor, PERMISSIONS.DATABASE_RESTORE);
    await this.initialize(); this.assertReady();
    const previous = this.replay(payload.requestId, actor.userId, 'IMPORT');
    if (previous) { await this.admitting; await rm(uploadDirectory, { recursive: true, force: true }); return this.ticket(previous); }
    if (payload.confirmation !== 'IMPORTAR') throw new AppError(400, 'Escribe IMPORTAR para confirmar.');
    if (await this.requireStorage().latestId() !== payload.backupId) throw new AppError(409, 'El respaldo disponible cambió. Actualiza la pantalla antes de importar.');
    return this.ticket(await this.enqueue('IMPORT', actor.userId, payload.requestId, null, '', uploadDirectory));
  }

  /** Holds a catalog lease while copying a package; its private snapshot survives later replacement. */
  async exportBackup(actor: AccessContext, backupId: string): Promise<{ path: string; filename: string; dispose: () => Promise<void> }> {
    this.authorize(actor, PERMISSIONS.DATABASE_BACKUP); await this.initialize(); this.assertReady();
    if (this.running || this.exporting || this.runtime.mode !== 'OPEN') throw new AppError(409, 'Espera a que termine la operación de respaldo actual.');
    this.exporting = true; let directory: string | undefined;
    const dispose = async (): Promise<void> => { if (directory) await rm(directory, { recursive: true, force: true }).catch(() => undefined); };
    try {
      const storage = this.requireStorage();
      if (await storage.latestId() !== backupId) throw new AppError(409, 'El respaldo disponible cambió. Actualiza la pantalla antes de exportar.');
      const manifest = await storage.manifest(backupId);
      directory = await mkdtemp(join(storage.root, 'uploads', 'export-')); await chmod(directory, 0o700);
      const path = join(directory, 'backup.fqabackup'); await writeBackupPackage(storage, manifest, path);
      await this.postgres.database.auditLogs.create({ data: { userId: actor.userId, entityType: 'DatabaseBackup', entityId: 0, action: 'EXPORT', changes: { backupId } } });
      return { path, filename: 'fqa-respaldo-' + manifest.createdAt.slice(0, 10) + '-' + backupId + '.fqabackup', dispose };
    } catch (error: unknown) { await dispose(); throw error; }
    finally { this.exporting = false; }
  }

  /** Verifies the current password, consent and exact generation before admitting a restore. */
  async restore(actor: AccessContext, payload: RestoreBackupDTO): Promise<BackupOperationTicket> {
    this.authorize(actor, PERMISSIONS.DATABASE_RESTORE); await this.initialize(); this.assertReady();
    const user = await this.postgres.database.user.findUnique({ where: { id: actor.userId }, select: { passwordHash: true, email: true } });
    if (!user || !await bcrypt.compare(payload.currentPassword, user.passwordHash)) throw new AppError(400, 'La contraseña actual no es correcta.');
    const previous = this.replay(payload.requestId, actor.userId, 'RESTORE'); if (previous) { await this.admitting; return this.ticket(previous); }
    if (payload.confirmation !== 'RESTAURAR') throw new AppError(400, 'Escribe RESTAURAR para confirmar.');
    const storage = this.requireStorage();
    if (await storage.latestId() !== payload.backupId) throw new AppError(409, 'El respaldo disponible cambió. Actualiza la pantalla antes de restaurar.');
    const manifest = await storage.manifest(payload.backupId);
    if (!manifest.activeSuperAdmins) throw new AppError(409, 'El respaldo no contiene un Super Admin activo con permiso de restauración.');
    if (manifest.schemaHash !== await this.postgres.schemaHash()) throw new AppError(409, 'El respaldo no es compatible con las migraciones actuales.');
    return this.ticket(await this.enqueue('RESTORE', actor.userId, payload.requestId, payload.backupId, user.email));
  }

  /** Serialized admission closes the gate before awaiting journal I/O. */
  private async enqueue(kind: BackupOperationRecord['kind'], actorId: number | null, requestId: string, backupId: string | null = null, actorEmail = '', uploadDirectory?: string): Promise<BackupOperationRecord> {
    if (this.running || this.exporting || this.runtime.mode !== 'OPEN') throw new AppError(409, 'Ya hay una operación de respaldo en curso.');
    this.runtime.mode = kind === 'RESTORE' ? 'MAINTENANCE' : 'READ_ONLY';
    const operation: BackupOperationRecord = { id: randomUUID(), kind, phase: 'QUEUED', startedAt: new Date().toISOString(), finishedAt: null,
      message: 'Operación en espera.', requestId, actorId, actorEmail, backupId, commitAttempted: false };
    this.journal.operations = this.journal.operations.slice(-99).concat(operation);
    this.admitting = (async () => {
      if (kind === 'RESTORE') await writePrivateJson(join(this.requireStorage().root, 'restore-pending.json'), { operationId: operation.id });
      await this.persist();
    })();
    try { await this.admitting; }
    catch {
      this.journal.operations.pop(); this.runtime.mode = 'OPEN';
      if (kind === 'RESTORE') await unlink(join(this.requireStorage().root, 'restore-pending.json')).catch(() => undefined);
      throw new AppError(503, 'No se pudo registrar la operación. No se modificaron datos.');
    } finally { this.admitting = null; }
    this.running = new Promise<void>(resolve => { setImmediate(() => { void this.execute(operation, uploadDirectory).finally(resolve); }); });
    return operation;
  }

  private async phase(operation: BackupOperationRecord, phase: BackupOperationRecord['phase'], message: string): Promise<void> {
    operation.phase = phase; operation.message = message; await this.persist();
  }

  private async execute(operation: BackupOperationRecord, uploadDirectory?: string): Promise<void> {
    let directory: string | undefined;
    try {
      await this.phase(operation, 'DRAINING', 'Esperando a que finalicen las operaciones iniciadas.');
      await this.runtime.drain();
      if (operation.actorId !== null) {
        const current = await authorizationService.getAccessContext(operation.actorId, this.postgres.database);
        this.authorize(current, operation.kind === 'BACKUP' ? PERMISSIONS.DATABASE_BACKUP : PERMISSIONS.DATABASE_RESTORE);
        if (operation.kind === 'IMPORT') this.authorize(current, PERMISSIONS.DATABASE_BACKUP);
      }
      directory = await mkdtemp(join(tmpdir(), 'fqa-backup-')); await chmod(directory, 0o700);
      await this.postgres.assertVersion(directory);
      if (operation.kind === 'BACKUP') await this.writeBackup(operation, directory);
      else if (operation.kind === 'IMPORT' && uploadDirectory) await this.installImport(operation, directory, uploadDirectory);
      else await this.applyRestore(operation, directory);
      operation.phase = 'SUCCEEDED'; operation.message = operation.kind === 'BACKUP' ? 'Respaldo completado correctamente.' : operation.kind === 'IMPORT' ? 'Respaldo importado correctamente. Puedes restaurarlo desde esta pantalla.' : 'Restauración completada. Inicia sesión nuevamente.';
      operation.finishedAt = new Date().toISOString(); await this.persist();
    } catch (error: unknown) {
      let completed: boolean | null = false;
      if (operation.kind === 'RESTORE' && operation.commitAttempted) completed = await this.postgres.restoredOperation(operation.id).catch(() => null);
      if ((operation.kind === 'BACKUP' || operation.kind === 'IMPORT') && operation.backupId) completed = await this.requireStorage().latestId().then(id => id === operation.backupId).catch(() => null);
      operation.phase = completed === true ? 'SUCCEEDED' : completed === null ? 'RECOVERING' : 'FAILED';
      operation.message = completed === true ? 'Operación completada correctamente.' : completed === null ? 'Comprobando el resultado de la operación. El mantenimiento continúa.'
        : error instanceof AppError ? error.message : 'No se pudo completar la operación. Se conserva el estado anterior.';
      operation.finishedAt = completed === null ? null : new Date().toISOString();
      await this.persist().catch(() => { this.ready = false; this.reason = 'No se pudo persistir el estado de la operación.'; });
    } finally {
      if (directory) await rm(directory, { recursive: true, force: true }).catch(() => undefined);
      if (uploadDirectory) await rm(uploadDirectory, { recursive: true, force: true }).catch(() => undefined);
      // Retention finishes under the gate: otherwise a previous prune could delete a new generation.
      if (terminal(operation)) await this.requireStorage().prune().catch(() => undefined);
      if (terminal(operation) && operation.kind === 'RESTORE' && this.ready) await unlink(join(this.requireStorage().root, 'restore-pending.json')).catch(() => undefined);
      if (terminal(operation)) this.runtime.mode = 'OPEN';
      this.running = null;
    }
  }

  /** Installs a fresh generation only after authentication, schema checks and every native artifact check. */
  private async installImport(operation: BackupOperationRecord, directory: string, uploadDirectory: string): Promise<void> {
    const storage = this.requireStorage(); const id = randomUUID();
    // The input directory is generated by prepareImport, never taken from multipart metadata.
    if (resolve(uploadDirectory, '..') !== join(storage.root, 'uploads')) throw new AppError(400, 'La carga de respaldo no es válida.');
    operation.backupId = id;
    await this.phase(operation, 'VERIFYING', 'Verificando el archivo importado, su clave y compatibilidad.');
    const manifest = await readBackupPackage(storage, join(uploadDirectory, 'backup.fqabackup'), id);
    if (!manifest.activeSuperAdmins || manifest.schemaHash !== await this.postgres.schemaHash()) throw new AppError(409, 'El respaldo no es compatible con el esquema o no contiene un Super Admin con permiso de restauración.');
    const dump = join(directory, 'database.dump');
    await storage.decrypt(join(storage.generation(id), 'database.enc'), manifest.database, dump);
    await this.postgres.run('pg_restore', ['--file', '/dev/null', dump], directory);
    for (const resume of manifest.resumes) {
      const path = join(directory, resume.key); await storage.decrypt(join(storage.generation(id), resume.key + '.enc'), resume, path); await unlink(path);
    }
    await this.phase(operation, 'PREPARING', 'Publicando el respaldo verificado. La DB actual se conserva.');
    await this.postgres.database.auditLogs.create({ data: { userId: operation.actorId, entityType: 'DatabaseBackup', entityId: 0,
      action: 'IMPORT', changes: { backupId: id, operationId: operation.id } } });
    await storage.publish(manifest);
  }

  private async writeBackup(operation: BackupOperationRecord, directory: string): Promise<void> {
    const storage = this.requireStorage(); const id = randomUUID(); operation.backupId = id;
    await this.phase(operation, 'BACKING_UP', 'Creando respaldo completo de PostgreSQL y documentos privados.');
    await mkdir(storage.generation(id), { mode: 0o700 });
    const schemaHash = await this.postgres.schemaHash();
    const database = this.postgres.database;
    const activeSuperAdmins = await database.user.count({ where: { deletedAt: null, status: { name: 'Activo' },
      userRoles: { some: { roles: { name: ROLE_NAMES.SUPER_ADMIN, rolePermissions: { some: { permissions: { name: PERMISSIONS.DATABASE_RESTORE } } } } } } } });
    const required = await database.files.findMany({ where: { fileType: 'RESUME', originalName: { not: null }, OR: [
      { activeProfile: { isNot: null } }, { applications: { some: {} } }, { applicationFiles: { some: {} } }, { applicationDrafts: { some: {} } },
    ] }, select: { filePath: true } });
    const root = this.configuration.resumeDirectory!; await mkdir(root, { recursive: true, mode: 0o700 });
    const keys = (await readdir(root)).filter(key => /^[0-9a-f-]{36}\.pdf$/.test(key)).sort();
    if (required.some(file => !keys.includes(file.filePath))) throw new AppError(503, 'Falta un CV referenciado por la DB. No se sustituyó el respaldo anterior.');
    const createdAt = new Date().toISOString(); const dump = join(directory, 'database.dump');
    await this.postgres.run('pg_dump', ['--format=custom', '--no-password', '--file', dump], directory);
    const artifact = await storage.encrypt(createReadStream(dump), join(storage.generation(id), 'database.enc'));
    const resumes: BackupManifest['resumes'] = [];
    for (const key of keys) {
      if (!(await lstat(join(root, key))).isFile()) throw new AppError(503, 'Un documento privado no es un archivo regular.');
      resumes.push({ key, ...await storage.encrypt(createReadStream(join(root, key)), join(storage.generation(id), key + '.enc')) });
    }
    await this.phase(operation, 'VERIFYING', 'Comprobando la integridad de la DB y todos los documentos.');
    const verified = join(directory, 'verified.dump');
    await storage.decrypt(join(storage.generation(id), 'database.enc'), artifact, verified);
    await this.postgres.run('pg_restore', ['--file', '/dev/null', verified], directory);
    for (const resume of resumes) {
      const path = join(directory, resume.key); await storage.decrypt(join(storage.generation(id), resume.key + '.enc'), resume, path); await unlink(path);
    }
    await storage.publish({ format: 1, id, createdAt, postgresMajor: 17, schemaHash, activeSuperAdmins, database: artifact, resumes });
    await storage.prune();
    if (operation.actorId !== null) await database.auditLogs.create({ data: { userId: operation.actorId, entityType: 'DatabaseBackup', entityId: 0,
      action: 'BACKUP', changes: { backupId: id, operationId: operation.id } } });
  }

  private async applyRestore(operation: BackupOperationRecord, directory: string): Promise<void> {
    const storage = this.requireStorage(); const id = operation.backupId!;
    if (await storage.latestId() !== id) throw new AppError(409, 'El respaldo disponible cambió.');
    const manifest = await storage.manifest(id);
    if (!manifest.activeSuperAdmins || manifest.schemaHash !== await this.postgres.schemaHash()) throw new AppError(409, 'El respaldo no es compatible con el esquema o los accesos actuales.');
    await this.phase(operation, 'VERIFYING', 'Validando el respaldo antes de modificar datos.');
    const dump = join(directory, 'database.dump'); await storage.decrypt(join(storage.generation(id), 'database.enc'), manifest.database, dump);
    await this.postgres.run('pg_restore', ['--file', '/dev/null', dump], directory);
    for (const resume of manifest.resumes) await storage.decrypt(join(storage.generation(id), resume.key + '.enc'), resume, join(directory, resume.key));
    await this.phase(operation, 'PREPARING', 'Preparando los documentos sin eliminar archivos actuales.');
    const root = this.configuration.resumeDirectory!; await mkdir(root, { recursive: true, mode: 0o700 });
    for (const resume of manifest.resumes) {
      const destination = join(root, resume.key);
      try {
        await copyFile(join(directory, resume.key), destination, constants.COPYFILE_EXCL);
        const handle = await open(destination, 'r'); try { await handle.sync(); } finally { await handle.close(); }
      }
      catch (error: unknown) {
        if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error;
        if (!(await lstat(destination)).isFile() || createHash('sha256').update(await readFile(destination)).digest('hex') !== resume.sha256) {
          throw new AppError(503, 'Un CV actual tiene contenido incompatible. No se modificó la DB.');
        }
      }
    }
    if (process.platform !== 'win32') { const handle = await open(root, 'r'); try { await handle.sync(); } finally { await handle.close(); } }
    operation.commitAttempted = true;
    await this.phase(operation, 'RESTORING', 'Restaurando la DB e invalidando sesiones y correos pendientes.');
    await this.postgres.restore(dump, directory, { id: operation.actorId, email: operation.actorEmail }, operation.id, id);
  }

  /** Monitoring does not authenticate against tables that may be locked or replaced. */
  async operation(id: string, token: string): Promise<BackupOperation> {
    await this.initialize();
    const operation = this.journal.operations.find(item => item.id === id);
    if (!operation || !/^[0-9a-f]{64}$/.test(token) ||
      !timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(this.requireStorage().monitorToken(id), 'hex')) ||
      Date.now() - Date.parse(operation.startedAt) > 24 * 60 * 60_000 ||
      (operation.finishedAt && Date.now() - Date.parse(operation.finishedAt) > 30 * 60_000)) {
      throw new AppError(403, 'El seguimiento de esta operación no está autorizado o venció.');
    }
    return this.view(operation);
  }

  /** A transaction marker decides commit vs rollback after a process interruption. */
  private async recover(): Promise<void> {
    for (const operation of this.journal.operations.filter(item => !terminal(item))) {
      if (operation.kind === 'RESTORE' && operation.commitAttempted) {
        this.runtime.mode = 'MAINTENANCE';
        const result = await this.postgres.restoredOperation(operation.id).catch(() => null);
        if (result === null) { operation.phase = 'RECOVERING'; operation.message = 'Esperando verificar el resultado de la restauración.'; continue; }
        operation.phase = result ? 'SUCCEEDED' : 'FAILED';
        operation.message = result ? 'Restauración completada. Inicia sesión nuevamente.' : 'La restauración se interrumpió y la transacción fue revertida.';
      } else {
        const published = (operation.kind === 'BACKUP' || operation.kind === 'IMPORT') && operation.backupId === await this.requireStorage().latestId();
        operation.phase = published ? 'SUCCEEDED' : 'FAILED';
        operation.message = published ? 'Respaldo completado correctamente.' : 'La operación se interrumpió. Se conserva el estado anterior.';
      }
      operation.finishedAt = new Date().toISOString();
    }
    await this.persist();
    if (this.journal.operations.every(terminal)) {
      await unlink(join(this.requireStorage().root, 'restore-pending.json')).catch(error => { if (!isMissing(error)) throw error; });
      this.runtime.mode = 'OPEN';
    }
  }

  /** One initial run or catch-up, then one slot per Salvador day; manual runs do not replace the daily schedule. */
  async tick(now = new Date()): Promise<void> {
    if (this.tickRunning || this.stopping) return;
    this.tickRunning = true;
    try {
      await this.initialize(); if (!this.ready || this.running || this.exporting) return;
      if (this.runtime.mode !== 'OPEN') { await this.recover(); return; }
      const slot = backupScheduledSlot(now);
      if (this.journal.scheduledSlot !== slot) { this.journal.scheduledSlot = slot; this.journal.failures = 0; this.journal.nextAttemptAt = now.toISOString(); await this.persist(); }
      if (!this.journal.nextAttemptAt || new Date(this.journal.nextAttemptAt) > now) return;
      const operation = await this.enqueue('BACKUP', null, randomUUID());
      await this.running;
      if (operation.phase === 'SUCCEEDED') this.journal.nextAttemptAt = null;
      else { this.journal.failures += 1; this.journal.nextAttemptAt = this.journal.failures <= 3 ? new Date(now.getTime() + 5 * 60_000).toISOString() : null; }
      await this.persist();
    } catch { console.error('No se pudo completar la ejecución programada del respaldo.'); }
    finally { this.tickRunning = false; }
  }

  /** Starts only in the application entrypoint, never as a router import side effect. */
  async start(): Promise<void> {
    await this.initialize();
    if (!this.configuration.enabled || this.configuration.environment === 'production') return;
    void this.tick(); this.timer = setInterval(() => { void this.tick(); }, 30_000); this.timer.unref();
  }
  /** Stops native tools and releases the single-process owner after its journal is settled. */
  async stop(): Promise<void> {
    this.stopping = true; if (this.timer) clearInterval(this.timer); this.postgres.cancel(); await this.running;
    if (this.ownsLock) await unlink(join(this.requireStorage().root, 'coordinator.lock')).catch(() => undefined);
    this.ownsLock = false;
  }
}

/** Application singleton; importing routes never starts its scheduler or creates backups. */
export const backupCoordinator = new BackupCoordinator({ enabled: env.BACKUPS_ENABLED, environment: env.NODE_ENV,
  directory: env.BACKUP_DIRECTORY, encryptionKey: env.BACKUP_ENCRYPTION_KEY,
  resumeDirectory: env.RESUME_STORAGE_DRIVER === 'filesystem' ? env.RESUME_STORAGE_DIRECTORY : undefined }, new BackupPostgres(prisma, env.DATABASE_URL));
