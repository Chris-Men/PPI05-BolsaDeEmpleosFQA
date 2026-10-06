import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ACCESS_TOKEN_TTL_SECONDS } from '../constants/auth.constants.js';

/** Stateless access-token operations shared by authentication services. */
export const tokenService = {
  /** Signs a one-hour access token; credentials and profile data are excluded. */
  createAccessToken(userId: string, role: string): string {
    return jwt.sign({ role }, env.JWT_SECRET, {
      algorithm: 'HS256',
      subject: userId,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
  },
};
