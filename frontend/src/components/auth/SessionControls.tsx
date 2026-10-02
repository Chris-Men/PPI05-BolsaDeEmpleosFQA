import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface SessionControlsProps { showCurrent?: boolean; showAll?: boolean }

/** Offers server-confirmed logout actions where each control is needed. */
export function SessionControls({ showCurrent = true, showAll = true }: SessionControlsProps) {
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
    {showCurrent && <button type="button" disabled={busy} onClick={() => void close(false)}>Cerrar sesión</button>}
    {showAll && <button type="button" disabled={busy} onClick={() => void close(true)}>Cerrar todas mis sesiones</button>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
