import { ApiError, configureAuthentication } from './api';
import { getCurrentAccess, loginAccount, logoutAccount, refreshAccount, registerCandidate } from './authService';
import type { AuthenticationResponse, LoginRequest, RegisterCandidateRequest } from '../types/auth';

/** In-memory access credential and public identity. Refresh tokens stay in HttpOnly cookies. */
export interface SessionSnapshot {
  status: 'loading' | 'authenticated' | 'anonymous' | 'error';
  session: AuthenticationResponse | null;
  accessExpiresAt: number;
  error: string;
}
let snapshot: SessionSnapshot = { status: 'loading', session: null, accessExpiresAt: 0, error: '' };
const listeners = new Set<() => void>();
const channel = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('fqa-auth-session') : null;
let refreshPromise: Promise<void> | undefined;
let bootstrapPromise: Promise<void> | undefined;

/** Notifies React subscribers and optionally other tabs without persisting credentials. */
const publish = (next: SessionSnapshot, broadcast = true): void => {
  snapshot = next;
  listeners.forEach((listener) => listener());
  if (broadcast) channel?.postMessage(next);
};

/** Serializes every cookie mutation across tabs on supported secure browser origins. */
const withSessionLock = async <T,>(operation: () => Promise<T>): Promise<T> => {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return await navigator.locks.request('fqa-auth-cookie', operation);
  }
  return Promise.reject(new ApiError('Usa un navegador actualizado y una conexión segura para iniciar sesión.', 0));
};

/** Publishes a successful authentication response with an absolute access expiry. */
const accept = (session: AuthenticationResponse): void => publish({
  status: 'authenticated', session, accessExpiresAt: Date.now() + session.expiresIn * 1000, error: '',
});

/** Clears all in-memory credentials and notifies other tabs. */
const invalidate = (): void => publish({
  status: 'anonymous', session: null, accessExpiresAt: 0, error: '',
});

/** Preserves a recoverable session on network failures; invalid credentials are cleared. */
const fail = (error: unknown): void => {
  if (error instanceof ApiError && error.status === 401) invalidate();
  else publish({ ...snapshot, status: 'error',
    error: error instanceof Error ? error.message : 'No fue posible verificar la sesión.' }, false);
};

/** Coalesces renewals, then rotates under the shared browser lock. */
const renew = (force = false): Promise<void> => {
  if (refreshPromise) return refreshPromise;
  const previousToken = snapshot.session?.accessToken;
  refreshPromise = withSessionLock(async () => {
    // A sibling tab may have renewed while this tab was waiting for the lock.
    if (snapshot.session && snapshot.accessExpiresAt > Date.now() + 30_000 &&
      (!force || snapshot.session.accessToken !== previousToken)) return;
    accept(await refreshAccount());
  }).catch((error: unknown) => { fail(error); throw error; })
    .finally(() => { refreshPromise = undefined; });
  return refreshPromise;
};

if (channel) channel.onmessage = (event: MessageEvent<SessionSnapshot>): void => {
  const next = event.data;
  if (next && (next.status === 'anonymous' ||
    (next.status === 'authenticated' && typeof next.session?.accessToken === 'string'))) {
    publish(next, false);
  }
};

configureAuthentication({
  getToken: () => snapshot.session?.accessToken,
  refresh: () => renew(true),
  invalidate,
});

/** Framework-independent session lifecycle used by the auth provider. */
export const sessionStore = {
  /** Reads the stable snapshot expected by useSyncExternalStore. */
  getSnapshot: (): SessionSnapshot => snapshot,
  /** Registers a state observer. */
  subscribe(listener: () => void): () => void {
    listeners.add(listener); return () => { listeners.delete(listener); };
  },
  /** Restores at most once on startup, including React StrictMode's remount. */
  bootstrap(): Promise<void> {
    bootstrapPromise ??= renew().catch(() => undefined);
    return bootstrapPromise;
  },
  /** Retries transient startup or renewal failures. */
  async retry(): Promise<void> {
    publish({ ...snapshot, status: 'loading', error: '' }, false);
    try { await renew(true); } catch { /* The error is represented by the snapshot. */ }
  },
  /** Establishes a session after validating an existing account. */
  async login(payload: LoginRequest): Promise<void> {
    await withSessionLock(async () => { accept(await loginAccount(payload)); });
  },
  /** Registers and immediately establishes the candidate's session. */
  async register(payload: RegisterCandidateRequest): Promise<void> {
    await withSessionLock(async () => { accept(await registerCandidate(payload)); });
  },
  /** Renews before expiry and validates server-side revocation when the tab regains focus. */
  async validate(): Promise<void> {
    if (!snapshot.session) return;
    let validatingToken: string | undefined;
    try {
      await renew();
      validatingToken = snapshot.session?.accessToken;
      const access = await getCurrentAccess();
      if (snapshot.session?.accessToken === validatingToken && snapshot.session) publish({
        ...snapshot, session: { ...snapshot.session, ...access }, status: 'authenticated', error: '',
      }, false);
    } catch (error: unknown) {
      if (snapshot.session?.accessToken === validatingToken) fail(error);
    }
  },
  /** Revokes remotely before declaring logout successful. */
  async logout(all = false): Promise<void> {
    // Renew before taking the mutation lock; logout-all uses an access JWT.
    if (all) await renew();
    await withSessionLock(async () => {
      // Disable transport renewal here to avoid recursively acquiring the same lock.
      await logoutAccount(all);
      invalidate();
    });
  },
};
