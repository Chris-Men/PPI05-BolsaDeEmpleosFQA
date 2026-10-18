import type { CurrentAccess } from '../types/auth';

/** UI visibility mirrors role plus grant; mandatory authorization stays on the server. */
export const canManageBackups = (session: CurrentAccess | null, permission: 'database.backup' | 'database.restore' = 'database.backup'): boolean =>
  Boolean(session?.roles.includes('SUPER_ADMIN') && session.permissions.includes(permission));
