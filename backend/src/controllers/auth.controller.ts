import type { NextFunction, Request, Response } from 'express';
import { loginAccount, registerCandidate } from '../services/auth.service.js';
import { getPublicUser, logoutSession, refreshSession, revokeUserSessions } from '../services/session.service.js';
import { clearSessionCookie, readRefreshCookie, sendSession } from '../middleware/session-cookie.middleware.js';
import type { LoginDTO, RegisterCandidateDTO } from '../validation/auth.schema.js';
import { AppError } from '../utils/app-error.js';

/** Returns current database-backed access and public identity. */
export const getCurrentAccess = async (
  request: Request, response: Response, next: NextFunction,
): Promise<void> => {
  try {
    if (!request.user || !request.session) throw new AppError(401, 'Debes iniciar sesión.');
    const role = ['SUPER_ADMIN', 'ADMINISTRATOR', 'CANDIDATE'].find((value) =>
      request.user?.roles.some((assigned) => assigned === value)) ?? '';
    response.set('Cache-Control', 'no-store').json({
      ...request.user, user: await getPublicUser(request.user.userId, role),
      sessionExpiresAt: request.session.expiresAt.toISOString(),
    });
  } catch (error: unknown) { next(error); }
};

/** Registers a validated candidate and starts a persistent session. */
export const register = async (
  request: Request<Record<string, never>, unknown, RegisterCandidateDTO>,
  response: Response, next: NextFunction,
): Promise<void> => {
  try { sendSession(response, await registerCandidate(request.body), 201); }
  catch (error: unknown) { next(error); }
};

/** Authenticates a validated email/password pair. */
export const login = async (
  request: Request<Record<string, never>, unknown, LoginDTO>,
  response: Response, next: NextFunction,
): Promise<void> => {
  try { sendSession(response, await loginAccount(request.body)); }
  catch (error: unknown) { next(error); }
};

/** Rotates a refresh credential without exposing it in JSON. */
export const refresh = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try { sendSession(response, await refreshSession(readRefreshCookie(request))); }
  catch (error: unknown) {
    if (error instanceof AppError && error.statusCode === 401) clearSessionCookie(response);
    next(error);
  }
};

/** Revokes the browser session before clearing its cookie. */
export const logout = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    await logoutSession(readRefreshCookie(request));
    clearSessionCookie(response);
    response.status(204).end();
  } catch (error: unknown) { next(error); }
};

/** Ends all sessions of the authenticated account. */
export const logoutAll = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    await revokeUserSessions(request.user.userId);
    clearSessionCookie(response);
    response.status(204).end();
  } catch (error: unknown) { next(error); }
};

/** Revokes another account after route-level Super Admin authorization. */
export const revokeSessions = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const value = request.params.userId;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || Number(value) > 2_147_483_647) {
      throw new AppError(400, 'El identificador de usuario no es válido.');
    }
    await revokeUserSessions(Number(value));
    if (Number(value) === request.user?.userId) clearSessionCookie(response);
    response.set('Cache-Control', 'no-store').status(204).end();
  } catch (error: unknown) { next(error); }
};
