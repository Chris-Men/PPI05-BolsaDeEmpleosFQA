import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useSavedOpportunityState } from '../../hooks/useSavedOpportunities';
import { listSavedOpportunities } from '../../services/savedOpportunityService';
import type { SavedOpportunityPage } from '../../types/savedOpportunity';
import { KIND_LABELS, STATUS_LABELS } from '../../types/opportunity';
import { SaveOpportunityButton } from './SaveOpportunityButton';
import '../../styles/users/savedOpportunities.css';

interface SavedOpportunityListProps { onView: (key: string) => void; onExplore: () => void }

/** Own summaries include unavailable vacancies and never depend on the public listing's current page. */
export function SavedOpportunityList({ onView, onExplore }: SavedOpportunityListProps) {
  const state = useSavedOpportunityState();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SavedOpportunityPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!state.userId || !state.canRead) { setLoading(false); setResult(null); return; }
    const controller = new AbortController();
    setLoading(true); setError('');
    void listSavedOpportunities(state.userId, page, controller.signal).then(value => {
      if (controller.signal.aborted) return;
      const lastPage = Math.max(1, Math.ceil(value.total / value.pageSize));
      if (page > lastPage) { setPage(lastPage); return; }
      setResult(value);
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'No se pudieron cargar las guardadas.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [state.userId, state.canRead, state.revision, page, revision]);
  const retry = (): void => { state.reload(); setRevision(value => value + 1); };
  return <>
    {!state.canRead ? <p className="saved-list-error" role="alert">No tienes permiso para consultar guardadas.</p>
      : error ? <div className="saved-list-error" role="alert"><p>{error}</p><button type="button" className="profile-small-button" onClick={retry}>Reintentar</button></div>
      : loading ? <p className="saved-list-loading" role="status">Cargando guardadas…</p>
      : !result?.items.length ? <div className="profile-empty-simple"><Star size={34} aria-hidden="true" /><p>No tienes vacantes guardadas todavía.</p><button type="button" className="profile-primary-button" onClick={onExplore}>Explorar vacantes</button></div>
      : <div className="profile-list saved-opportunity-list">{result.items.map(item => <article key={item.key} className="profile-list-item saved-opportunity-item">
        <div className="profile-list-info"><h3>{item.title}</h3><p>{item.organization?.name ?? 'Sin organización'} · {KIND_LABELS[item.kind]}</p>
          <p>{[item.municipality, item.department].filter(Boolean).join(', ') || 'Ubicación sin especificar'}</p>
          {item.category && <p>{item.category.name}</p>}
          {item.savedAt && <time dateTime={item.savedAt}>Guardada el {new Date(item.savedAt).toLocaleDateString('es-SV')}</time>}
          {!item.available && <span className="saved-unavailable">No disponible · {STATUS_LABELS[item.status]}</span>}
        </div>
        <div className="profile-list-actions"><button type="button" className="profile-small-button" disabled={!item.available} onClick={() => onView(item.key)}>Ver vacante</button>
          <SaveOpportunityButton opportunityKey={item.key} className="profile-small-button profile-danger-outline" variant="remove" />
        </div>
      </article>)}</div>}
    {result && !error && !loading && result.total > 0 && <nav className="saved-pagination" aria-label="Páginas de guardadas">
      <button type="button" className="profile-small-button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Anterior</button>
      <span>Página {page} de {Math.max(1, Math.ceil(result.total / result.pageSize))} · {result.total} guardadas</span>
      <button type="button" className="profile-small-button" disabled={page * result.pageSize >= result.total} onClick={() => setPage(value => value + 1)}>Siguiente</button>
    </nav>}
  </>;
}
