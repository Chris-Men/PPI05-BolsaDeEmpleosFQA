import type { CurrentAccess } from '../types/auth';
/** Both role and operation grant are required for administrative navigation and buttons. */
export const canManageVacancies = (access: Pick<CurrentAccess, 'roles' | 'permissions'> | null, permission = 'opportunities.read'): boolean =>
  Boolean(access?.roles.some((role) => role === 'ADMINISTRATOR' || role === 'SUPER_ADMIN') && access.permissions.includes(permission));
