import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../services/api';
import { createOrganization, updateOrganization } from '../../services/organizationService';
import type { ManagedOrganization } from '../../types/organization';
import { useBackdropClose } from '../../hooks/useBackdropClose';

interface OrganizationDialogProps {
  mode: 'create' | 'view' | 'edit';
  organization: ManagedOrganization | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Accessible modal for the API's editable fields; state changes use their own endpoint. */
export function OrganizationDialog({ mode, organization, onClose, onSaved }: OrganizationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const [form, setForm] = useState({ name: organization?.name ?? '', email: organization?.email ?? '', description: organization?.description ?? '' });
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const viewing = mode === 'view';

  // Click/tap outside behaves like "Cancelar"/"Cerrar"; blocked while saving.
  useBackdropClose(dialogRef, onClose, busy);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { dialog?.close(); };
  }, []);

  /** Prevents duplicate writes and retains the form if validation or persistence fails. */
  const save = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (submitting.current || viewing) return;
    if (form.name.trim().length < 2) { setFields({ name: 'Ingresa un nombre de al menos 2 caracteres.' }); return; }
    submitting.current = true; setBusy(true); setError(''); setFields({});
    const input = { name: form.name.trim(), email: form.email.trim() || null, description: form.description.trim() || null };
    try {
      if (organization) await updateOrganization(organization.id, input);
      else await createOrganization(input);
      onSaved();
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'No fue posible guardar la organización.');
      if (failure instanceof ApiError) setFields(Object.fromEntries(failure.validationErrors.map((field) => [field.field, field.message])));
    } finally { submitting.current = false; setBusy(false); }
  };

  return <dialog ref={dialogRef} className="organization-dialog" data-tone="safe" aria-labelledby="organization-title"
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <h2 id="organization-title" className="organization-dialog-title">
      {viewing ? 'Detalle de organización' : organization ? 'Editar organización' : 'Nueva organización'}
    </h2>
    <form onSubmit={(event) => void save(event)} aria-busy={busy} noValidate>
      {error && <p className="organization-dialog-error" role="alert">{error}</p>}
      {(['name', 'email', 'description'] as const).map((field) => <div className="organization-dialog-field" key={field}>
        <label htmlFor={'organization-' + field}>{field === 'name' ? 'Nombre' : field === 'email' ? 'Correo (opcional)' : 'Descripción (opcional)'}</label>
        {field === 'description' ? <textarea id={'organization-' + field} value={form[field]} maxLength={5000} readOnly={viewing} disabled={busy}
          onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
          : <input id={'organization-' + field} type={field === 'email' ? 'email' : 'text'} value={form[field]} required={field === 'name'}
            maxLength={field === 'name' ? 150 : 255} readOnly={viewing} disabled={busy} aria-invalid={Boolean(fields[field])}
            onChange={(event) => setForm({ ...form, [field]: event.target.value })} autoFocus={field === 'name' && !viewing} />}
        {fields[field] && <small role="alert">{fields[field]}</small>}
      </div>)}
      {organization && <p className="organization-dialog-meta">
        Estado: {organization.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
        {organization.createdAt && ' · Registrada: ' + new Date(organization.createdAt).toLocaleDateString('es-SV')}
      </p>}
      {!organization && <p className="organization-dialog-meta">La organización se creará activa.</p>}
      <div className="organization-dialog-actions">
        <button type="button" className="organization-dialog-button" data-role={viewing ? 'confirm' : 'cancel'}
          disabled={busy} onClick={onClose}>{viewing ? 'Cerrar' : 'Cancelar'}</button>
        {!viewing && <button type="submit" className="organization-dialog-button" data-role="confirm" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar'}
        </button>}
      </div>
    </form>
  </dialog>;
}
