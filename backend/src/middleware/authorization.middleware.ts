import type { RequestHandler } from 'express';
import type { PermissionCode, RoleCode } from '../constants/authorization.constants.js';
import { assertPermission, authorizationService } from '../services/authorization.service.js';
import { requireActiveSession } from '../services/session.service.js';
import { tokenService } from '../services/token.service.js';
import { AppError } from '../utils/app-error.js';

/** Authenticates a bearer token and reloads current role/permission grants from the DB. */
export const authenticate: RequestHandler = async (request, response, next): Promise<void> => {
  response.set('Cache-Control', 'no-store');
  try {
    const match = /^Bearer ([^\s]+)$/i.exec(request.get('authorization') ?? '');
    if (!match) throw new AppError(401, 'Debes iniciar sesión para realizar esta acción.');
    const { userId, sessionId } = tokenService.verifyAccessToken(match[1]);
    request.session = { id: sessionId, expiresAt: await requireActiveSession(sessionId, userId) };
    request.user = await authorizationService.getAccessContext(userId);
    next();
  } catch (error: unknown) {
    next(error);
  }
};

/** Requires an authenticated permission; resource services must also enforce ownership. */
export const requirePermission = (permission: PermissionCode): RequestHandler =>
  (request, _response, next): void => {
    try {
      if (!request.user) throw new AppError(401, 'Debes iniciar sesión para realizar esta acción.');
      assertPermission(request.user, permission);
      next();
    } catch (error: unknown) {
      next(error);
    }
  };

/** Enforces explicit role boundaries for development diagnostics and role-only operations. */
export const requireRole = (role: RoleCode): RequestHandler =>
  (request, _response, next): void => {
    if (!request.user) {
      next(new AppError(401, 'Debes iniciar sesión para realizar esta acción.'));
    } else if (!request.user.roles.includes(role)) {
      next(new AppError(403, 'No tienes permiso para realizar esta acción.'));
    } else {
      next();
    }
  };
