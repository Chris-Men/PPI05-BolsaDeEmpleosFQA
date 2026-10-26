import { apiRequest } from './api';
import type { StatisticsExport, StatisticsExportList, StatisticsExportRequest } from '../types/statisticsExport';

/** Creation stays idempotent across network retries and session renewal for the same account. */
export const requestStatisticsExport = (payload: StatisticsExportRequest, userId: number, signal?: AbortSignal): Promise<StatisticsExport> =>
  apiRequest('/admin/statistics/exports', { method: 'POST', body: JSON.stringify(payload), authenticated: true, expectedUserId: userId, signal });
/** Only the current owner's jobs can be listed or polled. */
export const listStatisticsExports = (page: number, userId: number, signal?: AbortSignal): Promise<StatisticsExportList> =>
  apiRequest('/admin/statistics/exports?page=' + page + '&pageSize=10', { authenticated: true, expectedUserId: userId, signal });
/** Explicit job polling retains the same authorization and identity guards as list polling. */
export const getStatisticsExport = (id: number, userId: number, signal?: AbortSignal): Promise<StatisticsExport> =>
  apiRequest('/admin/statistics/exports/' + id, { authenticated: true, expectedUserId: userId, signal });
/** The file is fetched as a private binary, never through a public or token-bearing URL. */
export const downloadStatisticsExport = (id: number, userId: number, signal?: AbortSignal): Promise<Blob> =>
  apiRequest('/admin/statistics/exports/' + id + '/file', { authenticated: true, expectedUserId: userId, responseType: 'blob', signal });
