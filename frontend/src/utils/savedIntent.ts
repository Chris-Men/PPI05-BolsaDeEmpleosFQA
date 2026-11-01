/** Only a public vacancy key is preserved during anonymous login/registration; no identity enters the URL. */
export const getSavedIntent = (): string | null => {
  if (typeof window === 'undefined') return null;
  const key = new URLSearchParams(window.location.search).get('guardar');
  return key && /^(job|volunteer)-[1-9]\d*$/.test(key) && Number(key.split('-')[1]) <= 2147483647 ? key : null;
};
type IntentWriter = (update: (query: URLSearchParams) => URLSearchParams) => void;
let writer: IntentWriter | null = null;
/** Session events share the router's query writer instead of overwriting its history metadata. */
export const configureSavedIntentNavigation = (next: IntentWriter | null): void => { writer = next; };
/** Removes a consumed or cancelled save request without changing other navigation parameters. */
export const clearSavedIntent = (): void => {
  writer?.(query => { query.delete('guardar'); return query; });
};
/** Starts an explicit anonymous save action; mutually exclusive application intents are discarded. */
export const setSavedIntent = (key: string): void => {
  writer?.(query => { query.set('guardar', key); query.delete('postular'); query.delete('postulacion'); return query; });
};
