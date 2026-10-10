import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ApiError } from '../../services/api';
import { deleteCategory, getCategoryCatalog, listCategories, saveCategory } from '../../services/opportunityService';
import type { Category, CategoryInput, CatalogItem, Page } from '../../types/opportunity';
import { canManageVacancies } from '../../utils/vacancyManagement';
import { VacancyActionDialog } from '../../components/admin/VacancyActionDialog';
import '../../styles/admin/vacancies.css';

/** Category editing belongs to its own modal and preserves the parent management state. */
interface CategoryEditorProps { category: Category | null; onSaved: () => void; onCancel: () => void }
/** Modal editor preserves entered values and field errors when a save fails. */
function CategoryEditor({ category, onSaved, onCancel }: CategoryEditorProps) {
  const modal = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const [form, setForm] = useState<CategoryInput>({ name: category?.name ?? '', description: category?.description ?? '', parentId: category?.parentId ?? null, isActive: category?.isActive ?? true });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [parents, setParents] = useState<CatalogItem[]>([]);
  const [parentError, setParentError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let current = true;
    void getCategoryCatalog().then((items) => { if (current) { setParents(items); setParentError(''); } })
      .catch((failure: unknown) => { if (current) setParentError(failure instanceof Error ? failure.message : 'No se pudieron cargar las categorías padre.'); });
    return () => { current = false; };
  }, [revision]);
  useEffect(() => { const trigger = document.activeElement; const dialog = modal.current; dialog?.showModal(); return () => { dialog?.close(); if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus(); }; }, []);
  return <dialog ref={modal} className="vacancy-dialog" aria-labelledby="category-title" onCancel={(event) => { event.preventDefault(); if (!lock.current) onCancel(); }}><form onSubmit={(event) => {
    event.preventDefault(); if (lock.current) return; lock.current = true; setBusy(true); setError(''); setFieldErrors({});
    void saveCategory(category?.id ?? null, form).then(onSaved).catch((failure: unknown) => {
      setError(failure instanceof Error ? failure.message : 'No fue posible guardar la categoría.');
      if (failure instanceof ApiError) setFieldErrors(Object.fromEntries(failure.validationErrors.map((item) => [item.field, item.message])));
    }).finally(() => { lock.current = false; setBusy(false); });
  }}>
    <h2 id="category-title">{category ? 'Editar categoría' : 'Nueva categoría'}</h2>{error && <p role="alert">{error}</p>}
    {parentError && <p role="alert">{parentError} <button type="button" onClick={() => setRevision(revision + 1)}>Reintentar</button></p>}
    <div className="vacancy-fields"><label>Nombre *<input autoFocus required minLength={2} maxLength={100} disabled={busy} aria-invalid={Boolean(fieldErrors.name)} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />{fieldErrors.name && <span className="vacancy-error">{fieldErrors.name}</span>}</label>
      <label>Categoría padre (opcional)<select disabled={busy} value={form.parentId ?? ''} onChange={(event) => setForm({ ...form, parentId: event.target.value ? Number(event.target.value) : null })}><option value="">Sin categoría padre</option>{form.parentId && !parents.some((item) => item.id === form.parentId) && <option value={form.parentId}>Categoría padre anterior (inactiva)</option>}{parents.filter((item) => item.id !== category?.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{fieldErrors.parentId && <span className="vacancy-error">{fieldErrors.parentId}</span>}</label>
      <label className="full">Descripción<textarea maxLength={1000} disabled={busy} value={form.description ?? ''} onChange={(event) => setForm({ ...form, description: event.target.value })} />{fieldErrors.description && <span className="vacancy-error">{fieldErrors.description}</span>}</label>
      <label>Estado<select disabled={busy} value={form.isActive ? 'ACTIVE' : 'INACTIVE'} onChange={(event) => setForm({ ...form, isActive: event.target.value === 'ACTIVE' })}><option value="ACTIVE">Activa</option><option value="INACTIVE">Inactiva</option></select></label>
    </div><div className="vacancy-actions"><button type="button" disabled={busy} onClick={onCancel}>Cancelar</button><button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar categoría'}</button></div>
  </form></dialog>;
}
/** Persistent category management replaces the original local-only prototype. */
export default function Categorias() {
  const { session } = useAuth();
  const authorized = canManageVacancies(session, 'categories.read');
  const [filters, setFilters] = useState<{ page: number; pageSize: number; search: string; state?: 'ACTIVE' | 'INACTIVE' }>({ page: 1, pageSize: 20, search: '' });
  const [page, setPage] = useState<Page<Category>>({ items: [], total: 0, page: 1, pageSize: 20 });
  const [editor, setEditor] = useState<{ category: Category | null } | null>(null);
  const [removing, setRemoving] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let current = true;
    if (!authorized) return;
    setLoading(true); setError(''); setPage({ items: [], total: 0, page: filters.page, pageSize: 20 });
    const timeout = setTimeout(() => { void listCategories(filters).then((result) => { if (current) { const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize)); if (filters.page > lastPage) setFilters({ ...filters, page: lastPage }); else setPage(result); } })
      .catch((failure: unknown) => { if (current) setError(failure instanceof Error ? failure.message : 'No se pudieron cargar las categorías.'); }).finally(() => { if (current) setLoading(false); }); }, 250);
    return () => { current = false; clearTimeout(timeout); };
  }, [filters, revision, authorized, session?.user.id]);
  if (!authorized) return <p role="alert">No tienes permiso para gestionar categorías.</p>;
  return <section className="vacancy-section">
    <div className="vacancy-header"><h1>Categorías</h1>{canManageVacancies(session, 'categories.create') && <button type="button" onClick={() => setEditor({ category: null })}>Nueva categoría</button>}</div>
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error} <button type="button" onClick={() => setRevision(revision + 1)}>Reintentar</button></p>}
    <div className="vacancy-filters"><input aria-label="Buscar categorías" placeholder="Buscar por nombre" value={filters.search} onChange={(event) => setFilters({ ...filters, page: 1, search: event.target.value })} /><select aria-label="Estado de categoría" value={filters.state ?? ''} onChange={(event) => setFilters({ ...filters, page: 1, state: (event.target.value || undefined) as typeof filters.state })}><option value="">Todos los estados</option><option value="ACTIVE">Activas</option><option value="INACTIVE">Inactivas</option></select></div>
    {loading && <p role="status">Cargando categorías…</p>}{!loading && !error && !page.items.length && <p>No hay categorías para estos filtros.</p>}
    <div className="vacancy-table-wrap"><table className="vacancy-table"><thead><tr><th>Nombre</th><th>Descripción</th><th>Estado</th><th>Vacantes</th><th>Acciones</th></tr></thead><tbody>{page.items.map((category) => <tr key={category.id}><td>{category.name}</td><td>{category.description || '—'}</td><td>{category.isActive ? 'Activa' : 'Inactiva'}</td><td>{category.opportunityCount}</td><td><div className="vacancy-actions">{canManageVacancies(session, 'categories.update') && <button type="button" onClick={() => setEditor({ category })}>Editar</button>}{canManageVacancies(session, 'categories.delete') && <button type="button" onClick={() => setRemoving(category)}>Eliminar</button>}</div></td></tr>)}</tbody></table></div>
    <div className="vacancy-pagination"><span>{page.total} categorías · Página {filters.page}</span><button disabled={loading || filters.page === 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Anterior</button><button disabled={loading || filters.page * 20 >= page.total} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Siguiente</button></div>
    {editor && <CategoryEditor category={editor.category} onCancel={() => setEditor(null)} onSaved={() => { setEditor(null); setMessage('Categoría guardada correctamente.'); setRevision(revision + 1); }} />}
    {removing && <VacancyActionDialog title="Eliminar categoría" description={`¿Eliminar ${removing.name}? Las categorías con vacantes o subcategorías deben desactivarse.`} onCancel={() => setRemoving(null)} onConfirm={async () => { await deleteCategory(removing.id); setRemoving(null); setMessage('Categoría eliminada.'); setRevision(revision + 1); }} />}
  </section>;
}
