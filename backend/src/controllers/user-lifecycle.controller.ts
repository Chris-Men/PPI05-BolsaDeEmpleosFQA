import type { Request, Response, NextFunction } from 'express';
import { changeUserLifecycle, type UserLifecycleAction } from '../services/user-lifecycle.service.js';
import { userIdSchema } from '../validation/admin-user.schema.js';
import { clearSessionCookie } from '../middleware/session-cookie.middleware.js';
import { AppError } from '../utils/app-error.js';

/** Delegates administrative lifecycle changes after body validation. */
const apply = async (request: Request, response: Response, next: NextFunction, action: UserLifecycleAction): Promise<void> => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    await changeUserLifecycle(userIdSchema.parse(request.params.id), action, request.user);
    response.status(204).end();
  } catch (error: unknown) { next(error); }
};

/** Toggles only the non-deleted account's status. */
export const changeStatus = (request: Request<Record<string, string>, unknown, { status: 'ACTIVE' | 'DISABLED' }>, response: Response, next: NextFunction): Promise<void> =>
  apply(request, response, next, request.body.status === 'ACTIVE' ? 'ENABLE' : 'DISABLE');
/** Soft-deletes a managed account without removing its history. */
export const deleteUser = (request: Request, response: Response, next: NextFunction): Promise<void> =>
  apply(request, response, next, 'DELETE');
/** Restores an account only when its original email is available. */
export const restoreUser = (request: Request, response: Response, next: NextFunction): Promise<void> =>
  apply(request, response, next, 'RESTORE');

/** Deletes the authenticated identity; no request-provided target is accepted. */
export const deleteOwnAccount = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    await changeUserLifecycle(request.user.userId, 'DELETE', request.user, true);
    clearSessionCookie(response);
    response.status(204).end();
  } catch (error: unknown) { next(error); }
};
