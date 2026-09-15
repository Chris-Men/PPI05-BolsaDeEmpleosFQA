import { LockKeyhole, Mail, UserRound } from 'lucide-react';
import type { NavigateTo } from '../../types/models';

interface LoginFormProps {
  navigateTo: NavigateTo;
}

/** Displays the pending login interface without simulating authentication. */
export default function LoginForm({ navigateTo }: LoginFormProps) {
  return (
    <form className="login-form" onSubmit={(event) => event.preventDefault()}>
      <div className="auth-info" role="status">
        El inicio de sesión estará disponible cuando se habilite su endpoint en el backend.
      </div>

      <div className="form-group">
        <div className="input-wrapper">
          <Mail size={25} strokeWidth={1.8} className="input-icon" />
          <input
            type="email"
            placeholder="Correo electrónico"
            autoComplete="email"
            disabled
          />
        </div>
      </div>

      <div className="form-group">
        <div className="input-wrapper">
          <LockKeyhole size={25} strokeWidth={1.8} className="input-icon" />
          <input
            type="password"
            placeholder="Contraseña"
            autoComplete="current-password"
            disabled
          />
        </div>
      </div>

      <button type="submit" className="login-button" disabled>
        Iniciar sesión próximamente
      </button>

      <div className="auth-divider">
        <span />
        <strong>o</strong>
        <span />
      </div>

      <button
        type="button"
        className="register-button"
        onClick={() => navigateTo('register')}
      >
        <UserRound size={25} />
        <span>Crear cuenta</span>
      </button>
    </form>
  );
}
