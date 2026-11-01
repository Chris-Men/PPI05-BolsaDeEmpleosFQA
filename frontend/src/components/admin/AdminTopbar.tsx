import { Link } from 'react-router';
import { SessionControls } from '../auth/SessionControls';
import { useEffect, useId, useRef, useState } from 'react';
import type { AdminIdentity, AdminMenuName } from '../../types/admin';

interface AdminTopbarProps {
  activeMenu: AdminMenuName;
  currentUser: AdminIdentity | null;
  handleLogout: () => void;
}

/** Header with the authenticated identity and server-backed session controls. */
export default function AdminTopbar({
  activeMenu,
  currentUser,
}: AdminTopbarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileContainer = useRef<HTMLDivElement>(null);
  const profileButton = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const name = currentUser?.name ?? 'Administrador';
  const role = currentUser?.role ?? 'Administrador';

  /** Dismisses the dropdown outside its container and restores keyboard focus on Escape. */
  useEffect(() => {
    if (!profileOpen) return;
    const closeOutside = (event: PointerEvent): void => {
      if (event.target instanceof Node && !profileContainer.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
        profileButton.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [profileOpen]);

  return (
    <header className="topbar">
      <div className="top-left">
        <h1>{activeMenu}</h1>
        <span>Bienvenido nuevamente</span>
      </div>
      <div className="top-right">
        <div className="profile-container" ref={profileContainer}>
          <button
            type="button"
            className="profile"
            ref={profileButton}
            aria-label="Menú de mi cuenta"
            aria-expanded={profileOpen}
            aria-controls={profileOpen ? menuId : undefined}
            onClick={() => setProfileOpen((open) => !open)}
          >
            <div className="avatar">{currentUser?.initial ?? 'A'}</div>
            <div className="profile-info">
              <strong>{name}</strong>
              <small>{role}</small>
            </div>
            <span className="profile-arrow">{profileOpen ? '▲' : '▼'}</span>
          </button>
          {profileOpen && (
            <div className="profile-menu" id={menuId}>
              <nav aria-label="Mi cuenta">
                <Link to="/" onClick={() => setProfileOpen(false)}>Ver sitio público</Link>
                <Link to="/perfil" onClick={() => setProfileOpen(false)}>Mi perfil</Link>
              </nav>
              <SessionControls showAll={false} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
