import { useCallback, useMemo, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigation } from './useNavigation';
import { readRouteQuery, writeRouteQuery, type QueryRules } from '../utils/routeQuery';

/** DTO-shaped filters follow URLs; search drafts replace after 300 ms, selections and pages push. */
export function useRouteQuery<T extends object>(defaults: T, rules: QueryRules<T> = {}, enabled = true): [T, Dispatch<SetStateAction<T>>, (value: T) => void] {
  const { location, query } = useNavigation();
  const definition = JSON.stringify({ fields: Object.keys(defaults), defaults, rules });
  const parsed = useMemo(() => {
    const schema = JSON.parse(definition) as { fields: (keyof T)[]; defaults: T; rules: QueryRules<T> };
    const initial = Object.fromEntries(schema.fields.map(field => [field, schema.defaults[field]])) as T;
    return readRouteQuery(new URLSearchParams(location.search), initial, schema.rules);
  }, [definition, location.search]);
  const [draft, setDraft] = useState<{ key: string; value: T } | null>(null);
  const value = draft?.key === location.key ? draft.value : parsed;
  const current = useRef({ value, defaults, rules, location }); current.current = { value, defaults, rules, location };
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    setDraft(existing => existing?.key === location.key ? existing : null);
    return () => clearTimeout(timer.current);
  }, [location.key]);
  const normalized = writeRouteQuery(new URLSearchParams(location.search), parsed, defaults, rules).toString();
  useEffect(() => {
    if (enabled && normalized !== location.search.replace(/^\?/, '')) query(previous => {
      const snapshot = current.current;
      return writeRouteQuery(previous, readRouteQuery(previous, snapshot.defaults, snapshot.rules), snapshot.defaults, snapshot.rules);
    }, true);
  }, [normalized, location.search, query, enabled]);
  /** Correction replaces history; user changes use the setter returned alongside it. */
  const replace = useCallback((next: T): void => {
    clearTimeout(timer.current); setDraft(null); const snapshot = current.current;
    current.current.value = next;
    query(previous => writeRouteQuery(previous, next, snapshot.defaults, snapshot.rules), true);
  }, [query]);
  const setValue: Dispatch<SetStateAction<T>> = useCallback(update => {
    const snapshot = current.current;
    const next = typeof update === 'function' ? (update as (previous: T) => T)(snapshot.value) : update;
    const changes = Object.keys(next).filter(key => next[key as keyof T] !== snapshot.value[key as keyof T]);
    clearTimeout(timer.current); current.current.value = next;
    const commit = (replaceEntry: boolean) => { setDraft(null); query(previous => writeRouteQuery(previous, next, snapshot.defaults, snapshot.rules), replaceEntry); };
    if (changes.some(key => key === 'search' || key === 'location') && changes.every(key => key === 'search' || key === 'location' || key === 'page')) {
      setDraft({ key: snapshot.location.key, value: next }); timer.current = setTimeout(() => commit(true), 300);
    } else commit(false);
  }, [query]);
  return [value, setValue, replace];
}
