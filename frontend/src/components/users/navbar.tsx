import { SessionControls } from '../auth/SessionControls';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { NotificationDropdown } from './NotificationDropdown';
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
  beforeLogout?: () => Promise<unknown>;
  onViewNotifications: () => void;
}

/** Main responsive navigation for public and candidate screens. */
export default function Navbar({
  screen,
  currentUser,
  userMenuOpen,
  setUserMenuOpen,
  navigateTo,
  beforeLogout,
  onViewNotifications,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { session } = useAuth();
  const canReadNotifications = session?.roles.includes('CANDIDATE') && session.permissions.includes('notifications.read.own');
  useEffect(() => { setNotificationsOpen(false); }, [screen]);

  const handleNavigation = (target: ScreenName) => {
    setMenuOpen(false);
    setNotificationsOpen(false);
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
        {currentUser && canReadNotifications && (
          <NotificationDropdown
            open={notificationsOpen}
            onOpenChange={open => {
              setNotificationsOpen(open);
              if (open) { setUserMenuOpen(false); setMenuOpen(false); }
            }}
            onViewAll={onViewNotifications}
          />
        )}
        {currentUser ? (
          <div className="nav-user-menu" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="nav-avatar"
              onClick={() => { setNotificationsOpen(false); setMenuOpen(false); setUserMenuOpen((open) => !open); }}
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
                <SessionControls showAll={false} beforeClose={beforeLogout} />
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
          onClick={() => { setNotificationsOpen(false); setUserMenuOpen(false); setMenuOpen((open) => !open); }}
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
