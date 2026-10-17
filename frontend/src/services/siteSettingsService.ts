import { apiRequest } from './api';
import type { SiteConfiguration } from '../config/siteConfiguration';

/** Version is private editor metadata, never an editable content property. */
export interface SiteSettingsDocument { version: number; configuration: SiteConfiguration }
/** Reads only publishable content without authentication or editor metadata. */
export const getPublicSiteSettings = (signal?: AbortSignal) => apiRequest<SiteConfiguration>('/site-settings', { signal });
/** Loads the saved configuration and concurrency version for the current administrator. */
export const getAdminSiteSettings = (userId: number, signal?: AbortSignal) => apiRequest<SiteSettingsDocument>('/admin/site-settings', { authenticated: true, expectedUserId: userId, signal });
/** Saves a complete document only while the initiating identity remains current. */
export const saveSiteSettings = (document: SiteSettingsDocument, userId: number, signal?: AbortSignal) => apiRequest<SiteSettingsDocument>('/admin/site-settings', { method: 'PUT', body: JSON.stringify(document), authenticated: true, expectedUserId: userId, signal });
/** Restores canonical content with the same optimistic version precondition as a save. */
export const resetSiteSettings = (version: number, userId: number, signal?: AbortSignal) => apiRequest<SiteSettingsDocument>('/admin/site-settings/reset', { method: 'POST', body: JSON.stringify({ version }), authenticated: true, expectedUserId: userId, signal });
