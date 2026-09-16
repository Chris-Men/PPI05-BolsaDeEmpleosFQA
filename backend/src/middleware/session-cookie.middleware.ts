import type { Request, RequestHandler, Response } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import type { SessionResult } from '../types/auth.types.js';

const cookieName = 'fqa_refresh';
const cookieOptions = {
  httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax' as const,
  path: '/api/auth',
};

/** Restricts cookie-authenticated mutations and prevents cross-origin login CSRF. */
export const protectSessionMutation: RequestHandler = (request, _response, next): void => {
  const origin = request.get('origin');
  if (request.get('X-FQA-Request') !== '1' || (origin && origin !== env.CORS_ORIGIN)) {
    next(new AppError(403, 'El origen de la solicitud no está permitido.'));
    return;
  }
  next();
};

/** Reads only the bounded opaque refresh cookie; never logs headers. */
export const readRefreshCookie = (request: Request): string | undefined => {
  const values = (request.get('cookie') ?? '').split(';').map((part) => part.trim());
  const matches = values.filter((part) => part.startsWith(cookieName + '='));
  return matches.length === 1 ? matches[0].slice(cookieName.length + 1) : undefined;
};

/** Returns only the public body and delivers the refresh credential via cookie. */
export const sendSession = (response: Response, result: SessionResult, status = 200): void => {
  response.cookie(cookieName, result.refreshToken, {
    ...cookieOptions, expires: new Date(result.body.sessionExpiresAt),
  });
  response.set('Cache-Control', 'no-store').status(status).json(result.body);
};

/** Removes the cookie using the same scope as issuance. */
export const clearSessionCookie = (response: Response): void => {
  response.clearCookie(cookieName, cookieOptions);
  response.set('Cache-Control', 'no-store');
};
