import { useEffect, useRef, useState } from 'react';
import { useNavigation } from '../../hooks/useNavigation';
import { useRouteQuery } from '../../hooks/useRouteQuery';
import { useAuth } from '../../hooks/useAuth';
import { archiveOpportunity, unarchiveOpportunity, getManagedOpportunity, getOpportunityCatalogs, listManagedOpportunities, setOpportunityStatus } from '../../services/opportunityService';
import { KIND_LABELS, STATUS_LABELS, type Opportunity, type OpportunityCatalogs, type OpportunityFilters, type Page } from '../../types/opportunity';
import { canManageVacancies } from '../../utils/vacancyManagement';
import { VacancyActionDialog } from '../../components/admin/VacancyActionDialog';
import OpportunityEditor from './OpportunityEditor';
import { OpportunityDetailsDialog } from '../../components/OpportunityDetailsDialog';
import '../../styles/admin/vacancies.css';

/** Both administrative menu entries reuse the same persistence and lifecycle controls. */
interface OpportunityManagementProps {
  startCreating?: boolean;
  onBack?: () => void;
  onPublished?: () => void;
  onChanged?: () => void;
}
/** Persistent management for all types, including server pagination and permission-aware actions. */

export default function OpportunityManagement({ startCreating = false, onChanged, }: OpportunityManagementProps) {
  const { session } = useAuth();
  const { route, location, go, back } = useNavigation();
  const [filters, setFilters, correctFilters] = useRouteQuery<OpportunityFilters>({ page: 1, pageSize: 20, search: undefined, kind: undefined, status: undefined, categoryId: undefined }, { pageSize: {max:100}, kind:{choices:Object.keys(KIND_LABELS)},status:{choices:Object.keys(STATUS_LABELS).filter(key=>key!=='UNKNOWN')},categoryId:{type:'integer'} });
  const [page, setPage] = useState<Page<Opportunity>>({ items: [], total: 0, page: 1, pageSize: 20 });
  const [catalogs, setCatalogs] = useState<OpportunityCatalogs | null>(null);
  const [editor, setEditor] = useState<{ opportunity: Opportunity | null } | null>(startCreating ? { opportunity: null } : null);
  const [action, setAction] = useState<{ opportunity: Opportunity; type: 'OPEN' | 'CLOSED' | 'ARCHIVED' | 'UNARCHIVE' } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const [viewing, setViewing] = useState<Opportunity | null>(null);
  const mounted = useRef(false);
  const detailOpener = useRef<HTMLElement | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const authorized = canManageVacancies(session);
  useEffect(() => {
    let current = true;
    if (!authorized) return;
    setLoading(true); setError(''); setPage({ items: [], total: 0, page: filters.page ?? 1, pageSize: 20 });
    const timeout = setTimeout(() => {
      void Promise.all([listManagedOpportunities(filters), getOpportunityCatalogs(true)]).then(([result, dictionaries]) => {
        if (current) {
          const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
          if ((filters.page ?? 1) > lastPage) { correctFilters({ ...filters, page: lastPage }); return; }
          setPage(result); setCatalogs(dictionaries);
        }
      }).catch((failure: unknown) => { if (current) setError(failure instanceof Error ? failure.message : 'No se pudieron cargar las vacantes.'); })
        .finally(() => { if (current) setLoading(false); });
    }, 250);
    return () => { current = false; clearTimeout(timeout); };
  }, [filters, revision, authorized, session?.user.id, correctFilters]);
  useEffect(() => {
    if (!authorized) return;
    let current = true;
    setEditor(startCreating ? { opportunity: null } : null); setViewing(null);
    if (route.opportunityKey) {
      setError('');
      void getManagedOpportunity(route.opportunityKey).then(value => {
        if (current) { if (route.editing) setEditor({ opportunity: value }); else setViewing(value); }
      }).catch((failure: unknown) => { if (current) setError(failure instanceof Error ? failure.message : 'No se pudo consultar la vacante.'); });
    }
    return () => { current = false; };
  }, [route.opportunityKey, route.editing, startCreating, authorized, revision]);
  if (!authorized) return <p role="alert">No tienes permiso para gestionar vacantes.</p>;
  /** Details and editors are reconstructed from the URL independently of the listing. */
  const open = (value: Opportunity, editing: boolean): void => {
    detailOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    go('/admin/vacantes/' + value.key + (editing ? '/editar' : '') + location.search);
  };
  const close = () => back('/admin/vacantes' + location.search);
  const updateFilters = (value: Partial<OpportunityFilters>): void => setFilters({ ...filters, ...value, page: 1 });
  return <section className="vacancy-section">
    <div className="vacancy-header"><h1>Vacantes</h1>{!editor && canManageVacancies(session, 'opportunities.create') && <button className="primary-button" type="button" onClick={() => { setMessage(''); go('/admin/vacantes/nueva' + location.search); }}>+ Nueva vacante</button>}</div>
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error} <button type="button" onClick={() => setRevision(revision + 1)}>Reintentar</button></p>}
    {loading && <p role="status">Cargando vacantes…</p>}
    {editor && catalogs ? <OpportunityEditor key={editor.opportunity?.key ?? session?.user.id} opportunity={editor.opportunity} catalogs={catalogs} onSaved={() => { onChanged?.(); if (!mounted.current) return; setEditor(null); setMessage('Vacante guardada correctamente.'); setRevision((value) => value + 1); go('/admin/vacantes' + location.search, true); }} onCancel={close} /> : !editor && <>
      <div className="vacancy-filters">
        <input aria-label="Buscar vacantes" placeholder="Buscar por título u organización" value={filters.search ?? ''} onChange={(event) => updateFilters({ search: event.target.value })} />
        <select aria-label="Tipo de vacante" value={filters.kind ?? ''} onChange={(event) => updateFilters({ kind: (event.target.value || undefined) as OpportunityFilters['kind'] })}><option value="">Todos los tipos</option>{Object.entries(KIND_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <select aria-label="Estado de vacante" value={filters.status ?? ''} onChange={(event) => updateFilters({ status: (event.target.value || undefined) as OpportunityFilters['status'] })}><option value="">Todos los estados vigentes</option>{Object.entries(STATUS_LABELS).filter(([key]) => key !== 'UNKNOWN').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <select aria-label="Categoría de vacante" value={filters.categoryId ?? ''} onChange={(event) => updateFilters({ categoryId: event.target.value ? Number(event.target.value) : undefined })}><option value="">Todas las categorías</option>{catalogs?.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      </div>
      {!loading && !error && page.items.length === 0 && <p>No hay vacantes para estos filtros.</p>}
      <div className="vacancy-table-wrap"><table className="vacancy-table"><thead><tr><th>Título</th><th>Tipo</th><th>Organización</th><th>Categoría</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
        {page.items.map((value) => <tr key={value.key}><td>{value.title}</td><td>{KIND_LABELS[value.kind]}</td><td>{value.organization?.name ?? 'Sin asignar'}</td><td>{value.category?.name ?? 'Sin asignar'}</td><td>{STATUS_LABELS[value.status]}{value.status === 'OPEN' && value.expiresAt && Date.parse(value.expiresAt) <= Date.now() ? ' (vencida)' : ''}</td><td>
          <div className="vacancy-actions">
            <button type="button" data-action="view" disabled={loading} onClick={() => void open(value, false)}>Ver</button>
            {!value.archivedAt && canManageVacancies(session, 'opportunities.update') && <button type="button" data-action="edit" disabled={loading} onClick={() => void open(value, true)}>Editar</button>}
            {!value.archivedAt && canManageVacancies(session, 'opportunities.status.update') && <button type="button" data-action={value.status === 'OPEN' ? 'close' : 'publish'} onClick={() => setAction({ opportunity: value, type: value.status === 'OPEN' ? 'CLOSED' : 'OPEN' })}>{value.status === 'OPEN' ? 'Cerrar' : 'Publicar'}</button>}
            {!value.archivedAt && canManageVacancies(session, 'opportunities.archive') && <button type="button" data-action="archive" onClick={() => setAction({ opportunity: value, type: 'ARCHIVED' })}>Archivar</button>}
            {(value.archivedAt || value.status === 'ARCHIVED') && canManageVacancies(session, 'opportunities.archive') && <button type="button" data-action="unarchive" onClick={() => setAction({ opportunity: value, type: 'UNARCHIVE' })}>Desarchivar</button>}
          </div></td></tr>)}
      </tbody></table></div>
      <div className="vacancy-pagination"><span>{page.total} vacantes · Página {filters.page}</span><button type="button" disabled={loading || (filters.page ?? 1) <= 1} onClick={() => setFilters({ ...filters, page: (filters.page ?? 1) - 1 })}>Anterior</button><button type="button" disabled={loading || (filters.page ?? 1) * (filters.pageSize ?? 20) >= page.total} onClick={() => setFilters({ ...filters, page: (filters.page ?? 1) + 1 })}>Siguiente</button></div>
    </>}
    {action && <VacancyActionDialog danger={action.type === 'ARCHIVED' || action.type === 'CLOSED'} title={action.type === 'UNARCHIVE' ? 'Desarchivar vacante' : action.type === 'ARCHIVED' ? 'Archivar vacante' : action.type === 'CLOSED' ? 'Cerrar vacante' : 'Publicar vacante'} description={`${action.opportunity.title}. ${action.type === 'UNARCHIVE' ? `Se recuperará como ${action.opportunity.publishedAt ? 'Cerrada' : 'Borrador'} para revisarla antes de publicarla.` : action.type === 'ARCHIVED' ? 'Se conservarán sus relaciones históricas.' : 'Se actualizará su disponibilidad en el portal.'}`} onCancel={() => setAction(null)} onConfirm={async () => {
      if (action.type === 'UNARCHIVE') await unarchiveOpportunity(action.opportunity.key); else if (action.type === 'ARCHIVED') await archiveOpportunity(action.opportunity.key); else await setOpportunityStatus(action.opportunity.key, action.type);
      setAction(null); setMessage('Estado de la vacante actualizado.'); setRevision(revision + 1); onChanged?.();
    }} />}
    {viewing && <OpportunityDetailsDialog opportunity={viewing} onClose={close} returnFocus={detailOpener.current} />}
  </section>;
}
