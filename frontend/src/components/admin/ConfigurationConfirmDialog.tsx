import { useEffect, useId, useRef } from 'react';
import { useBackdropClose } from '../../hooks/useBackdropClose';
import '../../styles/admin/configuracion.css';

interface ConfigurationConfirmDialogProps {
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  /** Destructive actions use Cancel green / Confirm red; normal ones the inverse. */
  danger?: boolean;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Native modal alert; tapping outside or pressing Esc behaves like "cancel" unless a request is running. */
export function ConfigurationConfirmDialog({
  title, description, cancelLabel, confirmLabel, danger = true, busy = false, error = '', onConfirm, onCancel,
}: ConfigurationConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useBackdropClose(dialogRef, onCancel, busy);

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    dialog?.showModal();
    cancelRef.current?.focus();
    return () => {
      dialog?.close();
      // React may detach the dialog before close can restore its native focus target.
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

  // Return focus to "cancel" after a failed request re-enables the buttons.
  useEffect(() => { if (error && !busy) cancelRef.current?.focus(); }, [error, busy]);

  return <dialog ref={dialogRef} className="configuration-dialog" data-tone={danger ? 'danger' : 'safe'}
    aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={busy}
    onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id={titleId}>{title}</h2>
    <p id={descriptionId}>{description}</p>
    {error && <p className="configuration-dialog-error" role="alert">{error}</p>}
    <div className="configuration-dialog-actions">
      <button ref={cancelRef} type="button" data-role="cancel" disabled={busy} onClick={onCancel}>{cancelLabel}</button>
      <button type="button" data-role="confirm" disabled={busy} onClick={onConfirm}>{busy ? 'Procesando…' : confirmLabel}</button>
    </div>
  </dialog>;
}
