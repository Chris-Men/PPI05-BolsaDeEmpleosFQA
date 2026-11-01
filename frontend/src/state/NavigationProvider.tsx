import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useBlocker, useLocation, useNavigate, useNavigationType } from 'react-router';
import { NavigationContext, type NavigationGuard } from './navigationContext';
import { resolveRoute } from '../utils/routes';
import { useModalDialog } from '../hooks/useModalDialog';
import { configureSavedIntentNavigation } from '../utils/savedIntent';
import { sessionStore } from '../services/sessionStore';
import '../styles/users/accountActions.css';
import '../styles/components/navigation.css';

interface NavigationProviderProps { children: ReactNode }
interface PendingLeave { busy: boolean; proceed: () => void; cancel: () => void }
interface DiscardDialogProps { pending: PendingLeave }

/** Reuses confirmation styling while keeping the native dialog above the editor and restoring focus. */
function DiscardDialog({ pending }: DiscardDialogProps) {
  const dialog = useModalDialog();
  const titleId = useId();
  const descriptionId = useId();
  return <dialog ref={dialog} className="account-action-dialog navigation-dialog"
    aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={event => { event.preventDefault(); pending.cancel(); }}>
    <h2 id={titleId}>{pending.busy ? 'Espera a que termine la operación' : 'Hay cambios sin guardar'}</h2>
    <p id={descriptionId}>{pending.busy ? 'La operación en curso debe terminar antes de salir.' : 'Puedes seguir editando o descartar los cambios y salir.'}</p>
    <div className="account-action-buttons">
      <button type="button" autoFocus onClick={pending.cancel}>Seguir editando</button>
      {!pending.busy && <button type="button" className="account-action-danger" onClick={pending.proceed}>Descartar cambios y salir</button>}
    </div>
  </dialog>;
}

