import { useRef, useState, type FormEvent,type CSSProperties} from 'react';
import { ArrowLeft, Mail } from 'lucide-react';

import type { NavigateTo } from '../../types/models';
import { ApiError } from '../../services/api';
import { requestPasswordReset } from '../../services/authService';

import fondoDesktop from '../../components/imagenes/img/FLogin 1.png';
import fondoMobile from '../../components/imagenes/img/FLogin 2.png';
import logoFQA from '../../components/imagenes/img/FLogin 3.png';
import portafolio from '../../components/imagenes/img/FLogin 4.png';

interface ForgotPasswordProps {
  navigateTo: NavigateTo;
}

type AuthPageStyle = CSSProperties & Record<`--${string}`, string>;

const ForgotPassword = ({ navigateTo }: ForgotPasswordProps) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const submitting = useRef(false);

  const pageStyle: AuthPageStyle = {
    '--login-bg-desktop': `url("${fondoDesktop}")`,
    '--login-bg-mobile': `url("${fondoMobile}")`,
  };

  const submit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (submitting.current) return;

    setError('');
    setSuccess('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('El correo electrónico es obligatorio.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('El correo electrónico no es válido.');
      return;
    }

    submitting.current = true;
    setLoading(true);

    try {
      const response = await requestPasswordReset({
        email: normalizedEmail,
      });

      setSuccess(response.message);

    } catch (failure: unknown) {
      setError(
        failure instanceof ApiError
          ? failure.validationErrors[0]?.message ?? failure.message
          : 'No fue posible solicitar la recuperación. Inténtalo de nuevo.',
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <main className="auth-page" style={pageStyle}>
      <div className="auth-background" />
      <div className="auth-overlay" />

      <div className="auth-container">
        <section className="auth-brand">
          <img
            src={portafolio}
            alt="FQA Empleos"
            className="auth-portfolio"
          />

          <div className="auth-brand-content">
            <img
              src={logoFQA}
              alt="FQA Empleos"
              className="fqa-logo-image"
            />

            <p className="auth-brand-description">
              Conectando talento con oportunidades.
            </p>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-content">
            <div className="auth-heading">
              <h1>Recuperar contraseña</h1>

              <p>
                Ingresa tu correo electrónico y te enviaremos las
                instrucciones para recuperar tu cuenta.
              </p>
            </div>

            {error && (
              <div
                id="forgot-password-error"
                className="auth-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                id="forgot-password-success"
                className="auth-success"
                role="status"
              >
                {success}
              </div>
            )}

            <form
              className="login-form"
              onSubmit={submit}
              noValidate
              aria-busy={loading}
            >
              <div className="form-group">
                <label htmlFor="forgot-password-email">
                  Correo electrónico
                </label>

                <div className="input-wrapper">
                  <Mail
                    size={25}
                    className="input-icon"
                    aria-hidden="true"
                  />

                  <input
                    id="forgot-password-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    disabled={loading}
                    aria-describedby={
                      error
                        ? 'forgot-password-error'
                        : success
                          ? 'forgot-password-success'
                          : undefined
                    }
                  />
                </div>
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading
                  ? 'Enviando…'
                  : 'Enviar enlace de recuperación'}
              </button>

              <button
                type="button"
                className="register-button"
                onClick={() => navigateTo('login')}
                disabled={loading}
              >
                <ArrowLeft size={22} />
                <span>Volver al inicio de sesión</span>
              </button>
            </form>
          </div>
        </section>
      </div>

      <button
        type="button"
        className="auth-back-button"
        onClick={() => navigateTo('home')}
        aria-label="Volver al inicio"
        disabled={loading}
      >
        <span className="back-arrow">←</span>
        <span>Volver</span>
      </button>
    </main>
  );
};

export default ForgotPassword;