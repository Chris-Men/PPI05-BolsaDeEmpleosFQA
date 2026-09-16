import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AssignableRole, ManagedUser, UserFormValues } from '../../types/adminUser';
import { ApiError } from '../../services/api';
import { createUser, updateUser } from '../../services/adminUserService';
import { getAccountIdentityValidationError, getRegistrationValidationError } from '../../validation/register';
import { buildUserUpdate, ROLE_LABELS } from '../../utils/userManagement';

interface UserFormDialogProps {
  user: ManagedUser | null;
  creationRoles: AssignableRole[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** Native modal keeps focus inside the form and reuses the existing administrative design. */
export function UserFormDialog({ user, creationRoles, onClose, onSaved }: UserFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const [form, setForm] = useState<UserFormValues>({
    fullName: user?.fullName ?? '', email: user?.email ?? '', password: '',
    role: user ? (user.roles.length === 1 && user.roles[0] !== 'SUPER_ADMIN' ? user.roles[0] : '')
      : creationRoles[0] ?? '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    firstInputRef.current?.focus();
    return () => { dialog?.close(); };
  }, []);

  /** Sends only the fields allowed for the chosen operation and prevents duplicate submissions. */
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (submitting.current) return;
    const validation = user
      ? getAccountIdentityValidationError(form.fullName, form.email)
      : getRegistrationValidationError({
        name: form.fullName, email: form.email, password: form.password, confirmPassword: form.password,
      });
    if (validation) { setError(validation); return; }
    if (!user && !form.role) { setError('Selecciona un rol para la cuenta.'); return; }
    const patch = user ? buildUserUpdate(user, form) : null;
    if (patch && Object.keys(patch).length === 0) { setError('No hay cambios para guardar.'); return; }
    submitting.current = true; setBusy(true); setError('');
    try {
      if (user && patch) await updateUser(user.id, patch);
      else if (form.role) await createUser({
        fullName: form.fullName.trim(), email: form.email.trim().toLowerCase(), password: form.password, role: form.role,
      });
      const revoked = Boolean(patch && ('email' in patch || 'role' in patch));
      onSaved(user
        ? 'Usuario actualizado correctamente.' + (revoked ? ' Sus sesiones se cerraron; deberá iniciar sesión nuevamente.' : '')
        : 'Usuario creado correctamente.');
    } catch (failure: unknown) {
      setError(failure instanceof ApiError
        ? failure.validationErrors[0]?.message ?? failure.message : 'No fue posible guardar el usuario.');
    } finally { submitting.current = false; setBusy(false); }
  };

  const roles: AssignableRole[] = user ? ['CANDIDATE', 'ADMINISTRATOR'] : creationRoles;
  return <dialog className="usuarios-modal users-dialog" ref={dialogRef} aria-labelledby="user-dialog-title"
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="usuarios-modal-header">
      <div><span>Gestión de usuarios</span><h3 id="user-dialog-title">{user ? 'Editar usuario' : 'Nuevo usuario'}</h3></div>
      <button type="button" className="usuarios-modal-close" onClick={onClose} disabled={busy} aria-label="Cerrar formulario">×</button>
    </div>
    <form className="usuarios-form" onSubmit={submit} noValidate aria-busy={busy}>
      {error && <p role="alert" className="users-error">{error}</p>}
      <div className="usuarios-form-field">
        <label htmlFor="managed-name">Nombre completo</label>
        <input id="managed-name" ref={firstInputRef} value={form.fullName} maxLength={150} required disabled={busy}
          onChange={(event) => setForm({ ...form, fullName: event.target.value })} autoComplete="off" />
      </div>
      <div className="usuarios-form-field">
        <label htmlFor="managed-email">Correo electrónico</label>
        <input id="managed-email" type="email" value={form.email} maxLength={255} required disabled={busy}
          onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="off" />
      </div>
      {!user && <div className="usuarios-form-field">
        <label htmlFor="managed-password">Contraseña inicial</label>
        <input id="managed-password" type="password" autoComplete="new-password" value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })} required disabled={busy}
          aria-describedby="managed-password-hint" />
        <small id="managed-password-hint">Mínimo 12 caracteres y máximo 72 bytes UTF-8.</small>
      </div>}
      <div className="usuarios-form-field">
        <label htmlFor="managed-role">Rol</label>
        <select id="managed-role" value={form.role} disabled={busy} required={!user}
          onChange={(event) => setForm({ ...form, role: event.target.value as AssignableRole | '' })}>
          {user && user.roles.length !== 1 && <option value="">Conservar roles actuales</option>}
          {roles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
        </select>
      </div>
      <p className="users-form-note">{user
        ? 'Cambiar el correo o el rol cerrará las sesiones de esta cuenta.'
        : 'La cuenta se creará en estado Activo. Los permisos corresponden al rol seleccionado.'}</p>
      <div className="usuarios-modal-footer">
        <button type="button" className="usuarios-secondary-button" onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="submit" className="usuarios-primary-button" disabled={busy}>
          {busy ? 'Guardando…' : user ? 'Guardar cambios' : 'Crear usuario'}
        </button>
      </div>
    </form>
  </dialog>;
}
