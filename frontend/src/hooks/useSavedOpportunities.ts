import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { SavedOpportunitiesContext } from '../state/savedOpportunitiesContext';
import type { CurrentAccess } from '../types/auth';
import type { SavedOpportunityKeys } from '../types/savedOpportunity';
import { changeSavedOpportunity, getSavedOpportunityKeys } from '../services/savedOpportunityService';
import { ApiError } from '../services/api';

/** Mounted once inside the account-scoped public app; cancelled requests cannot update a later identity. */
export function useSavedOpportunities(session: CurrentAccess | null) {
  const userId = session?.userId;
  const candidate = Boolean(session?.roles.length && session.roles.every(role => role === 'CANDIDATE'));
  const canRead = candidate && Boolean(session?.permissions.includes('saved-opportunities.read.own'));
  const canUpdate = canRead && Boolean(session?.permissions.includes('saved-opportunities.update.own'));
  const [result, setResult] = useState<SavedOpportunityKeys | null>(null);
  const [loading, setLoading] = useState(canRead);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [mutationErrors, setMutationErrors] = useState<ReadonlyMap<string, string>>(new Map());
  const mounted = useRef(false);
  const requests = useRef(new Set<AbortController>());
  const mutations = useRef(new Map<string, Promise<void>>());
  const readGeneration = useRef(0);
  useEffect(() => {
    mounted.current = true;
    const controllers = requests.current;
    return () => { mounted.current = false; controllers.forEach(controller => controller.abort()); controllers.clear(); };
  }, []);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const generation = ++readGeneration.current;
    if (!canRead || !userId) { setResult(null); setLoading(false); setError(''); return; }
    const controller = new AbortController(); const controllers = requests.current; controllers.add(controller);
    setLoading(true); setError('');
    void getSavedOpportunityKeys(userId, controller.signal).then(value => {
      if (!controller.signal.aborted && generation === readGeneration.current) setResult(value);
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted && generation === readGeneration.current) setError(failure instanceof Error ? failure.message : 'No se pudieron cargar las guardadas.');
    }).finally(() => {
      controllers.delete(controller);
      if (!controller.signal.aborted && generation === readGeneration.current) setLoading(false);
    });
    return () => { controller.abort(); controllers.delete(controller); };
  }, [canRead, userId, revision]);
  useEffect(() => {
    if (!canRead) return;
    const refresh = (): void => { if (!document.hidden) reload(); };
    window.addEventListener('focus', refresh); const timer = setInterval(refresh, 30000);
    return () => { window.removeEventListener('focus', refresh); clearInterval(timer); };
  }, [canRead, reload]);

  /** Serializes each key and changes local markers only after the server confirms persistence. */
  const change = useCallback((key: string, saved: boolean): Promise<void> => {
    const existing = mutations.current.get(key); if (existing) return existing;
    if (!userId || !canUpdate) return Promise.reject(new ApiError('No tienes permiso para cambiar tus guardadas.', 403));
    const controller = new AbortController(); requests.current.add(controller);
    setPending(value => new Set(value).add(key));
    setMutationErrors(value => { const next = new Map(value); next.delete(key); return next; });
    const operation = changeSavedOpportunity(key, saved, userId, controller.signal).then(() => {
      if (!mounted.current || controller.signal.aborted) throw new ApiError('La solicitud fue cancelada.', 0);
      // Invalidate older collection reads immediately, before React commits this mutation.
      readGeneration.current += 1;
      setResult(value => {
        if (!value) return value;
        const keys = new Set(value.keys); if (saved) keys.add(key); else keys.delete(key);
        return { keys: [...keys], total: keys.size };
      });
      reload();
    }).catch((failure: unknown) => {
      if (mounted.current && !controller.signal.aborted) setMutationErrors(value => new Map(value).set(key, failure instanceof Error ? failure.message : 'No se pudo actualizar la guardada.'));
      throw failure;
    }).finally(() => {
      mutations.current.delete(key); requests.current.delete(controller);
      if (mounted.current && !controller.signal.aborted) setPending(value => { const next = new Set(value); next.delete(key); return next; });
    });
    mutations.current.set(key, operation);
    return operation;
  }, [userId, canUpdate, reload]);
  return { userId, canRead, canUpdate, keys: new Set(canRead ? result?.keys : []), total: canRead ? result?.total ?? null : null,
    loading, error, pending, mutationErrors, revision, change, reload };
}

/** Consumers share one collection instead of fetching and mutating independent favorite lists. */
export function useSavedOpportunityState() {
  const state = useContext(SavedOpportunitiesContext);
  if (!state) throw new Error('El estado de guardados no está disponible.');
  return state;
}
