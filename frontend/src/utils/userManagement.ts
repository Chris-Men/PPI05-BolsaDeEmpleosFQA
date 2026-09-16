import type { CurrentAccess, RoleCode } from '../types/auth';
import type { AssignableRole, ManagedUser, UpdateUserRequest, UserFormValues } from '../types/adminUser';

/** Localized labels for persisted API role codes. */
export const ROLE_LABELS: Record<RoleCode, string> = {
  CANDIDATE: 'Candidato', ADMINISTRATOR: 'Administrador', SUPER_ADMIN: 'Super Admin',
};

/** Navigation guards complement, but never replace, the API's authorization. */
export const canManageUsers = (access: Pick<CurrentAccess, 'roles' | 'permissions'> | null): boolean =>
  Boolean(access && (access.roles.includes('SUPER_ADMIN')
    ? access.permissions.includes('users.read')
    : access.roles.includes('ADMINISTRATOR') && access.permissions.includes('candidates.read')));

/** Role restrictions also apply when permission metadata contains unexpected grants. */
export const getCreatableUserRoles = (
  access: Pick<CurrentAccess, 'roles' | 'permissions'> | null,
): AssignableRole[] => {
  if (!access || !access.roles.some((role) => role === 'SUPER_ADMIN' || role === 'ADMINISTRATOR')) return [];
  const roles: AssignableRole[] = [];
  if (access.permissions.includes('candidates.create')) roles.push('CANDIDATE');
  if (access.roles.includes('SUPER_ADMIN') && access.permissions.includes('administrators.create')) roles.push('ADMINISTRATOR');
  return roles;
};

/** Builds a minimal patch and preserves multiple roles unless an explicit replacement is selected. */
export const buildUserUpdate = (original: ManagedUser, form: UserFormValues): UpdateUserRequest => ({
  ...(form.fullName.trim() !== original.fullName ? { fullName: form.fullName.trim() } : {}),
  ...(form.email.trim().toLowerCase() !== original.email ? { email: form.email.trim().toLowerCase() } : {}),
  ...(form.role && (original.roles.length !== 1 || original.roles[0] !== form.role) ? { role: form.role } : {}),
});
