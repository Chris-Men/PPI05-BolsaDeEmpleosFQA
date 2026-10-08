import { apiRequest } from './api';
import type { Category, CategoryInput, Opportunity, OpportunityCatalogs, OpportunityFilters, OpportunityInput, OpportunityKind, Page, PublicOpportunityStatistics } from '../types/opportunity';

/** Query encoding preserves spaces and never serializes absent filter values. */
const queryString = (filters: object): string => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== '') query.set(key, String(value));
  return query.size ? '?' + query.toString() : '';
};
/** Public visibility is enforced by the API for every listing and detail. */
export const listOpportunities = (filters: OpportunityFilters = {}) => apiRequest<Page<Opportunity>>('/opportunities' + queryString(filters));
/** Fresh detail prevents using a vacancy that closed since a listing was loaded. */
export const getOpportunity = (key: string) => apiRequest<Opportunity>('/opportunities/' + encodeURIComponent(key));
/** Select catalogs use the central transport and session renewal for administration. */
export const getOpportunityCatalogs = (admin = false) => apiRequest<OpportunityCatalogs>((admin ? '/admin' : '') + '/opportunities/catalogs', { authenticated: admin });
/** Homepage statistics never inherit listing filters and require no authenticated session. */
export const getPublicOpportunityStatistics = () => apiRequest<PublicOpportunityStatistics>('/opportunities/statistics');
/** Public category selectors contain names instead of requiring users to enter database identities. */
export const getCategoryCatalog = () => apiRequest<OpportunityCatalogs['categories']>('/categories');
/** Drafts and closed opportunities are visible only to authorized administrators. */
export const listManagedOpportunities = (filters: OpportunityFilters = {}) => apiRequest<Page<Opportunity>>('/admin/opportunities' + queryString(filters), { authenticated: true });
/** Administrative detail is refreshed before opening an editor. */
export const getManagedOpportunity = (key: string) => apiRequest<Opportunity>('/admin/opportunities/' + encodeURIComponent(key), { authenticated: true });
/** Creates a persistent draft; publication requires a separate grant. */
export const createOpportunity = (kind: OpportunityKind, input: OpportunityInput) => apiRequest<Opportunity>('/admin/opportunities', { method: 'POST', authenticated: true, body: JSON.stringify({ ...input, kind }) });
/** Edits only writable fields while retaining the original table identity. */
export const updateOpportunity = (key: string, input: OpportunityInput) => apiRequest<Opportunity>('/admin/opportunities/' + encodeURIComponent(key), { method: 'PATCH', authenticated: true, body: JSON.stringify(input) });
/** Publishing and closing are explicit lifecycle transitions. */
export const setOpportunityStatus = (key: string, status: 'OPEN' | 'CLOSED') => apiRequest<Opportunity>('/admin/opportunities/' + encodeURIComponent(key) + '/status', { method: 'PATCH', authenticated: true, body: JSON.stringify({ status }) });
/** Archiving preserves historical applications and registrations. */
export const archiveOpportunity = (key: string) => apiRequest<Opportunity>('/admin/opportunities/' + encodeURIComponent(key), { method: 'DELETE', authenticated: true });
/** Administrative category search, availability filter and pagination. */
export const listCategories = (filters: { page?: number; pageSize?: number; search?: string; state?: 'ACTIVE' | 'INACTIVE' } = {}) => apiRequest<Page<Category>>('/admin/categories' + queryString(filters), { authenticated: true });
/** Category mutations share one typed payload; names and slugs are validated on the server. */
export const saveCategory = (id: number | null, input: CategoryInput) => apiRequest<Category>('/admin/categories' + (id == null ? '' : '/' + id), { method: id == null ? 'POST' : 'PATCH', authenticated: true, body: JSON.stringify(input) });
/** Referenced categories are protected by the backend. */
export const deleteCategory = (id: number) => apiRequest<void>('/admin/categories/' + id, { method: 'DELETE', authenticated: true });
