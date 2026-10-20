import type { RequestHandler, Response } from 'express';
import multer from 'multer';
import { chmod, rm } from 'node:fs/promises';
import { backupCoordinator } from '../services/backup.service.js';
import { MAX_BACKUP_PACKAGE_BYTES } from '../services/backup-package.service.js';
import { AppError } from '../utils/app-error.js';

interface BackupUpload { directory: string; accepted: boolean }
const uploads = new WeakMap<Response, BackupUpload>();
let uploading = false;

/** Returns server-owned staging information, never a client-supplied filesystem path. */
export const getBackupUpload = (response: Response): BackupUpload => {
  const upload = uploads.get(response); if (!upload) throw new AppError(400, 'Selecciona un archivo de respaldo.'); return upload;
};

/** Authentication/permissions precede disk I/O; a single bounded multipart stream uses private storage. */
export const uploadBackup: RequestHandler = async (request, response, next): Promise<void> => {
  if (!request.user) { next(new AppError(401, 'Debes iniciar sesión.')); return; }
  if (uploading) { next(new AppError(409, 'Ya se está cargando un respaldo. Intenta nuevamente al finalizar.')); return; }
  uploading = true;
  let directory: string | undefined;
  try {
    directory = await backupCoordinator.prepareImport(request.user);
    const staging: BackupUpload = { directory, accepted: false }; uploads.set(response, staging);
    const cleanup = (): void => { if (!staging.accepted) void rm(staging.directory, { recursive: true, force: true }).catch(() => undefined); };
    response.once('finish', cleanup); response.once('close', cleanup);
    const receive = multer({
      storage: multer.diskStorage({ destination: directory, filename: (_request, _file, done) => done(null, 'backup.fqabackup') }),
      limits: { fileSize: MAX_BACKUP_PACKAGE_BYTES, files: 1, fields: 3, parts: 4, fieldSize: 256, fieldNameSize: 64 },
      fileFilter: (_request, file, done) => {
        if (!file.originalname.toLowerCase().endsWith('.fqabackup')) done(new AppError(400, 'Selecciona un archivo .fqabackup exportado por la plataforma.'));
        else done(null, true);
      },
    }).single('file');
    if (request.aborted || response.destroyed) throw new AppError(400, 'La carga del respaldo fue cancelada.');
    await new Promise<void>((resolve, reject) => {
      const aborted = (): void => { reject(new AppError(400, 'La carga del respaldo fue cancelada.')); };
      request.once('aborted', aborted);
      receive(request, response, (error: unknown) => { request.removeListener('aborted', aborted); if (error) reject(error); else resolve(); });
    });
    if (request.aborted || response.destroyed) { cleanup(); return; }
    if (!request.file) throw new AppError(400, 'Selecciona un archivo de respaldo.');
    await chmod(request.file.path, 0o600);
    next();
  } catch (error: unknown) {
    if (directory) await rm(directory, { recursive: true, force: true }).catch(() => undefined);
    next(error instanceof multer.MulterError ? new AppError(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
      error.code === 'LIMIT_FILE_SIZE' ? 'El respaldo supera el límite de 1 GiB.' : 'Envía un único archivo de respaldo y los campos de confirmación.') : error);
  } finally { uploading = false; }
};
