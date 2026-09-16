import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ACCESS_TOKEN_TTL_SECONDS } from '../constants/auth.constants.js';
import { AppError } from '../utils/app-error.js';

/** Verified claims identify the account and the revocable session. */
export interface VerifiedAccessToken { userId: number; sessionId: string }

/** Token cryptography; current permissions and session state are checked separately. */
export const tokenService = {
  /** Rejects legacy tokens, unsupported signatures and invalid identities. */
  verifyAccessToken(token: string): VerifiedAccessToken {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
      if (
        typeof payload !== 'object' || typeof payload.sub !== 'string' ||
        !/^[1-9]\d*$/.test(payload.sub) ||
        !Number.isSafeInteger(Number(payload.sub)) || Number(payload.sub) > 2_147_483_647 ||
        typeof payload.exp !== 'number' || !Number.isFinite(payload.exp) ||
        typeof payload.sid !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sid)
      ) throw new Error('Identidad o sesión inválida.');
      return { userId: Number(payload.sub), sessionId: payload.sid };
    } catch {
      throw new AppError(401, 'La sesión no es válida. Inicia sesión nuevamente.');
    }
  },

  /** Signs a JWT whose validity never exceeds the session's remaining lifetime. */
  createAccessToken(userId: string, role: string, sessionId: string,
    expiresIn = ACCESS_TOKEN_TTL_SECONDS): string {
    return jwt.sign({ role, sid: sessionId }, env.JWT_SECRET, {
      algorithm: 'HS256', subject: userId, expiresIn,
    });
  },
};
