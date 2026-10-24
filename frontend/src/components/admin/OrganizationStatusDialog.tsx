import { useEffect, useId, useRef, useState } from 'react';
import { changeOrganizationStatus } from '../../services/organizationService';
import type { ManagedOrganization } from '../../types/organization';
import { useBackdropClose } from '../../hooks/useBackdropClose';

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

  // Click/tap outside behaves like "Cancelar"; blocked while the request is running.
  useBackdropClose(dialogRef, onClose, busy);

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

  return <dialog ref={dialogRef} className="organization-dialog organization-confirm-dialog"
    data-tone={deactivating ? 'danger' : 'safe'}
    aria-labelledby={titleId} aria-describedby={questionId} aria-busy={busy}
    onCancel={(event) => { event.preventDefault(); if (!submitting.current) onClose(); }}>
    <h2 id={titleId} className="organization-dialog-title">{deactivating ? 'Desactivar organización' : 'Activar organización'}</h2>
    <p id={questionId} className="organization-dialog-text">
      ¿Deseas {deactivating ? 'desactivar' : 'activar'} <strong>{organization.name}</strong>?
    </p>
    {error && <p className="organization-dialog-error" role="alert">{error}</p>}
    {busy && <p className="organization-dialog-text" role="status">Actualizando el estado…</p>}
    <div className="organization-dialog-actions">
      <button ref={cancelRef} type="button" className="organization-dialog-button" data-role="cancel" disabled={busy} onClick={onClose}>
        Cancelar
      </button>
      <button type="button" className="organization-dialog-button" data-role="confirm" disabled={busy} onClick={() => void confirm()}>
        {busy ? 'Actualizando…' : 'Confirmar'}
      </button>
    </div>
  </dialog>;
}
