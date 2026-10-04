import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { canManageOrganizations } from '../../utils/organizationManagement';
import { changeOrganizationStatus, getOrganization, getOrganizations } from '../../services/organizationService';
import type { ManagedOrganization, OrganizationFilters, OrganizationListResponse } from '../../types/organization';
import { OrganizationDialog } from '../../components/admin/OrganizationDialog';
import '../../styles/admin/organizaciones.css';

interface OrganizationProps { search?: string }
interface OrganizationManagementProps extends OrganizationProps { permissions: string[] }

/** Guards direct rendering as well as navigation; authorization remains server-side. */
export default function Organizaciones({ search = '' }: OrganizationProps) {
  const { session } = useAuth();
  if (!canManageOrganizations(session)) return <p role="alert">No tienes permiso para gestionar organizaciones.</p>;
  return <OrganizationManagement search={search} permissions={session?.permissions ?? []} />;
}

/** Replaces local mock mutations with the existing API while preserving table and modal styling. */
function OrganizationManagement({ search = '', permissions }: OrganizationManagementProps) {
  const [filters, setFilters] = useState<OrganizationFilters>({ search, status: '', page: 1, pageSize: 20 });
  const [data, setData] = useState<OrganizationListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [dialog, setDialog] = useState<{ mode: 'create' | 'view' | 'edit'; organization: ManagedOrganization | null } | null>(null);
  const [transition, setTransition] = useState<ManagedOrganization | null>(null);

  useEffect(() => { setFilters((current) => ({ ...current, search, page: 1 })); }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true); setError('');
    const timer = window.setTimeout(() => {
      void getOrganizations(filters, controller.signal).then((result) => {
        if (!active) return;
        const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
        if (filters.page > pages) { setFilters((current) => ({ ...current, page: pages })); return; }
        setData(result);
      }).catch((failure: unknown) => {
        if (active) { setData(null); setError(failure instanceof Error ? failure.message : 'No fue posible cargar las organizaciones.'); }
      }).finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); controller.abort(); };
  }, [filters, revision]);

  /** Loads authoritative details before viewing or editing. */
  const open = async (organization: ManagedOrganization, mode: 'view' | 'edit'): Promise<void> => {
    if (busy) return;
    setBusy(true); setError('');
    try { setDialog({ mode, organization: await getOrganization(organization.id) }); }
    catch (failure: unknown) { setError(failure instanceof Error ? failure.message : 'No fue posible consultar la organización.'); }
    finally { setBusy(false); }
  };
  /** Confirms a lifecycle change and refreshes the current server-side page. */
  const toggleStatus = async (): Promise<void> => {
    if (!transition || busy) return;
    setBusy(true); setError('');
    try {
      await changeOrganizationStatus(transition.id, transition.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
      setNotice('Estado actualizado correctamente.'); setTransition(null); setRevision((value) => value + 1);
    } catch (failure: unknown) { setError(failure instanceof Error ? failure.message : 'No fue posible cambiar el estado.'); }
    finally { setBusy(false); }
  };
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / filters.pageSize));
  return <section className="organizaciones-screen">
    <div className="screen-header"><div><h2>Organizaciones</h2><p>Administra las organizaciones registradas.</p></div>
      {permissions.includes('organizations.create') && <button className="primary-button" type="button" disabled={busy}
        onClick={() => { setNotice(''); setDialog({ mode: 'create', organization: null }); }}>+ Nueva organización</button>}
    </div>
    {notice && <p role="status" className="organizations-notice">{notice}</p>}
    <div className="admin-toolbar">
      <input type="search" aria-label="Buscar por nombre o correo" placeholder="Buscar por nombre o correo…" maxLength={255}
        value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value, page: 1 })} />
      <select aria-label="Filtrar por estado" value={filters.status}
        onChange={(event) => setFilters({ ...filters, status: event.target.value as OrganizationFilters['status'], page: 1 })}>
        <option value="">Todos los estados</option><option value="ACTIVE">Activa</option><option value="INACTIVE">Inactiva</option>
      </select>
    </div>
    {error && <p role="alert" className="organizations-error">{error} <button type="button" onClick={() => setRevision((value) => value + 1)}>Reintentar</button></p>}
    <div className="admin-table-box" aria-busy={loading} tabIndex={0} role="region" aria-label="Listado de organizaciones">
      <table><thead><tr><th>Organización</th><th>Correo</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={4} role="status">Cargando organizaciones…</td></tr>
          : data?.items.length ? data.items.map((organization) => <tr key={organization.id}>
            <td><strong>{organization.name}</strong></td><td>{organization.email ?? 'Sin correo'}</td>
            <td><span className={'status ' + (organization.status === 'ACTIVE' ? 'status-active' : 'status-inactive')}>
              {organization.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}</span></td>
            <td><div className="table-actions">
              <button className="edit-button" type="button" disabled={busy} onClick={() => void open(organization, 'view')}>Ver</button>
              {permissions.includes('organizations.update') && <button className="edit-button" type="button" disabled={busy}
                onClick={() => void open(organization, 'edit')}>Editar</button>}
              {permissions.includes('organizations.status.update') && <button className="edit-button" type="button" disabled={busy}
                onClick={() => setTransition(organization)}>{organization.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}</button>}
            </div></td>
          </tr>) : !error && <tr><td colSpan={4} className="organizaciones-empty">No se encontraron organizaciones.</td></tr>}
      </tbody></table>
    </div>
    <nav className="organizations-pagination" aria-label="Paginación de organizaciones">
      <span>{data?.total ?? 0} organizaciones · Página {filters.page} de {pages}</span><div>
        <button type="button" disabled={loading || filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Anterior</button>
        <button type="button" disabled={loading || Boolean(error) || filters.page >= pages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Siguiente</button>
      </div>
    </nav>
    {transition && <div className="organizations-confirm" role="region" aria-label="Confirmar cambio de estado">
      <p>¿Deseas {transition.status === 'ACTIVE' ? 'desactivar' : 'activar'} {transition.name}?</p>
      <button type="button" disabled={busy} onClick={() => setTransition(null)}>Cancelar</button>
      <button type="button" disabled={busy} onClick={() => void toggleStatus()}>{busy ? 'Actualizando…' : 'Confirmar'}</button>
    </div>}
    {dialog && <OrganizationDialog mode={dialog.mode} organization={dialog.organization} onClose={() => setDialog(null)}
      onSaved={() => { setDialog(null); setNotice('Organización guardada correctamente.'); setRevision((value) => value + 1); }} />}
  </section>;
}
