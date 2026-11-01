import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight, HelpCircle, House, LayoutDashboard, Menu, Settings, UserRound, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '../hooks/useNavigation';
import { CandidateSettings } from '../components/users/CandidateSettings';
import fqaLogo from '../components/imagenes/logo/logo 1.png';
import '../styles/users/profileuser.css';
import '../styles/users/accountProfile.css';

/** Administrative accounts reuse the profile design and security controls without candidate data. */
export function AccountProfile() {
  const { session } = useAuth();
  const { route } = useNavigation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuButton = useRef<HTMLButtonElement>(null);
  const sidebarId = useId();
  const headingId = useId();
  const isSettings = route.profileSection === 'settings';

  /** Keeps the mobile sidebar dismissible from the keyboard. */
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        mobileMenuButton.current?.focus();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [mobileMenuOpen]);

  if (!session) return null;
  const role = session.roles.includes('SUPER_ADMIN') ? 'Super Admin' : 'Administrador';
  const initial = session.user.fullName.trim().charAt(0).toUpperCase() || 'A';
  const closeMenu = (): void => setMobileMenuOpen(false);

  return (
    <div className="profile-user-screen account-profile">
      <aside id={sidebarId} className={`profile-sidebar ${mobileMenuOpen ? 'profile-sidebar-open' : ''}`}>
        <Link to="/" className="profile-brand profile-brand-home" aria-label="Ir al inicio" onClick={closeMenu}>
          <img src={fqaLogo} alt="FQA Empleos" className="profile-brand-logo" />
        </Link>
        <button type="button" className="profile-mobile-close" onClick={() => {
          closeMenu();
          mobileMenuButton.current?.focus();
        }} aria-label="Cerrar menú">
          <X size={20} />
        </button>
        <nav className="profile-sidebar-nav" aria-label="Mi cuenta">
          <Link to="/perfil" className={`profile-sidebar-item ${!isSettings ? 'active' : ''}`}
            aria-current={!isSettings ? 'page' : undefined} onClick={closeMenu}>
            <UserRound size={19} /><span>Mi perfil</span>
          </Link>
          <Link to="/perfil/configuracion" className={`profile-sidebar-item ${isSettings ? 'active' : ''}`}
            aria-current={isSettings ? 'page' : undefined} onClick={closeMenu}>
            <Settings size={19} /><span>Configuración</span>
          </Link>
          <Link to="/admin" className="profile-sidebar-item" onClick={closeMenu}>
            <LayoutDashboard size={19} /><span>Panel administrativo</span>
          </Link>
          <Link to="/" className="profile-sidebar-item" onClick={closeMenu}>
            <House size={19} /><span>Ver sitio público</span>
          </Link>
        </nav>
        <Link to="/ayuda" className="profile-sidebar-help" onClick={closeMenu}>
          <div className="profile-help-icon"><HelpCircle size={19} /></div>
          <div><strong>¿Necesitas ayuda?</strong><small>Estamos para apoyarte</small></div>
          <ChevronRight size={16} />
        </Link>
      </aside>

      {mobileMenuOpen && <div className="profile-sidebar-overlay" onClick={closeMenu} />}

      <main className="profile-main">
        <div className="profile-mobile-header">
          <button type="button" className="profile-mobile-menu" ref={mobileMenuButton}
            aria-label="Abrir menú" aria-expanded={mobileMenuOpen} aria-controls={sidebarId}
            onClick={() => setMobileMenuOpen(true)}>
            <Menu size={22} />
          </button>
        </div>
        <div className="profile-content">
          {isSettings ? <CandidateSettings administrative /> : <>
            <section className="profile-welcome">
              <div className="profile-welcome-user">
                <div className="profile-large-avatar" aria-hidden="true">
                  {initial}<span className="profile-avatar-edit"><UserRound size={11} /></span>
                </div>
                <div className="profile-welcome-text">
                  <h1>Hola, {session.user.fullName}</h1>
                  <p>{role}<span>·</span>Correo: {session.user.email}</p>
                </div>
              </div>
            </section>
            <section className="profile-card account-profile-card" aria-labelledby={headingId}>
              <div className="profile-card-heading">
                <div><span className="profile-heading-icon"><UserRound size={21} /></span>
                  <h2 id={headingId}>Información de la cuenta</h2>
                </div>
              </div>
              <dl className="account-profile-details">
                <div><dt>Nombre</dt><dd>{session.user.fullName}</dd></div>
                <div><dt>Correo electrónico</dt><dd>{session.user.email}</dd></div>
                <div><dt>Rol</dt><dd>{role}</dd></div>
              </dl>
              <Link to="/perfil/configuracion" className="profile-primary-button">
                <Settings size={16} />Cuenta y seguridad
              </Link>
            </section>
          </>}
        </div>
      </main>
    </div>
  );
}
