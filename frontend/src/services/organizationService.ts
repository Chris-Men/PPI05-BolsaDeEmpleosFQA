import { apiRequest } from './api';
import type { ManagedOrganization, OrganizationFilters, OrganizationInput, OrganizationListResponse } from '../types/organization';

/** Lists persistent organizations with server-side search and pagination. */
export const getOrganizations = (filters: OrganizationFilters, signal?: AbortSignal): Promise<OrganizationListResponse> => {
  const query = new URLSearchParams({ page: String(filters.page), pageSize: String(filters.pageSize) });
  if (filters.search.trim()) query.set('search', filters.search.trim());
  if (filters.status) query.set('status', filters.status);
  return apiRequest('/admin/organizations?' + query.toString(), { authenticated: true, signal });
};

/** Loads current detail before opening an organization dialog. */
export const getOrganization = (id: number): Promise<ManagedOrganization> =>
  apiRequest('/admin/organizations/' + id, { authenticated: true });

/** Creates an active organization with optional contact information. */
export const createOrganization = (input: OrganizationInput): Promise<ManagedOrganization> =>
  apiRequest('/admin/organizations', { authenticated: true, method: 'POST', body: JSON.stringify(input) });

/** Updates identity without changing lifecycle state. */
export const updateOrganization = (id: number, input: OrganizationInput): Promise<ManagedOrganization> =>
  apiRequest('/admin/organizations/' + id, { authenticated: true, method: 'PATCH', body: JSON.stringify(input) });

/** Activates or deactivates without deleting the organization's relationships. */
export const changeOrganizationStatus = (id: number, status: ManagedOrganization['status']): Promise<void> =>
  apiRequest('/admin/organizations/' + id + '/status', {
    authenticated: true, method: 'PATCH', body: JSON.stringify({ status }),
  });