/** Browser navigation, async draft flushing and local discard actions use the same gate. */
export function NavigationProvider({ children }: NavigationProviderProps) {
  const navigate = useNavigate(); const location = useLocation(); const action = useNavigationType();
  const locationRef = useRef(location); locationRef.current = location;
  const scroll = useRef(new Map<string, number>());
  const focus = useRef(new Map<string, HTMLElement>());
  const previous = useRef(location);
  /** Record before React can shorten the document and clamp its scroll position. */
  const remember = useCallback(() => {
    scroll.current.set(previous.current.key, window.scrollY);
    if (document.activeElement instanceof HTMLElement) focus.current.set(previous.current.key, document.activeElement);
  }, []);
  const guards = useRef(new Map<string, NavigationGuard>());
  const [pending, setPending] = useState<PendingLeave | null>(null);
  const [error, setError] = useState(''); const transitioning = useRef(false);
  const register = useCallback((id: string, guard: NavigationGuard | null) => {
    if (guard) guards.current.set(id, guard); else guards.current.delete(id);
  }, []);
  const clear = useCallback((id: string) => { guards.current.delete(id); }, []);
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search) &&
    [...guards.current.values()].some(guard => guard.dirty || guard.busy));

  const prepare = useCallback(async (entries: NavigationGuard[], proceed: () => void, cancel: () => void) => {
    setError('');
    if (entries.some(entry => entry.busy || entry.dirty && !entry.flush)) {
      setPending({ busy: entries.some(entry => entry.busy),
        proceed: () => { setPending(null); proceed(); }, cancel: () => { setPending(null); cancel(); } });
      return;
    }
    try { for (const entry of entries) if (entry.flush) await entry.flush(); proceed(); }
    catch (failure: unknown) { setError(failure instanceof Error ? failure.message : 'No fue posible guardar los cambios.'); cancel(); }
  }, []);

  useEffect(() => {
    if (blocker.state !== 'blocked') { transitioning.current = false; return; }
    if (transitioning.current) return; transitioning.current = true;
    void prepare([...guards.current.values()].filter(entry => entry.dirty || entry.busy),
      () => { blocker.proceed(); }, () => { blocker.reset(); });
  }, [blocker, prepare]);

  const go = useCallback((path: string, replace = false) => {
    remember();
    void navigate(path, { replace, state: { appNavigation: true } });
  }, [navigate, remember]);
  const back = useCallback((fallback: string) => {
    remember();
    const state: unknown = locationRef.current.state;
    if (state && typeof state === 'object' && 'appNavigation' in state && state.appNavigation === true && window.history.state?.idx > 0) void navigate(-1);
    else go(fallback, true);
  }, [go, navigate, remember]);
  const query = useCallback((update: (query: URLSearchParams) => URLSearchParams, replace = false) => {
    const current = locationRef.current; const search = update(new URLSearchParams(current.search)).toString();
    const target = current.pathname + (search ? '?' + search : '');
    if (target !== current.pathname + current.search) {
      locationRef.current = { ...current, search: search ? '?' + search : '' }; go(target, replace);
    }
  }, [go]);
  const leave = useCallback((id: string, callback: () => void) => {
    const guard = guards.current.get(id);
    const proceed = () => { guards.current.delete(id); callback(); };
    if (!guard || !guard.dirty && !guard.busy) { proceed(); return; }
    void prepare([guard], proceed, () => undefined);
  }, [prepare]);
  const run = useCallback((callback: () => Promise<void>): Promise<boolean> => new Promise((resolve, reject) => {
    const identity = sessionStore.getSnapshot().session?.userId;
    void prepare([...guards.current.values()].filter(entry => entry.dirty || entry.busy),
      () => {
        if (sessionStore.getSnapshot().session?.userId !== identity) { resolve(false); return; }
        const registered = [...guards.current.keys()]; const operation = crypto.randomUUID();
        guards.current.set(operation, { dirty: false, busy: true });
        void callback().then(() => {
          guards.current.delete(operation); registered.forEach(id => guards.current.delete(id));
          setPending(null); resolve(true);
        }, failure => { guards.current.delete(operation); reject(failure); });
      }, () => resolve(false));
  }), [prepare]);
  useLayoutEffect(() => {
    configureSavedIntentNavigation(update => query(update, true));
    return () => configureSavedIntentNavigation(null);
  }, [query]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent): void => {
      if ([...guards.current.values()].some(entry => entry.dirty || entry.busy)) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, []);
  useEffect(() => {
    const restoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    const track = () => scroll.current.set(previous.current.key, window.scrollY);
    window.addEventListener('scroll', track, { passive: true });
    window.addEventListener('popstate', remember);
    return () => {
      window.history.scrollRestoration = restoration;
      window.removeEventListener('scroll', track); window.removeEventListener('popstate', remember);
    };
  }, [remember]);
  useLayoutEffect(() => {
    const old = previous.current; previous.current = location;
    if (old.key === location.key) return;
    const y = action === 'POP' ? scroll.current.get(location.key) ?? 0 : old.pathname === location.pathname ? scroll.current.get(old.key) ?? 0 : 0;
    const deadline = Date.now() + 3000; let frame = 0;
    const restore = () => {
      window.scrollTo(0, y);
      if (window.scrollY < y && Date.now() < deadline) frame = requestAnimationFrame(restore);
      else if (old.pathname !== location.pathname && !document.querySelector('dialog[open]')) {
        const trigger = action === 'POP' ? focus.current.get(location.key) : undefined;
        const target = trigger?.isConnected ? trigger : document.querySelector<HTMLElement>('main h1, .screen-container h1, .screen-container h2, .content h1, .content h2');
        if (target) { if (!trigger?.isConnected) target.tabIndex = -1; target.focus({ preventScroll: true }); }
      }
    };
    frame = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(frame);
  }, [location, action]);

  return <NavigationContext.Provider value={{ route: resolveRoute(location.pathname), location, go, back, query, register, clear, leave, run }}>
    {error && <div role="alert" className="navigation-error">{error}<button type="button" onClick={() => setError('')}>Cerrar aviso</button></div>}
    {children}{pending && <DiscardDialog pending={pending} />}
  </NavigationContext.Provider>;
}
