import { apiRequest } from './api';
import type { AdministrativeStatistics, DashboardStatistics, StatisticsRange } from '../types/statistics';

/** Identity is a local transport precondition and never becomes an API filter. */
export const getDashboardStatistics = (userId: number, signal?: AbortSignal) => apiRequest<DashboardStatistics>('/admin/statistics/dashboard', { authenticated: true, expectedUserId: userId, signal });
export const getAdministrativeStatistics = (range: StatisticsRange, userId: number, signal?: AbortSignal) =>
  apiRequest<AdministrativeStatistics>('/admin/statistics?' + new URLSearchParams({ from: range.from, to: range.to }), { authenticated: true, expectedUserId: userId, signal });
