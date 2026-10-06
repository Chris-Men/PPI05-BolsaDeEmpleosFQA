import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, KeyRound, LockKeyhole, LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getNewPasswordValidationError } from '../../validation/register';
import { SessionControls } from '../auth/SessionControls';
import { DeleteOwnAccount } from './DeleteOwnAccount';
import '../../styles/users/profileSettings.css';

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmation';

/** Candidate account controls grouped in the profile settings section. */
export function CandidateSettings() {
  const { changePassword } = useAuth();
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmation: '' });
  const [visible, setVisible] = useState<Record<PasswordField, boolean>>({
    currentPassword: false, newPassword: false, confirmation: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /** Sends only the current and replacement credentials; confirmation stays in the browser. */
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (busy) return;
    if (!passwords.currentPassword) {
      setError('Ingresa tu contraseña actual.');
      return;
    }
    const validation = getNewPasswordValidationError(passwords.newPassword, passwords.confirmation);
    if (validation) { setError(validation); return; }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setPasswords({ currentPassword: '', newPassword: '', confirmation: '' });
      setVisible({ currentPassword: false, newPassword: false, confirmation: false });
      setSuccess('Contraseña actualizada. Las demás sesiones se cerraron.');
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'No fue posible cambiar la contraseña. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  /** Keeps each field masked by default while allowing an explicit visibility toggle. */
  const passwordField = (name: PasswordField, label: string, autocomplete: string) => (
    <div className="profile-settings-field" key={name}>
      <label htmlFor={`profile-settings-${name}`}>{label}</label>
      <div className="profile-settings-input-wrap">
        <LockKeyhole size={18} aria-hidden="true" />
        <input id={`profile-settings-${name}`} type={visible[name] ? 'text' : 'password'}
          autoComplete={autocomplete} value={passwords[name]} disabled={busy} required
          onChange={(event) => {
            setPasswords((current) => ({ ...current, [name]: event.target.value }));
            setSuccess('');
          }} />
        <button type="button" disabled={busy} aria-label={`${visible[name] ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`}
          aria-pressed={visible[name]} onClick={() => setVisible((current) => ({ ...current, [name]: !current[name] }))}>
          {visible[name] ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );

  return <div className="profile-settings">
    <header className="profile-settings-header">
      <span className="profile-settings-eyebrow">Mi cuenta</span>
      <h1>Configuración</h1>
      <p>Administra la seguridad y el acceso a tu cuenta.</p>
    </header>

    <section className="profile-card profile-settings-card" aria-labelledby="profile-settings-password-title">
      <div className="profile-settings-card-title">
        <span className="profile-settings-icon"><KeyRound size={21} /></span>
        <div>
          <h2 id="profile-settings-password-title">Cambiar contraseña</h2>
          <p>Usa tu contraseña actual para confirmar el cambio.</p>
        </div>
      </div>
      <form onSubmit={(event) => void submit(event)}>
        {passwordField('currentPassword', 'Contraseña actual', 'current-password')}
        {passwordField('newPassword', 'Nueva contraseña', 'new-password')}
        {passwordField('confirmation', 'Confirmar nueva contraseña', 'new-password')}
        <p className="profile-settings-hint">Mínimo 12 caracteres y máximo 72 bytes UTF-8. Tu sesión actual continuará abierta; las demás se cerrarán.</p>
        {error && <p className="profile-settings-error" role="alert">{error}</p>}
        {success && <p className="profile-settings-success" role="status">{success}</p>}
        <button className="profile-settings-primary" type="submit" disabled={busy}>
          {busy ? 'Actualizando…' : 'Actualizar contraseña'}
        </button>
      </form>
    </section>

    <section className="profile-card profile-settings-card profile-settings-sessions" aria-labelledby="profile-settings-sessions-title">
      <div className="profile-settings-card-title">
        <span className="profile-settings-icon"><LogOut size={21} /></span>
        <div>
          <h2 id="profile-settings-sessions-title">Sesiones abiertas</h2>
          <p>Cierra la sesión en todos los dispositivos donde hayas iniciado sesión.</p>
        </div>
      </div>
      <SessionControls showCurrent={false} />
    </section>

    <section className="profile-settings-delete" aria-label="Eliminar cuenta">
      <span className="profile-settings-delete-icon"><Trash2 size={21} /></span>
      <DeleteOwnAccount />
    </section>
  </div>;
}
