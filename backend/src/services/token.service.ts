import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ACCESS_TOKEN_TTL_SECONDS } from '../constants/auth.constants.js';
import { AppError } from '../utils/app-error.js';

/** Stateless access-token operations shared by authentication services. */
export const tokenService = {
  /** Verifies signature, expiry and numeric identity; authorization is loaded separately. */
  verifyAccessToken(token: string): number {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
      if (
        typeof payload !== 'object' ||
        typeof payload.sub !== 'string' ||
        !/^[1-9]\d*$/.test(payload.sub) ||
        !Number.isSafeInteger(Number(payload.sub)) || Number(payload.sub) > 2_147_483_647 ||
        typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)
      ) {
        throw new Error('Identidad o vencimiento inválidos.');
      }
      return Number(payload.sub);
    } catch {
      throw new AppError(401, 'La sesión no es válida. Inicia sesión nuevamente.');
    }
  },

  /** Signs a one-hour access token; credentials and profile data are excluded. */
  createAccessToken(userId: string, role: string): string {
    return jwt.sign({ role }, env.JWT_SECRET, {
      algorithm: 'HS256',
      subject: userId,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
  },
};
