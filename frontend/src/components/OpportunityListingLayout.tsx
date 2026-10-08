import { useId, type ReactNode } from 'react';

/** Shared public filters and server pagination supplied by the application shell. */
export interface OpportunityListingControls {
  categories: string[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchLocation: string;
  onLocationChange: (value: string) => void;
  selectedArea: string;
  onAreaChange: (value: string) => void;
  onClear: () => void;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading: boolean;
  error: string;
  catalogError: string;
  onRetry: () => void;
  onRetryCatalogs: () => void;
}

interface OpportunityListingLayoutProps {
  controls: OpportunityListingControls;
  children: ReactNode;
  salaryFilter?: {
    maximum: number;
    onChange: (value: number) => void;
  };
}

/** Keeps public filters below each banner using the employment listing's existing design. */
export function OpportunityListingLayout({ controls, children, salaryFilter }: OpportunityListingLayoutProps) {
  const fieldId = useId();
  const totalPages = Math.max(1, Math.ceil(controls.total / controls.pageSize));

  return (
    <div className="listing-wrap opportunity-listing">
      <aside className="l-aside" aria-label="Filtros de oportunidades">
        <div className="aside-hd">
          FILTROS
          <button type="button" aria-label="Limpiar filtros" onClick={controls.onClear}>Limpiar</button>
        </div>
        <div className="fg">
          <p className="fg-lbl">Área de impacto</p>
          <div className="ftags" role="group" aria-label="Área de impacto">
            {['Todos', ...controls.categories].map((area) => (
              <button
                key={area}
                type="button"
                className={`ftag ${controls.selectedArea === area ? 'on' : ''}`}
                aria-pressed={controls.selectedArea === area}
                onClick={() => controls.onAreaChange(area)}
              >
                {area}
              </button>
            ))}
          </div>
        </div>
        {salaryFilter && (
          <div className="fg">
            <label className="fg-lbl" htmlFor={`${fieldId}-salary`}>Salario mensual máximo</label>
            <div className="range-wrap">
              <input
                id={`${fieldId}-salary`}
                type="range"
                min="200"
                max="1500"
                step="50"
                value={salaryFilter.maximum}
                onChange={(event) => salaryFilter.onChange(Number(event.target.value))}
              />
              <div className="range-val">{salaryFilter.maximum === 1500 ? 'Sin límite' : `Hasta $${salaryFilter.maximum}`}</div>
            </div>
          </div>
        )}
        <div className="aside-div" />
        <div className="fg">
          <label className="fg-lbl" htmlFor={`${fieldId}-location`}>Departamento o municipio</label>
          <input
            id={`${fieldId}-location`}
            className="filter-input"
            placeholder="Departamento o municipio"
            value={controls.searchLocation === 'Todo el país' ? '' : controls.searchLocation}
            onChange={(event) => controls.onLocationChange(event.target.value || 'Todo el país')}
          />
        </div>
      </aside>

      <div className="l-main">
        <div className="l-topbar">
          <div className="srch-inline">
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--c400)" strokeWidth="2.5">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              aria-label="Buscar oportunidades"
              placeholder="Buscar por título u organización…"
              value={controls.searchQuery}
              onChange={(event) => controls.onSearchChange(event.target.value)}
            />
          </div>
          <span className="res-info"><strong>{controls.total}</strong> resultados</span>
        </div>

        {(controls.loading || controls.error || controls.catalogError || !controls.total) && (
          <div className="opportunity-listing-status">
            {controls.loading && <p role="status">Cargando oportunidades…</p>}
            {controls.error && <p role="alert">{controls.error} <button type="button" onClick={controls.onRetry}>Reintentar</button></p>}
            {controls.catalogError && <p role="alert">{controls.catalogError} <button type="button" onClick={controls.onRetryCatalogs}>Reintentar filtros</button></p>}
            {!controls.loading && !controls.error && !controls.total && <p>No hay oportunidades disponibles para estos filtros.</p>}
          </div>
        )}

        {!controls.loading && !controls.error && controls.total > 0 && children}

        {!controls.loading && !controls.error && controls.total > 0 && (
          <nav className="opportunity-pagination" aria-label="Paginación de oportunidades">
            <span>{controls.total} oportunidades · Página {controls.page} de {totalPages}</span>
            <div className="opportunity-pagination-buttons">
              <button type="button" disabled={controls.page <= 1} onClick={() => controls.onPageChange(controls.page - 1)}>Anterior</button>
              <button type="button" disabled={controls.page >= totalPages} onClick={() => controls.onPageChange(controls.page + 1)}>Siguiente</button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
