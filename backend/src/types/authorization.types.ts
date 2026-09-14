import type { PermissionCode, RoleCode } from '../constants/authorization.constants.js';

/** Current database-backed privileges, reloaded for every authenticated request. */
export interface AccessContext {
  userId: number;
  roles: RoleCode[];
  permissions: PermissionCode[];
}

/** Permissions whose use additionally requires ownership of the stored resource. */
export type OwnPermissionCode = Extract<PermissionCode, `${string}.own`>;

/** Minimal trusted account identity used to validate administrator deletion. */
export interface AccountRoleTarget {
  userId: number;
  roles: readonly RoleCode[];
}
