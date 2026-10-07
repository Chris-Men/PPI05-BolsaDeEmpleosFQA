import { useEffect, useState } from 'react';
import { getOpportunityCatalogs, listManagedOpportunities, listOpportunities } from '../services/opportunityService';
import type { Opportunity, OpportunityCatalogs, OpportunityFilters, Page } from '../types/opportunity';

/** Request identity prevents a late response from overwriting newer filters or account data. */
export function useOpportunityListing(filters: OpportunityFilters, enabled = true, admin = false, accountId?: number) {
  const filterKey = JSON.stringify(filters);
  const identity = `${admin}-${accountId ?? ''}-${enabled}-${filterKey}`;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ identity: string; page: Page<Opportunity>; loading: boolean; error: string }>({ identity: '', page: { items: [], total: 0, page: 1, pageSize: 20 }, loading: true, error: '' });
  useEffect(() => {
    let current = true;
    if (!enabled) return;
    setState({ identity, page: { items: [], total: 0, page: 1, pageSize: 20 }, loading: true, error: '' });
    const timer = setTimeout(() => {
      const query = JSON.parse(filterKey) as OpportunityFilters;
      void (admin ? listManagedOpportunities(query) : listOpportunities(query)).then((page) => { if (current) setState({ identity, page, loading: false, error: '' }); })
        .catch((error: unknown) => { if (current) setState({ identity, page: { items: [], total: 0, page: 1, pageSize: 20 }, loading: false, error: error instanceof Error ? error.message : 'No se pudieron cargar las vacantes.' }); });
    }, 250);
    return () => { current = false; clearTimeout(timer); };
  }, [filterKey, identity, enabled, admin, revision]);
  const latest = state.identity === identity && enabled ? state : { identity, page: { items: [], total: 0, page: 1, pageSize: 20 }, loading: enabled, error: '' };
  return { ...latest, reload: () => setRevision((value) => value + 1) };
}

/** Public filter options come from the same persisted catalogs as the administrator editor. */
export function useOpportunityCatalogs() {
  const [catalogs, setCatalogs] = useState<OpportunityCatalogs | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let current = true;
    void getOpportunityCatalogs().then((value) => { if (current) { setCatalogs(value); setError(''); } }).catch((failure: unknown) => { if (current) setError(failure instanceof Error ? failure.message : 'No se pudieron cargar los filtros.'); });
    return () => { current = false; };
  }, [revision]);
  return { catalogs, error, reload: () => setRevision((value) => value + 1) };
}
