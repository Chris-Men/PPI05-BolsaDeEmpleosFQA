import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  User,
  UserRound,
} from 'lucide-react';
import { ApiError } from '../../services/api';
import { registerCandidate } from '../../services/authService';
import {
  getRegistrationValidationError,
  type RegistrationFormValues,
} from '../../validation/register';
import type { NavigateTo } from '../../types/models';

interface RegisterFormProps {
  navigateTo: NavigateTo;
  showToast: (message: string) => void;
}


/** Public candidate registration form connected to the backend API. */
export default function RegisterForm({
  navigateTo,
  showToast,
}: RegisterFormProps) {
  const [formData, setFormData] = useState<RegistrationFormValues>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registeredName, setRegisteredName] = useState('');
  const [error, setError] = useState('');

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as keyof RegistrationFormValues;
    setFormData((current) => ({ ...current, [field]: event.target.value }));
  };


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const validationMessage = getRegistrationValidationError(formData);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setLoading(true);
    try {
      const result = await registerCandidate({
        fullName: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });
      setRegisteredName(result.user.fullName);
      showToast('Cuenta de candidato creada correctamente.');
    } catch (requestError: unknown) {
      if (requestError instanceof ApiError) {
        setError(requestError.validationErrors[0]?.message ?? requestError.message);
      } else {
        setError('No fue posible crear la cuenta. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (registeredName) {
    return (
      <div className="login-form auth-success" role="status">
        <CheckCircle2 size={52} aria-hidden="true" />
        <h2>Cuenta creada correctamente</h2>
        <p>
          Gracias, {registeredName}. Tu cuenta de candidato ya está registrada.
          Podrás iniciar sesión cuando el acceso esté habilitado.
        </p>
        <button type="button" className="login-button" onClick={() => navigateTo('home')}>
          <span>Volver al inicio</span>
          <ArrowRight size={28} />
        </button>
      </div>
    );
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <div className="form-group">
        <div className="input-wrapper">
          <User size={25} strokeWidth={1.8} className="input-icon" />
          <input
            type="text"
            name="name"
            placeholder="Nombre completo"
            value={formData.name}
            onChange={handleChange}
            autoComplete="name"
            maxLength={150}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <div className="input-wrapper">
          <Mail size={25} strokeWidth={1.8} className="input-icon" />
          <input
            type="email"
            name="email"
            placeholder="Correo electrónico"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            maxLength={255}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <div className="input-wrapper">
          <LockKeyhole size={25} strokeWidth={1.8} className="input-icon" />
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Contraseña (mínimo 12 caracteres)"
            value={formData.password}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff size={23} /> : <Eye size={23} />}
          </button>
        </div>
      </div>

      <div className="form-group">
        <div className="input-wrapper">
          <LockKeyhole size={25} strokeWidth={1.8} className="input-icon" />
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            name="confirmPassword"
            placeholder="Confirmar contraseña"
            value={formData.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowConfirmPassword((current) => !current)}
            aria-label={
              showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
            }
          >
            {showConfirmPassword ? <EyeOff size={23} /> : <Eye size={23} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}

      <button type="submit" className="login-button" disabled={loading}>
        <span>{loading ? 'Creando cuenta...' : 'Crear cuenta'}</span>
        {!loading && <ArrowRight size={28} />}
      </button>

      <div className="auth-divider">
        <span />
        <strong>o</strong>
        <span />
      </div>

      <button
        type="button"
        className="register-button"
        onClick={() => navigateTo('login')}
      >
        <UserRound size={25} />
        <span>Ya tengo una cuenta</span>
      </button>
    </form>
  );
}
