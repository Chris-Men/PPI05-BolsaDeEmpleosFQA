import { useId, useState } from 'react';
import type { CandidateDemographics, CategoryStatistics } from '../../types/statistics';
import { demographicStatisticsCharts, distributionPercent, statisticsCalendarLabel, type StatisticsDistribution } from '../../utils/statisticsPresentation';

/** Undefined values represent a pending or failed aggregate request. */
interface CategoryStatisticsTableProps { rows: CategoryStatistics[] | undefined; published: number | undefined; applications: number | undefined }
/** The section receives one cumulative snapshot for all charts. */
interface CandidateDemographicsSectionProps { data: CandidateDemographics | undefined }
/** React consumes the chart key separately from its presentation properties. */
type DistributionChartProps = Omit<StatisticsDistribution, 'key'>;

/** Client pagination only slices aggregate rows; totals always describe the whole applied period. */
export function CategoryStatisticsTable({ rows, published, applications }: CategoryStatisticsTableProps) {
  const [page, setPage] = useState(0);
  const titleId = useId(); const pageSize = 10;
  const pages = Math.max(1, Math.ceil((rows?.length ?? 0) / pageSize)); const currentPage = Math.min(page, pages - 1);
  return <section className="statistics-box statistics-category-panel" aria-labelledby={titleId}>
    <div className="statistics-box-header"><div><h3 id={titleId}>Oferta y demanda por categoría</h3><span>Publicaciones y postulaciones del período, según la categoría actual de cada oportunidad.</span></div></div>
    {!rows ? <p>Esperando indicadores…</p> : !rows.length ? <p>No hubo publicaciones ni postulaciones en este período.</p> : <>
      <div className="statistics-table-scroll" tabIndex={0} role="region" aria-label="Tabla de oferta y demanda por categoría"><table className="statistics-category-table">
        <caption>Las postulaciones pueden corresponder a oportunidades publicadas antes del período.</caption>
        <thead><tr><th scope="col">Categoría</th><th scope="col">Oportunidades publicadas</th><th scope="col">Postulaciones recibidas</th></tr></thead>
        <tbody>{rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(row => <tr key={row.categoryId ?? 'uncategorized'}>
          <th scope="row">{row.name}</th><td>{row.publishedOpportunities.toLocaleString('es-SV')}</td><td>{row.applications.toLocaleString('es-SV')}</td>
        </tr>)}</tbody>
        <tfoot><tr><th scope="row">Total del período</th><td>{published?.toLocaleString('es-SV') ?? '—'}</td><td>{applications?.toLocaleString('es-SV') ?? '—'}</td></tr></tfoot>
      </table></div>
      {pages > 1 && <nav className="statistics-category-pagination" aria-label="Páginas de categorías">
        <button type="button" className="statistics-refresh-button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</button>
        <span aria-live="polite">Página {currentPage + 1} de {pages} · {rows.length} categorías</span>
        <button type="button" className="statistics-refresh-button" disabled={currentPage + 1 === pages} onClick={() => setPage(currentPage + 1)}>Siguiente</button>
      </nav>}
    </>}
  </section>;
}

/** Counts and percentages remain readable without relying on the bar's color or width. */
function DistributionChart({ title, rows, total }: DistributionChartProps) {
  const titleId = useId();
  return <section className="statistics-box statistics-distribution-chart" aria-labelledby={titleId}>
    <div className="statistics-box-header"><div><h3 id={titleId}>{title}</h3><span>Candidatos activos · acumulado</span></div></div>
    {total === undefined || !rows ? <p>Esperando indicadores…</p> : total === 0 ? <p>No hay candidatos activos registrados.</p> : <ul className="statistics-distribution-list">
      {rows.map(row => <li key={row.key}><div className="statistics-distribution-label"><span>{row.label}</span>
        <strong>{row.count.toLocaleString('es-SV')} <small>({distributionPercent(row.count, total)})</small></strong></div>
        <div className="statistics-distribution-track" aria-hidden="true"><span style={{ width: (row.count * 100 / total) + '%' }} /></div>
      </li>)}
    </ul>}
  </section>;
}

/** All four charts describe the current active roster, independently of dated opportunity activity. */
export function CandidateDemographicsSection({ data }: CandidateDemographicsSectionProps) {
  return <section className="statistics-demographics" aria-label="Perfil del padrón de candidatos">
    <header className="statistics-demographics-heading"><div><h3>Perfil del padrón de candidatos</h3>
      <p>Acumulado · candidatos activos, no eliminados y sin roles administrativos.</p>
      {data && <p>Datos al {statisticsCalendarLabel(data.asOfDate)} · El Salvador. Independiente del período consultado.</p>}</div>
      <strong>{data?.totalCandidates.toLocaleString('es-SV') ?? '—'} candidatos</strong>
    </header>
    <div className="statistics-breakdown-grid">{demographicStatisticsCharts(data).map(({ key, ...chart }) => <DistributionChart key={key} {...chart} />)}</div>
  </section>;
}
