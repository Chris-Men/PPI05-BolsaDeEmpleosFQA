import { useEffect, useRef, useState } from 'react';
import type { UserLifecycleAction } from '../../types/adminUser';
import '../../styles/users/accountActions.css';

interface AccountActionDialogProps {
  action: UserLifecycleAction;
  accountName: string;
  ownAccount?: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  onSuccess: () => void;
}

/** Accessible confirmation; deletion requires two separate, cancellable acknowledgements. */
export function AccountActionDialog({ action, accountName, ownAccount = false, onConfirm, onClose, onSuccess }: AccountActionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const submitting = useRef(false);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal(); cancelRef.current?.focus();
    return () => { dialog?.close(); };
  }, []);
  const deleting = action === 'DELETE';
  const title = deleting ? (step === 1 ? 'Eliminar cuenta: primera advertencia' : 'Eliminar cuenta: confirmación final')
    : action === 'DISABLE' ? 'Deshabilitar cuenta' : action === 'ENABLE' ? 'Rehabilitar cuenta' : 'Restaurar cuenta';
  /** Advances locally first; only the final acknowledgement sends the mutation. */
  const confirm = async (): Promise<void> => {
    if (submitting.current) return;
    if (deleting && step === 1) { setStep(2); cancelRef.current?.focus(); return; }
    submitting.current = true; setBusy(true); setError('');
    try { await onConfirm(); onSuccess(); }
    catch (failure: unknown) { setError(failure instanceof Error ? failure.message : 'No fue posible completar la acción. Inténtalo de nuevo.'); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <dialog className="account-action-dialog" ref={dialogRef} aria-labelledby="account-action-title"
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <h2 id="account-action-title">{title}</h2>
    <p><strong>{accountName}</strong></p>
    {deleting ? <>
      <p>{step === 1
        ? (ownAccount ? 'Esta acción es irreversible. Tu cuenta se eliminará y perderás el acceso a tu perfil y a tus postulaciones.'
          : 'Esta acción es irreversible. La cuenta se eliminará y la persona perderá el acceso a su perfil y a sus postulaciones.')
        : 'Confirma que deseas eliminar la cuenta. Esta acción es irreversible y se cerrarán todas sus sesiones.'}</p>
      <p className="account-action-note">Advertencia {step} de 2. La cuenta quedará eliminada de la plataforma.</p>
    </> : <p>{action === 'DISABLE' ? 'La persona no podrá iniciar sesión y sus sesiones actuales se cerrarán.'
      : action === 'ENABLE' ? 'La persona podrá iniciar sesión nuevamente. Sus sesiones anteriores seguirán cerradas.'
        : 'La cuenta volverá a estar activa con su correo original, siempre que ninguna otra cuenta lo esté usando. Será necesario iniciar sesión nuevamente.'}</p>}
    {error && <p className="account-action-error" role="alert">{error}</p>}
    <div className="account-action-buttons">
      <button type="button" ref={cancelRef} onClick={onClose} disabled={busy}>Cancelar</button>
      <button type="button" className={deleting || action === 'DISABLE' ? 'account-action-danger' : 'account-action-confirm'}
        disabled={busy} onClick={() => void confirm()}>
        {busy ? 'Procesando…' : deleting ? (step === 1 ? 'Continuar' : 'Confirmar eliminación')
          : action === 'DISABLE' ? 'Confirmar deshabilitación' : action === 'ENABLE' ? 'Confirmar rehabilitación' : 'Confirmar restauración'}
      </button>
    </div>
  </dialog>;
}
