
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  User,
  UserRound,
} from 'lucide-react';
import { ApiError } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
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
  const { register } = useAuth();
  const submitting = useRef(false);

  const [formData, setFormData] = useState<RegistrationFormValues>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // =====================================================
  // NIVEL DE SEGURIDAD DE CONTRASEÑA
  // =====================================================

  const getPasswordStrength = (password: string) => {
    let score = 0;

    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (!password) {
      return {
        score: 0,
        label: '',
        className: '',
      };
    }

    if (score <= 2) {
      return {
        score,
        label: 'Débil',
        className: 'weak',
      };
    }

    if (score <= 4) {
      return {
        score,
        label: 'Media',
        className: 'medium',
      };
    }

    return {
      score,
      label: 'Fuerte',
      className: 'strong',
    };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  // =====================================================
  // ACTUALIZAR CAMPOS
  // =====================================================

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as keyof RegistrationFormValues;

    setFormData((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  // =====================================================
  // ENVIAR FORMULARIO
  // =====================================================

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting.current) return;

    setError('');

    const validationMessage =
      getRegistrationValidationError(formData);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    submitting.current = true;
    setLoading(true);

    try {
      await register({
        fullName: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      navigateTo('home');

      showToast(
        'Cuenta de candidato creada correctamente.'
      );
    } catch (requestError: unknown) {
      if (requestError instanceof ApiError) {
        setError(
          requestError.validationErrors[0]?.message ??
            requestError.message
        );
      } else {
        setError(
          'No fue posible crear la cuenta. Inténtalo de nuevo.'
        );
      }
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <form
      className="login-form"
      onSubmit={handleSubmit}
      noValidate
    >

      {/* =================================================
          NOMBRE
      ================================================= */}

      <div className="form-group">
        <div className="input-wrapper">

          <User
            size={25}
            strokeWidth={1.8}
            className="input-icon"
          />

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


      {/* =================================================
          CORREO
      ================================================= */}

      <div className="form-group">
        <div className="input-wrapper">

          <Mail
            size={25}
            strokeWidth={1.8}
            className="input-icon"
          />

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


      {/* =================================================
          CONTRASEÑA
      ================================================= */}

      <div className="form-group">

        <div className="input-wrapper">

          <LockKeyhole
            size={25}
            strokeWidth={1.8}
            className="input-icon"
          />

          <input
            type={
              showPassword
                ? 'text'
                : 'password'
            }
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
            onClick={() =>
              setShowPassword(
                (current) => !current
              )
            }
            aria-label={
              showPassword
                ? 'Ocultar contraseña'
                : 'Mostrar contraseña'
            }
          >
            {showPassword ? (
              <EyeOff size={23} />
            ) : (
              <Eye size={23} />
            )}
          </button>

        </div>


        {/* =================================================
            SEGURIDAD DE CONTRASEÑA
        ================================================= */}

        {formData.password && (
          <div className="password-strength">

            <div className="password-strength-header">

              <span>
                Nivel de seguridad
              </span>

              <strong
                className={
                  passwordStrength.className
                }
              >
                {passwordStrength.label}
              </strong>

            </div>


            {/* =================================================
                BARRA DE PROGRESO
            ================================================= */}

            <div className="password-strength-bar">

              <div
                className={`password-strength-progress ${passwordStrength.className}`}
                style={{
                  width: `${
                    (passwordStrength.score / 5) * 100
                  }%`,
                }}
              />

            </div>


            {/* =================================================
                REQUISITOS
            ================================================= */}

            <div className="password-requirements">

              <span
                className={
                  formData.password.length >= 12
                    ? 'requirement valid'
                    : 'requirement'
                }
              >
                {formData.password.length >= 12
                  ? '✓'
                  : '○'}

                Mínimo 12 caracteres
              </span>


              <span
                className={
                  /[A-Z]/.test(formData.password)
                    ? 'requirement valid'
                    : 'requirement'
                }
              >
                {/[A-Z]/.test(formData.password)
                  ? '✓'
                  : '○'}

                Una letra mayúscula
              </span>


              <span
                className={
                  /[a-z]/.test(formData.password)
                    ? 'requirement valid'
                    : 'requirement'
                }
              >
                {/[a-z]/.test(formData.password)
                  ? '✓'
                  : '○'}

                Una letra minúscula
              </span>


              <span
                className={
                  /[0-9]/.test(formData.password)
                    ? 'requirement valid'
                    : 'requirement'
                }
              >
                {/[0-9]/.test(formData.password)
                  ? '✓'
                  : '○'}

                Un número
              </span>


              <span
                className={
                  /[^A-Za-z0-9]/.test(
                    formData.password
                  )
                    ? 'requirement valid'
                    : 'requirement'
                }
              >
                {/[^A-Za-z0-9]/.test(
                  formData.password
                )
                  ? '✓'
                  : '○'}

                Caracteres especiales
              </span>

            </div>

          </div>
        )}

      </div>


      {/* =================================================
          CONFIRMAR CONTRASEÑA
      ================================================= */}

      <div className="form-group">

        <div className="input-wrapper">

          <LockKeyhole
            size={25}
            strokeWidth={1.8}
            className="input-icon"
          />

          <input
            type={
              showConfirmPassword
                ? 'text'
                : 'password'
            }
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
            onClick={() =>
              setShowConfirmPassword(
                (current) => !current
              )
            }
            aria-label={
              showConfirmPassword
                ? 'Ocultar contraseña'
                : 'Mostrar contraseña'
            }
          >
            {showConfirmPassword ? (
              <EyeOff size={23} />
            ) : (
              <Eye size={23} />
            )}
          </button>

        </div>

      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div
          className="auth-error"
          role="alert"
        >
          {error}
        </div>
      )}


      {/* =================================================
          BOTÓN CREAR CUENTA
      ================================================= */}

      <button
        type="submit"
        className="login-button"
        disabled={loading}
      >

        <span>
          {loading
            ? 'Creando cuenta...'
            : 'Crear cuenta'}
        </span>

        {!loading && (
          <ArrowRight size={28} />
        )}

      </button>


      {/* =================================================
          DIVISOR
      ================================================= */}

      <div className="auth-divider">

        <span />

        <strong>
          o
        </strong>

        <span />

      </div>


      {/* =================================================
          IR A LOGIN
      ================================================= */}

      <button
        type="button"
        className="register-button"
        onClick={() =>
          navigateTo('login')
        }
      >

        <UserRound size={25} />

        <span>
          Ya tengo una cuenta
        </span>

      </button>

    </form>
  );
}

