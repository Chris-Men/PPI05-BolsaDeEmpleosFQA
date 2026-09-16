import type { RoleCode } from './auth';

/** Roles assignable from this sprint's management interface. */
export type AssignableRole = Extract<RoleCode, 'CANDIDATE' | 'ADMINISTRATOR'>;
/** Lifecycle state is read-only; soft deletion is a separate backend attribute. */
export type UserStatusCode = 'ACTIVE' | 'DISABLED';
/** Safe administrative user representation. */
export interface ManagedUser {
  id: number; fullName: string; email: string; roles: RoleCode[];
  status: UserStatusCode; createdAt: string | null;
}
/** Server-side search and pagination. */
export interface UserFilters {
  search: string; role: RoleCode | ''; status: UserStatusCode | ''; page: number; pageSize: number;
}
/** Paginated administrative response. */
export interface UserListResponse { items: ManagedUser[]; total: number; page: number; pageSize: number }
/** Account creation does not sign in as the new user. */
export interface CreateUserRequest { fullName: string; email: string; password: string; role: AssignableRole }
/** Explicitly allowed account edits; lifecycle and password fields are absent. */
export interface UpdateUserRequest { fullName?: string; email?: string; role?: AssignableRole }
/** Form state keeps an empty role to preserve multiple existing assignments when editing. */
export interface UserFormValues { fullName: string; email: string; password: string; role: AssignableRole | '' }
