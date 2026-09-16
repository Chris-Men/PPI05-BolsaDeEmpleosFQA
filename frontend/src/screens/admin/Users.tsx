import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { UserFormDialog } from '../../components/admin/UserFormDialog';
import { getUsers } from '../../services/adminUserService';
import type { AssignableRole, ManagedUser, UserFilters, UserListResponse } from '../../types/adminUser';
import { canManageUsers, getCreatableUserRoles, ROLE_LABELS } from '../../utils/userManagement';
import '../../styles/admin/users.css';

interface UserManagementProps { permissions: string[]; isSuperAdmin: boolean; creationRoles: AssignableRole[] }

/** Guards direct rendering as well as navigation; the backend enforces the same boundary. */
export default function Users() {
  const { session } = useAuth();
  if (!canManageUsers(session)) return <p role="alert">No tienes permiso para gestionar usuarios.</p>;
  return <UserManagement permissions={session?.permissions ?? []}
    isSuperAdmin={Boolean(session?.roles.includes('SUPER_ADMIN'))} creationRoles={getCreatableUserRoles(session)} />;
}

/** Replaces the local-only prototype while retaining its existing table and modal styles. */
function UserManagement({ permissions, isSuperAdmin, creationRoles }: UserManagementProps) {
  const [filters, setFilters] = useState<UserFilters>({ search: '', role: '', status: '', page: 1, pageSize: 20 });
  const [data, setData] = useState<UserListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [modal, setModal] = useState<{ user: ManagedUser | null } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true); setError('');
    const timer = window.setTimeout(() => {
      void getUsers(filters, controller.signal).then((result) => {
        if (!active) return;
        const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
        if (filters.page > lastPage) {
          setFilters((current) => ({ ...current, page: lastPage }));
          return;
        }
        setData(result);
      }).catch((failure: unknown) => {
        if (active) { setData(null); setError(failure instanceof Error ? failure.message : 'No fue posible cargar los usuarios.'); }
      }).finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); controller.abort(); };
  }, [filters, revision]);

  /** Applies filters atomically with resetting pagination. */
  const filter = (patch: Partial<UserFilters>): void => setFilters((current) => ({ ...current, ...patch, page: 1 }));
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / filters.pageSize));
  return <section className="admin-screen usuarios-screen">
    <div className="screen-header">
      <div><h2>Gestión de usuarios</h2><p>{isSuperAdmin ? 'Candidatos y administradores registrados en la plataforma.' : 'Consulta y crea cuentas de candidatos.'}</p></div>
      {creationRoles.length > 0 && <button type="button" className="primary-button" onClick={() => { setNotice(''); setModal({ user: null }); }}>
        + Nuevo usuario
      </button>}
    </div>
    {notice && <p className="users-notice" role="status">{notice}</p>}
    <div className="usuarios-toolbar">
      <input type="search" aria-label="Buscar por nombre o correo" placeholder="Buscar por nombre o correo…"
        value={filters.search} maxLength={255} onChange={(event) => filter({ search: event.target.value })} />
      {isSuperAdmin && <select aria-label="Filtrar por rol" value={filters.role}
        onChange={(event) => filter({ role: event.target.value as UserFilters['role'] })}>
        <option value="">Todos los roles</option>
        {Object.entries(ROLE_LABELS).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
      </select>}
      <select aria-label="Filtrar por estado" value={filters.status}
        onChange={(event) => filter({ status: event.target.value as UserFilters['status'] })}>
        <option value="">Todos los estados</option><option value="ACTIVE">Activo</option><option value="DISABLED">Deshabilitado</option>
      </select>
    </div>
    {error && <div className="users-error" role="alert">{error} <button type="button" onClick={() => setRevision((value) => value + 1)}>Reintentar</button></div>}
    <div className="admin-table-box" aria-busy={loading} tabIndex={0} role="region" aria-label="Listado de usuarios">
      <table>
        <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={5} className="users-empty" role="status">Cargando usuarios…</td></tr>
            : data?.items.length ? data.items.map((user) => <tr key={user.id}>
              <td><div className="user-table-info"><div className="mini-avatar" aria-hidden="true">{user.fullName.charAt(0).toUpperCase()}</div><strong>{user.fullName}</strong></div></td>
              <td>{user.email}</td>
              <td><span className="type-badge">{user.roles.map((role) => ROLE_LABELS[role]).join(', ') || 'Sin rol asignado'}</span></td>
              <td><span className={'status ' + (user.status === 'ACTIVE' ? 'status-active' : 'status-inactive')}>
                {user.status === 'ACTIVE' ? 'Activo' : 'Deshabilitado'}
              </span></td>
              <td>{user.roles.includes('SUPER_ADMIN') ? <span className="users-protected">Cuenta protegida</span>
                : isSuperAdmin && permissions.includes('users.update') && <button type="button" className="edit-button"
                  aria-label={'Editar ' + user.email} onClick={() => { setNotice(''); setModal({ user }); }}>Editar</button>}</td>
            </tr>) : !error && <tr><td colSpan={5} className="users-empty">No se encontraron usuarios.</td></tr>}
        </tbody>
      </table>
    </div>
    <nav className="users-pagination" aria-label="Paginación de usuarios">
      <span>{data?.total ?? 0} usuarios · Página {filters.page} de {pages}</span>
      <div>
        <button type="button" className="usuarios-secondary-button" disabled={loading || filters.page <= 1}
          onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Anterior</button>
        <button type="button" className="usuarios-secondary-button" disabled={loading || Boolean(error) || filters.page >= pages}
          onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Siguiente</button>
      </div>
    </nav>
    {modal && <UserFormDialog user={modal.user} creationRoles={creationRoles} onClose={() => setModal(null)}
      onSaved={(message) => { setModal(null); setNotice(message); setRevision((value) => value + 1); }} />}
  </section>;
}
