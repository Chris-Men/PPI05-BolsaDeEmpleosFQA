import type { AccessContext } from './authorization.types.js';

/** Public identity, excluding credentials and internal relations. */
export interface RegisteredUser {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

/** Shared public response for registration, login and renewal. */
export interface RegistrationResponse extends AccessContext {
  user: RegisteredUser;
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  sessionExpiresAt: string;
}

/** Internal result; refreshToken must only be written into an HttpOnly cookie. */
export interface SessionResult {
  body: RegistrationResponse;
  refreshToken: string;
}
