import type { ReactNode } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import '../../styles/admin/admin-layout.css';
import '../../styles/admin/admin-sidebar.css';
import '../../styles/admin/admin-topbar.css';
import type { AdminIdentity, AdminMenuName } from '../../types/admin';

interface AdminLayoutProps {
  activeMenu: AdminMenuName;
  onMenuClick: (menu: AdminMenuName) => void;
  children: ReactNode;
  currentUser: AdminIdentity | null;
  handleLogout: () => void;
}

/** Shared layout for administrative screens once authentication is available. */
export default function AdminLayout({
  activeMenu,
  onMenuClick,
  children,
  currentUser,
  handleLogout,
}: AdminLayoutProps) {
  return (
    <div className="admin-layout">
      <AdminSidebar activeMenu={activeMenu} onMenuClick={onMenuClick} />
      <div className="admin-main">
        <AdminTopbar
          activeMenu={activeMenu}
          currentUser={currentUser}
          handleLogout={handleLogout}
        />
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
