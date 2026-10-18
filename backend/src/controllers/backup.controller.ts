import type { NextFunction, Request, Response } from 'express';
import { backupCoordinator } from '../services/backup.service.js';
import { createBackupSchema, restoreBackupSchema } from '../validation/backup.schema.js';
import { AppError } from '../utils/app-error.js';

/** Thin controller: authorization and orchestration are also enforced by the service. */
export const backupAction = (action: 'status' | 'create' | 'restore' | 'operation') =>
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      response.set('Cache-Control', 'no-store');
      if (action === 'operation') {
        response.json(await backupCoordinator.operation(String(request.params.id), request.get('X-FQA-Operation-Token') ?? '')); return;
      }
      if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
      if (action === 'status') response.json(await backupCoordinator.status(request.user));
      else if (action === 'create') response.status(202).json(await backupCoordinator.create(request.user, createBackupSchema.parse(request.body).requestId));
      else response.status(202).json(await backupCoordinator.restore(request.user, restoreBackupSchema.parse(request.body)));
    } catch (error: unknown) { next(error); }
  };
