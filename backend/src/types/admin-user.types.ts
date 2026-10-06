import type { RoleCode } from '../constants/authorization.constants.js';
import type { UserStatusCode } from '../constants/user.constants.js';

/** Safe administrative row: no credentials, sessions or unrelated profile data. */
export interface ManagedUser {
  id: number;
  fullName: string;
  email: string;
  roles: RoleCode[];
  status: UserStatusCode;
  createdAt: string | null;
  deletedAt: string | null;
}

/** Stable page of non-deleted accounts. */
export interface UserListResponse {
  items: ManagedUser[];
  total: number;
  page: number;
  pageSize: number;
}
