import { useRef, useState, type FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ApiError } from '../../services/api';
import { getLoginValidationError } from '../../validation/login';
import type { NavigateTo } from '../../types/models';

interface LoginFormProps { navigateTo: NavigateTo }

/** Accessible login form backed by the real session service. */
export default function LoginForm({ navigateTo }: LoginFormProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  /** Validates locally and prevents duplicate credential submissions. */
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (submitting.current) return;
    const validation = getLoginValidationError({ email, password });
    setError(validation ?? '');
    if (validation) return;
    submitting.current = true;
    setLoading(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      setPassword('');
      navigateTo('home');
    } catch (failure: unknown) {
      setError(failure instanceof ApiError
        ? failure.validationErrors[0]?.message ?? failure.message
        : 'No fue posible iniciar sesión. Inténtalo de nuevo.');
    } finally { submitting.current = false; setLoading(false); }
  };

  return <form className="login-form" onSubmit={submit} noValidate aria-busy={loading}>
    {error && <div id="login-error" className="auth-error" role="alert">{error}</div>}
    <div className="form-group">
      <label htmlFor="login-email">Correo electrónico</label>
      <div className="input-wrapper">
        <Mail size={25} className="input-icon" aria-hidden="true" />
        <input id="login-email" name="email" type="email" autoComplete="username"
          value={email} onChange={(event) => setEmail(event.target.value)} required
          aria-describedby={error ? 'login-error' : undefined} disabled={loading} />
      </div>
    </div>
    <div className="form-group">
      <label htmlFor="login-password">Contraseña</label>
      <div className="input-wrapper">
        <LockKeyhole size={25} className="input-icon" aria-hidden="true" />
        <input id="login-password" name="password" type={visible ? 'text' : 'password'}
          autoComplete="current-password" value={password} required disabled={loading}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby={error ? 'login-error' : undefined} />
        <button className="password-toggle" type="button" onClick={() => setVisible(!visible)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible}>
          {visible ? <EyeOff size={22} /> : <Eye size={22} />}
        </button>
      </div>
    </div>
    <button type="submit" className="login-button" disabled={loading}>
      {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
    </button>
    <div className="auth-divider"><span /><strong>o</strong><span /></div>
    <button type="button" className="register-button" onClick={() => navigateTo('register')} disabled={loading}>
      <UserRound size={25} /><span>Crear cuenta</span>
    </button>
  </form>;
}
