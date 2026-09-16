import { apiRequest } from './api';
import type { CreateUserRequest, ManagedUser, UpdateUserRequest, UserFilters, UserListResponse } from '../types/adminUser';

/** Lists real users using authenticated, server-side filters. */
export const getUsers = (filters: UserFilters, signal?: AbortSignal): Promise<UserListResponse> => {
  const query = new URLSearchParams({ page: String(filters.page), pageSize: String(filters.pageSize) });
  if (filters.search.trim()) query.set('search', filters.search.trim());
  if (filters.role) query.set('role', filters.role);
  if (filters.status) query.set('status', filters.status);
  return apiRequest('/admin/users?' + query.toString(), { authenticated: true, signal });
};
/** Creates an account without replacing the current Super Admin session. */
export const createUser = (payload: CreateUserRequest): Promise<ManagedUser> =>
  apiRequest('/admin/users', { authenticated: true, method: 'POST', body: JSON.stringify(payload) });
/** Updates only identity and optional role, never a password or status. */
export const updateUser = (id: number, payload: UpdateUserRequest): Promise<ManagedUser> =>
  apiRequest('/admin/users/' + id, { authenticated: true, method: 'PATCH', body: JSON.stringify(payload) });
