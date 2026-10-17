import type { CurrentAccess } from '../types/auth';

/** UI grants mirror backend roles; they never replace backend authorization. */
export const canReadStatistics = (session: CurrentAccess | null): boolean => Boolean(session?.roles.some(role => role === 'ADMINISTRATOR' || role === 'SUPER_ADMIN') && session.permissions.includes('statistics.read'));
export const canReadSiteSettings = (session: CurrentAccess | null): boolean => Boolean(session?.roles.some(role => role === 'ADMINISTRATOR' || role === 'SUPER_ADMIN') && session.permissions.includes('site-settings.read'));
export const canUpdateSiteSettings = (session: CurrentAccess | null): boolean => Boolean(session?.roles.includes('SUPER_ADMIN') && session.permissions.includes('site-settings.update'));
