import type { CSSProperties } from 'react';
import LoginForm from '../../components/auth/LoginForm';
import '../../styles/auth/auth.css';
import fondoDesktop from '../../components/imagenes/img/FLogin 1.png';
import fondoMobile from '../../components/imagenes/img/FLogin 2.png';
import logoFQA from '../../components/imagenes/img/FLogin 3.png';
import portafolio from '../../components/imagenes/img/FLogin 4.png';
import type { NavigateTo } from '../../types/models';

interface LoginProps {
  navigateTo: NavigateTo;
}

type AuthPageStyle = CSSProperties & Record<`--${string}`, string>;

/** Login screen for persistent, revocable sessions. */
export default function Login({ navigateTo }: LoginProps) {
  const pageStyle: AuthPageStyle = {
    '--login-bg-desktop': `url("${fondoDesktop}")`,
    '--login-bg-mobile': `url("${fondoMobile}")`,
  };

  return (
    <main className="auth-page" style={pageStyle}>
      <div className="auth-background" />
      <div className="auth-overlay" />
      <div className="auth-container">
        <section className="auth-brand">
          <img src={portafolio} alt="FQA Empleos" className="auth-portfolio" />
          <div className="auth-brand-content">
            <img src={logoFQA} alt="FQA Empleos" className="fqa-logo-image" />
            <p className="auth-brand-description">
              Conectando talento con oportunidades.
            </p>
          </div>
        </section>
        <section className="auth-card">
          <div className="auth-card-content">
            <div className="auth-heading">
              <h1>Iniciar sesión</h1>
              <p>Ingresa a tu cuenta para continuar.</p>
            </div>
            <LoginForm navigateTo={navigateTo} />
          </div>
        </section>
      </div>
      <button
        type="button"
        className="auth-back-button"
        onClick={() => navigateTo('home')}
        aria-label="Volver al inicio"
      >
        <span className="back-arrow">←</span>
        <span>Volver</span>
      </button>
    </main>
  );
}
