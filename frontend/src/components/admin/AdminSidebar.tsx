import { canManageApplications } from '../../utils/applicationManagement';
import { canManageUsers } from '../../utils/userManagement';
import { canManageOrganizations } from '../../utils/organizationManagement';
import { canManageVacancies } from '../../utils/vacancyManagement';
import { useAuth } from '../../hooks/useAuth';
import { canReadSiteSettings, canReadStatistics } from '../../utils/siteManagement';
import { canManageBackups } from '../../utils/backupManagement';
import logoCompleto from '../../components/imagenes/logo/logo 2.png';
import logoIcono from '../../components/imagenes/logo/logo 3.png';
import type { AdminMenuName } from '../../types/admin';

interface AdminSidebarProps {
  activeMenu: AdminMenuName;
  onMenuClick: (menu: AdminMenuName) => void;
}

const menuItems: Array<{ icon: string; name: AdminMenuName }> = [
  { icon: '🏠', name: 'Dashboard' },
  { icon: '➕', name: 'Nueva Vacante' },
  { icon: '📄', name: 'Administrar Vacantes' },
  { icon: '📁', name: 'Postulaciones' },
  { icon: '🏢', name: 'Organizaciones' },
  { icon: '📚', name: 'Categorías' },
  { icon: '📊', name: 'Estadísticas' },
  { icon: '👥', name: 'Usuarios' },
  { icon: '⚙️', name: 'Configuración' },
  { icon: '🗄️', name: 'Respaldos' },
];

/** Sidebar for the preserved administrative interface. */
export default function AdminSidebar({
  activeMenu,
  onMenuClick,
}: AdminSidebarProps) {
  const { session } = useAuth();
  return (
    <aside className="sidebar">
      <button
        type="button"
        className="logo"
        onClick={() => onMenuClick('Dashboard')}
        title="Ir al Dashboard"
      >
        <picture>
          <source media="(max-width: 900px)" srcSet={logoIcono} />
          <img
            src={logoCompleto}
            alt="Fundación Quintanilla Amaya"
            className="logo-image"
          />
        </picture>
      </button>
      <nav className="menu">
        {menuItems.filter((item) => (!['Dashboard', 'Estadísticas'].includes(item.name) || canReadStatistics(session)) && (item.name !== 'Configuración' || canReadSiteSettings(session)) &&
          (item.name !== 'Respaldos' || canManageBackups(session)) &&
          (item.name !== 'Postulaciones' || canManageApplications(session)) && (item.name !== 'Usuarios' || canManageUsers(session)) &&
          (item.name !== 'Organizaciones' || canManageOrganizations(session)) &&
          (item.name !== 'Nueva Vacante' || canManageVacancies(session, 'opportunities.create')) &&
          (item.name !== 'Administrar Vacantes' || canManageVacancies(session)) &&
          (item.name !== 'Categorías' || canManageVacancies(session, 'categories.read'))).map((item) => (
          <button
            key={item.name}
            aria-label={item.name}
            type="button"
            className={`menu-item ${activeMenu === item.name ? 'active' : ''}`}
            onClick={() => onMenuClick(item.name)}
          >
            <i>{item.icon}</i>
            <span>{item.name}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="admin-photo">{session?.user.fullName.charAt(0).toUpperCase()}</div>
        <div>
          <strong>{session?.user.fullName}</strong>
          <small>{session?.user.email}</small>
        </div>
      </div>
    </aside>
  );
}
