import type { AccessContext } from './authorization.types.js';

declare module 'express-serve-static-core' {
  /** Authenticated identity attached exclusively by server-side middleware. */
  interface Request {
    user?: AccessContext;
    session?: { id: string; expiresAt: Date };
  }
}
