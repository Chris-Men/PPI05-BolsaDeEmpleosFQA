import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../services/api';
/** A privileged operation executes only after an explicit modal confirmation. */
interface VacancyActionDialogProps { title: string; description: string; onConfirm: () => Promise<void>; onCancel: () => void }
/** Native modal traps focus and keeps recoverable server failures visible inside the dialog. */
export function VacancyActionDialog({ title, description, onConfirm, onCancel }: VacancyActionDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const trigger = document.activeElement;
    const modal = dialog.current;
    modal?.showModal();
    return () => { modal?.close(); if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus(); };
  }, []);
  const confirm = async (): Promise<void> => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await onConfirm(); }
    catch (failure: unknown) { setError(failure instanceof ApiError && failure.validationErrors.length > 0 ? failure.validationErrors.map((item) => item.message).join(' ') : failure instanceof Error ? failure.message : 'No fue posible completar el cambio.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <dialog ref={dialog} className="vacancy-dialog" aria-labelledby="vacancy-action-title" onCancel={(event) => { event.preventDefault(); if (!lock.current) onCancel(); }}>
    <h2 id="vacancy-action-title">{title}</h2><p>{description}</p>
    {error && <p role="alert">{error}</p>}
    <div className="vacancy-actions"><button type="button" autoFocus disabled={busy} onClick={onCancel}>Cancelar</button><button type="button" disabled={busy} onClick={() => void confirm()}>{busy ? 'Procesando…' : 'Confirmar'}</button></div>
  </dialog>;
}
