import { useEffect, useId, useRef, useState } from 'react';
import { changeOrganizationStatus } from '../../services/organizationService';
import type { ManagedOrganization } from '../../types/organization';

interface OrganizationStatusDialogProps {
  organization: ManagedOrganization;
  onClose: () => void;
  onSaved: () => void;
}

/** Confirms a state change above the page and keeps recoverable failures inside the modal. */
export function OrganizationStatusDialog({ organization, onClose, onSaved }: OrganizationStatusDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const submitting = useRef(false);
  const titleId = useId();
  const questionId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const deactivating = organization.status === 'ACTIVE';

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

  // Restore focus only after the failed request has re-enabled the cancel button.
  useEffect(() => { if (error && !busy) cancelRef.current?.focus(); }, [error, busy]);

  /** Prevents repeated writes and retains the confirmation when the request fails. */
  const confirm = async (): Promise<void> => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      await changeOrganizationStatus(organization.id, deactivating ? 'INACTIVE' : 'ACTIVE');
      onSaved();
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'No fue posible cambiar el estado.');
    } finally { submitting.current = false; setBusy(false); }
  };

  return <dialog ref={dialogRef} className="organizaciones-modal organizations-dialog"
    aria-labelledby={titleId} aria-describedby={questionId} aria-busy={busy}
    onCancel={(event) => { event.preventDefault(); if (!submitting.current) onClose(); }}>
    <div className="organizaciones-modal-header">
      <h2 id={titleId}>{deactivating ? 'Desactivar organización' : 'Activar organización'}</h2>
      <button type="button" className="organizaciones-modal-close" disabled={busy} onClick={onClose} aria-label="Cerrar">×</button>
    </div>
    <div className="organizaciones-modal-body">
      <p id={questionId}>¿Deseas {deactivating ? 'desactivar' : 'activar'} <strong>{organization.name}</strong>?</p>
      {error && <p className="organizations-error" role="alert">{error}</p>}
      {busy && <p role="status">Actualizando el estado…</p>}
    </div>
    <div className="organizaciones-modal-footer">
      <button ref={cancelRef} type="button" className="modal-secondary-button" disabled={busy} onClick={onClose}>Cancelar</button>
      <button type="button" className="modal-primary-button" disabled={busy} onClick={() => void confirm()}>
        {busy ? 'Actualizando…' : 'Confirmar'}
      </button>
    </div>
  </dialog>;
}
