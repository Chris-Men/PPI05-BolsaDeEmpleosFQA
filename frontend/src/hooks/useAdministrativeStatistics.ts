import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { canReadStatistics } from '../utils/siteManagement';
import { getAdministrativeStatistics, getDashboardStatistics } from '../services/statisticsService';
import type { AdministrativeStatistics, DashboardStatistics, StatisticsRange } from '../types/statistics';

/** Responses are scoped to both account and range, including rapid date changes and logout. */
function useStatisticsData<T>(identity: string, allowed: boolean, load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<{ identity: string; data: T | null; loading: boolean; error: string }>({ identity, data: null, loading: allowed, error: '' });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    setState({ identity, data: null, loading: true, error: '' });
    void load(controller.signal).then(data => { if (!controller.signal.aborted) setState({ identity, data, loading: false, error: '' }); })
      .catch((failure: unknown) => { if (!controller.signal.aborted) setState({ identity, data: null, loading: false, error: failure instanceof Error ? failure.message : 'No se pudieron cargar los indicadores.' }); });
    return () => controller.abort();
  }, [identity, allowed, load, revision]);
  return { ...(allowed && state.identity === identity ? state : { identity, data: null, loading: allowed, error: allowed ? '' : 'No tienes permiso para consultar estadísticas.' }), reload };
}

/** Dashboard aggregates are not coupled to the vacancy management list. */
export function useDashboardStatistics() {
  const { session } = useAuth(); const userId = session?.userId ?? 0;
  const load = useCallback((signal: AbortSignal) => getDashboardStatistics(userId, signal), [userId]);
  return useStatisticsData<DashboardStatistics>(String(userId), canReadStatistics(session), load);
}

/** Calendar filters stay in the API layer; the browser never recomputes totals from rows. */
export function useAdministrativeStatistics(range: StatisticsRange) {
  const { session } = useAuth(); const userId = session?.userId ?? 0;
  const { from, to } = range;
  const load = useCallback((signal: AbortSignal) => getAdministrativeStatistics({ from, to }, userId, signal), [from, to, userId]);
  return useStatisticsData<AdministrativeStatistics>(userId + ':' + from + ':' + to, canReadStatistics(session), load);
}
