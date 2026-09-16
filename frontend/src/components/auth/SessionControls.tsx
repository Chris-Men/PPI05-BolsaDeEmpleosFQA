import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

/** Offers server-confirmed logout actions in candidate and administrative menus. */
export function SessionControls() {
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  /** Keeps a failed revocation visible instead of claiming the session was closed. */
  const close = async (all: boolean): Promise<void> => {
    if (busy) return;
    setBusy(true); setError('');
    try { await logout(all); }
    catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'No fue posible cerrar la sesión. Inténtalo de nuevo.');
    } finally { setBusy(false); }
  };

  return <div className="session-controls">
    <button type="button" disabled={busy} onClick={() => void close(false)}>Cerrar sesión</button>
    <button type="button" disabled={busy} onClick={() => void close(true)}>Cerrar todas mis sesiones</button>
    {error && <p role="alert">{error}</p>}
  </div>;
}
