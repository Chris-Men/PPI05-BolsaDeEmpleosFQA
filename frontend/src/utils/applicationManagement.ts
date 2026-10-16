import type { CurrentAccess } from '../types/auth';
/** Administrative UI mirrors role and grant checks; the backend remains authoritative. */
export const canManageApplications = (access:Pick<CurrentAccess,'roles'|'permissions'>|null,permission='applications.read.any'):boolean =>
  Boolean(access?.roles.some(role=>role==='ADMINISTRATOR'||role==='SUPER_ADMIN') && access.permissions.includes(permission));
