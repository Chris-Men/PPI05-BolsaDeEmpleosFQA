import { SessionControls } from '../auth/SessionControls';
import { useState } from 'react';
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
  const name = currentUser?.name ?? 'Administrador';
  const role = currentUser?.role ?? 'Administrador';

  return (
    <header className="topbar">
      <div className="top-left">
        <h1>{activeMenu}</h1>
        <span>Bienvenido nuevamente</span>
      </div>
      <div className="top-right">
        <div className="profile-container">
          <button
            type="button"
            className="profile"
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
            <div className="profile-menu">
              <SessionControls />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
