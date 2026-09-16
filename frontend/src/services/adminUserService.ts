import { apiRequest } from './api';
import type { CreateUserRequest, ManagedUser, UpdateUserRequest, UserFilters, UserListResponse, UserLifecycleAction } from '../types/adminUser';

/** Lists real users using authenticated, server-side filters. */
export const getUsers = (filters: UserFilters, signal?: AbortSignal): Promise<UserListResponse> => {
  const query = new URLSearchParams({ page: String(filters.page), pageSize: String(filters.pageSize) });
  if (filters.search.trim()) query.set('search', filters.search.trim());
  if (filters.deleted) query.set('deleted', 'true');
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

/** Sends explicit lifecycle actions; only the final delete confirmation calls this service. */
export const changeUserLifecycle = (id: number, action: UserLifecycleAction): Promise<void> => {
  const path = '/admin/users/' + id;
  if (action === 'DELETE') return apiRequest(path, { authenticated: true, method: 'DELETE', body: JSON.stringify({ confirmDeletion: true }) });
  if (action === 'RESTORE') return apiRequest(path + '/restore', { authenticated: true, method: 'POST', body: '{}' });
  return apiRequest(path + '/status', { authenticated: true, method: 'PATCH',
    body: JSON.stringify({ status: action === 'ENABLE' ? 'ACTIVE' : 'DISABLED' }) });
};
