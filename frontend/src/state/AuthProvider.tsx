import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { sessionStore } from '../services/sessionStore';

import { AuthContext } from './authContext';

interface AuthProviderProps { children: ReactNode }

/** Restores the cookie session and keeps current access synchronized with the server. */
export function AuthProvider({ children }: AuthProviderProps) {
  const snapshot = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot);
  useEffect(() => {
    void sessionStore.bootstrap();
    const check = (): void => { if (document.visibilityState === 'visible') void sessionStore.validate(); };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  useEffect(() => {
    if (snapshot.status !== 'authenticated') return;
    const remaining = snapshot.accessExpiresAt - Date.now();
    // Near the absolute session limit, wait for expiry instead of rotating every second.
    const delay = remaining > 30_000 ? remaining - 30_000 : Math.max(1000, remaining + 100);
    const timer = window.setTimeout(() => { void sessionStore.validate(); }, delay);
    return () => window.clearTimeout(timer);
  }, [snapshot.status, snapshot.accessExpiresAt]);
  return <AuthContext.Provider value={snapshot}>{children}</AuthContext.Provider>;
}

