import { apiRequest } from './api';
import type { SavedOpportunityKeys, SavedOpportunityPage } from '../types/savedOpportunity';

/** Identity guards are local transport preconditions; account IDs never enter bookmark requests. */
export const getSavedOpportunityKeys = (userId: number, signal?: AbortSignal) =>
  apiRequest<SavedOpportunityKeys>('/saved-opportunities/keys', { authenticated: true, expectedUserId: userId, signal });
/** Summary pagination is independent of public vacancy search or availability filters. */
export const listSavedOpportunities = (userId: number, page = 1, signal?: AbortSignal) =>
  apiRequest<SavedOpportunityPage>(`/saved-opportunities?page=${page}&pageSize=10`, { authenticated: true, expectedUserId: userId, signal });
/** PUT/DELETE express the intended state and safely tolerate retries after lost responses. */
export const changeSavedOpportunity = (key: string, saved: boolean, userId: number, signal?: AbortSignal) =>
  apiRequest<void>('/saved-opportunities/' + encodeURIComponent(key), { authenticated: true, expectedUserId: userId, signal, method: saved ? 'PUT' : 'DELETE' });
