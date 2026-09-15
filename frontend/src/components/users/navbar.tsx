import { useState } from 'react';
import logo from '../imagenes/logo/logo 1.png';
import '../../styles/users/navbar.css';
import type { CurrentUser, NavigateTo, ScreenName, StateSetter } from '../../types/models';

interface NavbarProps {
  screen: ScreenName;
  currentUser: CurrentUser | null;
  userMenuOpen: boolean;
  setUserMenuOpen: StateSetter<boolean>;
  navigateTo: NavigateTo;
  handleLogout: () => void;
}

/** Main responsive navigation for public and candidate screens. */
export default function Navbar({
  screen,
  currentUser,
  userMenuOpen,
  setUserMenuOpen,
  navigateTo,
  handleLogout,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavigation = (target: ScreenName) => {
    setMenuOpen(false);
    navigateTo(target);
  };

  return (
    <nav className="nav">
      <div className="nav-brand" onClick={() => handleNavigation('home')}>
        <img src={logo} alt="Fundación Quintanilla Amaya" className="nav-logo" />
      </div>

      <div className="nav-links">
        {[
          ['jobs', 'Empleos'],
          ['volunteers', 'Voluntariado'],
          ['students', 'Estudiantes'],
          ['nosotros', 'Nosotros'],
        ].map(([target, label]) => (
          <button
            key={target}
            className={`nav-link ${screen === target ? 'active' : ''}`}
            onClick={() => handleNavigation(target as ScreenName)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="nav-right">
        {currentUser ? (
          <div className="nav-user-menu" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="nav-avatar"
              onClick={() => setUserMenuOpen((open) => !open)}
              title="Menú de usuario"
            >
              {currentUser.initial}
            </button>
            {userMenuOpen && (
              <div className="nav-user-dropdown">
                <button
                  className="nav-user-dropdown-item"
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigateTo('profile');
                  }}
                >
                  Ir al perfil
                </button>
                <button
                  className="nav-user-dropdown-item danger"
                  onClick={() => {
                    setUserMenuOpen(false);
                    handleLogout();
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="btn-ghost" onClick={() => handleNavigation('login')}>
            Ingresar
          </button>
        )}

        <button
          className={`nav-menu-button ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`nav-mobile-menu ${menuOpen ? 'show' : ''}`}>
        {[
          ['jobs', 'Empleos'],
          ['volunteers', 'Voluntariado'],
          ['students', 'Estudiantes'],
          ['nosotros', 'Nosotros'],
        ].map(([target, label]) => (
          <button
            key={target}
            className={`mobile-nav-link ${screen === target ? 'active' : ''}`}
            onClick={() => handleNavigation(target as ScreenName)}
          >
            {label}
          </button>
        ))}
        {!currentUser && (
          <button className="mobile-login-button" onClick={() => handleNavigation('login')}>
            Ingresar
          </button>
        )}
      </div>
    </nav>
  );
}
