/** Only a public vacancy key is preserved during anonymous login/registration; no identity enters the URL. */
export const getSavedIntent = (): string | null => {
  if (typeof window === 'undefined') return null;
  const key = new URLSearchParams(window.location.search).get('guardar');
  return key && /^(job|volunteer)-[1-9]\d*$/.test(key) && Number(key.split('-')[1]) <= 2147483647 ? key : null;
};
/** Removes a consumed or cancelled save request without changing other navigation parameters. */
export const clearSavedIntent = (): void => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('guardar')) return;
  url.searchParams.delete('guardar'); window.history.replaceState(null, '', url);
};
/** Starts an explicit anonymous save action; mutually exclusive application intents are discarded. */
export const setSavedIntent = (key: string): void => {
  const url = new URL(window.location.href);
  url.searchParams.set('guardar', key); url.searchParams.delete('postular'); url.searchParams.delete('postulacion');
  window.history.replaceState(null, '', url);
};
