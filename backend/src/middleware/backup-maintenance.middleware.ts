import type { RequestHandler } from 'express';
import { backupRuntime } from '../services/backup-runtime.service.js';
import { AppError } from '../utils/app-error.js';

/** Health and narrowly scoped operation monitoring remain available during maintenance. */
export const backupMaintenance: RequestHandler = (request, response, next): void => {
  if (request.path === '/api/health' || /^\/api\/admin\/backups\/operations\/[0-9a-f-]{36}$/.test(request.path)) { next(); return; }
  const command = request.method === 'POST' && /^\/api\/admin\/backups(?:\/(?:restore|import))?\/?$/.test(request.path);
  const release = backupRuntime.enter(!command && !['GET', 'HEAD', 'OPTIONS'].includes(request.method));
  if (!release) {
    response.set('Retry-After', '10');
    next(new AppError(503, backupRuntime.mode === 'READ_ONLY'
      ? 'Se está creando un respaldo. Las consultas siguen disponibles; intenta guardar en unos momentos.'
      : 'El sistema está en mantenimiento por restauración. Intenta nuevamente en unos momentos.'));
    return;
  }
  // Socket closure does not cancel controller DB work. Release when end() is called,
  // including on a destroyed response, so a snapshot cannot overtake unfinished work.
  const end = response.end.bind(response);
  response.end = ((...args: Parameters<typeof response.end>) => { try { return end(...args); } finally { release(); } }) as typeof response.end;
  response.once('finish', release); next();
};
