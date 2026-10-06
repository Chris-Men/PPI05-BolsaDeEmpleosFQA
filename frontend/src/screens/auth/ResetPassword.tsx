import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type FormEvent,
} from 'react';
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from 'lucide-react';

import type { NavigateTo } from '../../types/models';
import { ApiError } from '../../services/api';
import { resetPassword } from '../../services/authService';

import fondoDesktop from '../../components/imagenes/img/FLogin 1.png';
import fondoMobile from '../../components/imagenes/img/FLogin 2.png';
import logoFQA from '../../components/imagenes/img/FLogin 3.png';
import portafolio from '../../components/imagenes/img/FLogin 4.png';

interface ResetPasswordProps {
    navigateTo: NavigateTo;
}

type AuthPageStyle = CSSProperties & Record<`--${string}`, string>;

const ResetPassword = ({ navigateTo }: ResetPasswordProps) => {
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [visiblePassword, setVisiblePassword] = useState(false);
    const [visibleConfirmation, setVisibleConfirmation] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const submitting = useRef(false);

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

    const passwordStrength = getPasswordStrength(password);

    const [token] = useState(() => new URLSearchParams(window.location.search).get('token')?.trim() ?? '');

    /** Remove the credential from the address bar before other navigation. */
    useEffect(() => {
        window.history.replaceState({}, document.title, '/reset-password');
    }, []);

    const goToScreen = (nextScreen: 'login' | 'home') => {
        window.history.replaceState({}, document.title, '/');
        navigateTo(nextScreen);
    };

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

        if (!token) {
            setError(
                'El enlace de recuperación no es válido o no contiene un token.',
            );
            return;
        }

        if (!password) {
            setError('La nueva contraseña es obligatoria.');
            return;
        }

        if (Array.from(password).length < 12) {
            setError('La contraseña debe tener al menos 12 caracteres.');
            return;
        }

        if (new TextEncoder().encode(password).length > 72) {
            setError(
                'La contraseña no puede superar los 72 bytes en UTF-8.',
            );
            return;
        }

        if (!confirmation) {
            setError('Debes confirmar tu nueva contraseña.');
            return;
        }

        if (password !== confirmation) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        submitting.current = true;
        setLoading(true);

        try {
            const response = await resetPassword({
                token,
                password,
            });

            setPassword('');
            setConfirmation('');
            setSuccess(response.message);

            /*
             * Give the user a moment to read the confirmation before
             * returning to the login screen.
             */
            window.history.replaceState({}, document.title, '/');

            window.setTimeout(() => {
                navigateTo('login');
            }, 3000);
        } catch (failure: unknown) {
            setError(
                failure instanceof ApiError
                    ? failure.validationErrors[0]?.message ?? failure.message
                    : 'No fue posible cambiar la contraseña. Inténtalo de nuevo.',
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
                            <h1>Nueva contraseña</h1>

                            <p>
                                Crea una nueva contraseña para recuperar el acceso a tu
                                cuenta.
                            </p>
                        </div>

                        {error && (
                            <div
                                id="reset-password-error"
                                className="auth-error"
                                role="alert"
                            >
                                {error}
                            </div>
                        )}

                        {success && (
                            <div
                                id="reset-password-success"
                                className="auth-success"
                                role="status"
                            >
                                {success}
                            </div>
                        )}

                        {!success && (
                            <form
                                className="login-form"
                                onSubmit={submit}
                                noValidate
                                aria-busy={loading}
                            >
                                <div className="form-group">
                                    <label htmlFor="reset-password">
                                        Nueva contraseña
                                    </label>

                                    <div className="input-wrapper">
                                        <LockKeyhole
                                            size={25}
                                            className="input-icon"
                                            aria-hidden="true"
                                        />

                                        <input
                                            id="reset-password"
                                            name="password"
                                            type={visiblePassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            value={password}
                                            onChange={(event) =>
                                                setPassword(event.target.value)
                                            }
                                            required
                                            disabled={loading}
                                            aria-describedby={
                                                error ? 'reset-password-error' : undefined
                                            }
                                        />

                                        <button
                                            className="password-toggle"
                                            type="button"
                                            onClick={() =>
                                                setVisiblePassword(!visiblePassword)
                                            }
                                            aria-label={
                                                visiblePassword
                                                    ? 'Ocultar contraseña'
                                                    : 'Mostrar contraseña'
                                            }
                                            aria-pressed={visiblePassword}
                                            disabled={loading}
                                        >
                                            {visiblePassword ? (
                                                <EyeOff size={22} />
                                            ) : (
                                                <Eye size={22} />
                                            )}
                                        </button>
                                    </div>

                                    {password && (
                                        <div className="password-strength">
                                            <div className="password-strength-header">
                                                <span>Nivel de seguridad</span>

                                                <strong className={passwordStrength.className}>
                                                    {passwordStrength.label}
                                                </strong>
                                            </div>

                                            <div className="password-strength-bar">
                                                <div
                                                    className={`password-strength-progress ${passwordStrength.className}`}
                                                    style={{
                                                        width: `${(passwordStrength.score / 5) * 100}%`,
                                                    }}
                                                />
                                            </div>

                                            <div className="password-requirements">
                                                <div
                                                    className={`requirement ${password.length >= 12 ? 'valid' : ''
                                                        }`}
                                                >
                                                    <span>{password.length >= 12 ? '✓' : '○'}</span>
                                                    <span>Mínimo 12 caracteres</span>
                                                </div>

                                                <div
                                                    className={`requirement ${/[A-Z]/.test(password) ? 'valid' : ''
                                                        }`}
                                                >
                                                    <span>{/[A-Z]/.test(password) ? '✓' : '○'}</span>
                                                    <span>Una letra mayúscula</span>
                                                </div>

                                                <div
                                                    className={`requirement ${/[a-z]/.test(password) ? 'valid' : ''
                                                        }`}
                                                >
                                                    <span>{/[a-z]/.test(password) ? '✓' : '○'}</span>
                                                    <span>Una letra minúscula</span>
                                                </div>

                                                <div
                                                    className={`requirement ${/[0-9]/.test(password) ? 'valid' : ''
                                                        }`}
                                                >
                                                    <span>{/[0-9]/.test(password) ? '✓' : '○'}</span>
                                                    <span>Un número</span>
                                                </div>

                                                <div
                                                    className={`requirement ${/[^A-Za-z0-9]/.test(password) ? 'valid' : ''
                                                        }`}
                                                >
                                                    <span>
                                                        {/[^A-Za-z0-9]/.test(password) ? '✓' : '○'}
                                                    </span>
                                                    <span>Caracteres especiales</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="reset-password-confirmation">
                                        Confirmar contraseña
                                    </label>

                                    <div className="input-wrapper">
                                        <LockKeyhole
                                            size={25}
                                            className="input-icon"
                                            aria-hidden="true"
                                        />

                                        <input
                                            id="reset-password-confirmation"
                                            name="confirmation"
                                            type={
                                                visibleConfirmation ? 'text' : 'password'
                                            }
                                            autoComplete="new-password"
                                            value={confirmation}
                                            onChange={(event) =>
                                                setConfirmation(event.target.value)
                                            }
                                            required
                                            disabled={loading}
                                            aria-describedby={
                                                error ? 'reset-password-error' : undefined
                                            }
                                        />

                                        <button
                                            className="password-toggle"
                                            type="button"
                                            onClick={() =>
                                                setVisibleConfirmation(!visibleConfirmation)
                                            }
                                            aria-label={
                                                visibleConfirmation
                                                    ? 'Ocultar contraseña'
                                                    : 'Mostrar contraseña'
                                            }
                                            aria-pressed={visibleConfirmation}
                                            disabled={loading}
                                        >
                                            {visibleConfirmation ? (
                                                <EyeOff size={22} />
                                            ) : (
                                                <Eye size={22} />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="login-button"
                                    disabled={loading}
                                >
                                    {loading
                                        ? 'Cambiando contraseña…'
                                        : 'Cambiar contraseña'}
                                </button>

                                <button
                                    type="button"
                                    className="register-button"
                                    onClick={() => goToScreen('login')}
                                    disabled={loading}
                                >
                                    <ArrowLeft size={22} />
                                    <span>Volver al inicio de sesión</span>
                                </button>
                            </form>
                        )}
                    </div>
                </section>
            </div>

            <button
                type="button"
                className="auth-back-button"
                onClick={() => goToScreen('home')}
                aria-label="Volver al inicio"
                disabled={loading}
            >
                <span className="back-arrow">←</span>
                <span>Volver</span>
            </button>
        </main>
    );
};

export default ResetPassword;