let credential = '';

/** Capture once before session bootstrap; never put a reset credential in router history state. */
export function captureResetCredential(): void {
  if (typeof window === 'undefined' || window.location.pathname !== '/reset-password') return;
  const url = new URL(window.location.href); const token = url.searchParams.get('token');
  if (token === null) return;
  credential = token.trim(); url.searchParams.delete('token');
  window.history.replaceState(window.history.state, '', url.pathname + url.search);
}
/** A reload of the sanitized URL intentionally requires a fresh recovery link. */
export const getResetCredential = (): string => credential;
/** Successful recovery or explicit exit discards the in-memory credential. */
export const clearResetCredential = (): void => { credential = ''; };
