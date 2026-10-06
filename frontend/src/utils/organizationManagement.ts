import type { CurrentAccess } from '../types/auth';

/** Requires both an administrative role and the requested organization grant. */
export const canManageOrganizations = (
  access: Pick<CurrentAccess, 'roles' | 'permissions'> | null, permission = 'organizations.read',
): boolean => Boolean(access?.roles.some((role) => role === 'ADMINISTRATOR' || role === 'SUPER_ADMIN') &&
  access.permissions.includes(permission));
