import type { CurrentAccess, RoleCode } from '../types/auth';
import type { AssignableRole, ManagedUser, UpdateUserRequest, UserFormValues, UserLifecycleAction } from '../types/adminUser';

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

/** Mirrors role/target boundaries for discoverability; the API independently authorizes every action. */
export const getUserLifecycleActions = (
  access: Pick<CurrentAccess, 'userId' | 'roles' | 'permissions'>, user: ManagedUser,
): UserLifecycleAction[] => {
  if (user.id === access.userId || user.roles.includes('SUPER_ADMIN')) return [];
  const superAdmin = access.roles.includes('SUPER_ADMIN');
  const candidate = user.roles.length === 1 && user.roles[0] === 'CANDIDATE';
  if (!superAdmin && (!access.roles.includes('ADMINISTRATOR') || !candidate)) return [];
  if (user.deletedAt) return superAdmin && access.permissions.includes('users.restore') ? ['RESTORE'] : [];
  const actions: UserLifecycleAction[] = [];
  if (access.permissions.includes(candidate ? 'candidates.status.update' : 'users.status.update')) {
    actions.push(user.status === 'ACTIVE' ? 'DISABLE' : 'ENABLE');
  }
  if (access.permissions.includes(candidate ? 'candidates.delete' : 'administrators.delete')) actions.push('DELETE');
  return actions;
};

/** Human-facing action names, reused by table buttons. */
export const USER_ACTION_LABELS: Record<UserLifecycleAction, string> = {
  DISABLE: 'Deshabilitar', ENABLE: 'Rehabilitar', DELETE: 'Eliminar', RESTORE: 'Restaurar',
};
