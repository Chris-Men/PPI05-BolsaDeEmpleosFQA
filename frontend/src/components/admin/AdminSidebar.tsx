import logoCompleto from '../../components/imagenes/logo/logo 2.png';
import logoIcono from '../../components/imagenes/logo/logo 3.png';
import type { AdminMenuName } from '../../types/admin';

interface AdminSidebarProps {
  activeMenu: AdminMenuName;
  onMenuClick: (menu: AdminMenuName) => void;
}

const menuItems: Array<{ icon: string; name: AdminMenuName }> = [
  { icon: '🏠', name: 'Dashboard' },
  { icon: '➕', name: 'Nueva Postulación' },
  { icon: '📄', name: 'Administrar Postulaciones' },
  { icon: '📁', name: 'CV Recibidos' },
  { icon: '🏢', name: 'Organizaciones' },
  { icon: '📚', name: 'Categorías' },
  { icon: '📊', name: 'Estadísticas' },
  { icon: '👥', name: 'Usuarios' },
  { icon: '⚙️', name: 'Configuración' },
];

/** Sidebar for the preserved administrative interface. */
export default function AdminSidebar({
  activeMenu,
  onMenuClick,
}: AdminSidebarProps) {
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
        {menuItems.map((item) => (
          <button
            key={item.name}
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
        <div className="admin-photo">A</div>
        <div>
          <strong>Administrador</strong>
          <small>admin@fqa.org</small>
        </div>
      </div>
    </aside>
  );
}
