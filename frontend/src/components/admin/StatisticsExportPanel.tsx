import { useStatisticsExports } from '../../hooks/useStatisticsExports';
import { STATISTICS_EXPORT_LABELS } from '../../utils/statisticsExport';
import { statisticsCalendarLabel } from '../../utils/statisticsPresentation';
import type { StatisticsRange } from '../../types/statistics';
import '../../styles/admin/statistics-exports.css';

interface StatisticsExportPanelProps { onRegenerate: (range: StatisticsRange) => void }
/** Queue rows expose only the current account's jobs, never workbook contents. */
export function StatisticsExportPanel({ onRegenerate }: StatisticsExportPanelProps) {
  const exports = useStatisticsExports(); if (!exports.allowed) return null;
  const pages = Math.max(1, Math.ceil(exports.total / 10));
  return <section className="statistics-box statistics-export-panel" aria-label="Exportaciones de Excel">
    <div className="statistics-box-header"><div><h3>Exportaciones de Excel</h3><span>Archivos completos · disponibles durante 24 horas después de generarse.</span></div></div>
    {exports.error && <p role="alert" className="statistics-error">{exports.error} <button type="button" className="statistics-refresh-button" onClick={exports.reload}>Reintentar seguimiento</button></p>}
    {!exports.jobs.length ? <p>No hay exportaciones solicitadas.</p> : <ul className="statistics-export-jobs">{exports.jobs.map(job => <li key={job.id}>
      <div><strong>{statisticsCalendarLabel(job.from)} — {statisticsCalendarLabel(job.to)}</strong><span>{STATISTICS_EXPORT_LABELS[job.status]}</span>
        {job.expiresAt && job.status === 'READY' && <small>Disponible hasta {new Intl.DateTimeFormat('es-SV', { timeZone: 'America/El_Salvador', dateStyle: 'short', timeStyle: 'short' }).format(new Date(job.expiresAt))} · El Salvador</small>}
        {job.error && <small>{job.error}</small>}</div>
      {job.status === 'READY' && <button type="button" className="statistics-refresh-button" disabled={exports.downloading.includes(job.id)} onClick={() => void exports.download(job)}>{exports.downloading.includes(job.id) ? 'Descargando…' : 'Descargar'}</button>}
      {(job.status === 'FAILED' || job.status === 'EXPIRED') && <button type="button" className="statistics-refresh-button" disabled={exports.requesting || Boolean(exports.activeJob)} onClick={() => onRegenerate({ from: job.from, to: job.to })}>Generar de nuevo</button>}
    </li>)}</ul>}
    {pages > 1 && <nav className="statistics-category-pagination" aria-label="Páginas de exportaciones"><button type="button" className="statistics-refresh-button" disabled={exports.page === 1} onClick={() => exports.setPage(exports.page - 1)}>Anterior</button><span>Página {exports.page} de {pages}</span><button type="button" className="statistics-refresh-button" disabled={exports.page >= pages} onClick={() => exports.setPage(exports.page + 1)}>Siguiente</button></nav>}
  </section>;
}
/** This monitor remains mounted when the user navigates away from Estadísticas. */
export function StatisticsExportMonitor() {
  const exports = useStatisticsExports(); if (!exports.allowed) return null;
  const pending = exports.activeJob;
  if (!pending && !exports.notice && !exports.error) return null;
  return <aside className="statistics-export-monitor" aria-label="Seguimiento de Excel">
    <p role={exports.error ? 'alert' : 'status'}>{exports.error || (pending ? 'Exportación Excel · ' + STATISTICS_EXPORT_LABELS[pending.status] : exports.notice)}</p>
    {!pending && <button type="button" onClick={exports.dismiss} aria-label="Cerrar aviso de Excel">×</button>}
  </aside>;
}
