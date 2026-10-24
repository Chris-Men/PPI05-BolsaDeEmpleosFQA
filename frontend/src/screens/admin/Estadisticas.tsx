import { useEffect, useState, type FormEvent } from 'react';
import { useAdministrativeStatistics } from '../../hooks/useAdministrativeStatistics';
import { useOperationalReport } from '../../hooks/useOperationalReport';
import { Download } from 'lucide-react';
import { operationalStatisticsCards, primaryStatisticsCards, statisticsCalendarLabel } from '../../utils/statisticsPresentation';
import { CandidateDemographicsSection, CategoryStatisticsTable } from '../../components/admin/StatisticsBreakdowns';
import { statisticsPresetRange, statisticsRangeError, type StatisticsPreset } from '../../utils/statisticsDates';
import { APPLICATION_LABELS } from '../../types/application';
import { KIND_LABELS } from '../../types/opportunity';
import '../../styles/admin/estadisticas.css';

/** Replaces prototype calculations over paginated rows with one consistent server snapshot. */
export default function Estadisticas() {
  const [range, setRange] = useState(() => statisticsPresetRange('30'));
  const [draft, setDraft] = useState(range);
  const [preset, setPreset] = useState<StatisticsPreset>('30');
  const [error, setError] = useState('');
  const result = useAdministrativeStatistics(range);
  const report = useOperationalReport(range);
  const data = result.data;
  const unapplied = draft.from !== range.from || draft.to !== range.to;
  const canExport = Boolean(data && !result.loading && !report.busy && !unapplied);
  const firstActivityDate = data?.range.firstActivityDate;
  /** A refresh may discover older imported activity; lifetime keeps the calendars and applied range aligned. */
  useEffect(() => {
    if (preset !== 'lifetime' || !firstActivityDate) return;
    const next = statisticsPresetRange('lifetime', new Date(), firstActivityDate);
    if (next.from !== range.from || next.to !== range.to) { setDraft(next); setRange(next); }
  }, [preset, firstActivityDate, range.from, range.to]);
  /** Incomplete inputs preserve the last valid applied range. */
  const apply = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault(); const message = statisticsRangeError(draft); setError(message);
    if (!message) { setRange({ ...draft }); result.reload(); }
  };
  return <section className="admin-screen estadisticas-screen" aria-busy={result.loading}>
    <div className="screen-header"><form className="statistics-header-actions statistics-calendar" onSubmit={apply}>
      <label>Período rápido<select className="period-select" value={preset} disabled={report.busy} onChange={event => {
        const next = event.target.value as StatisticsPreset; setPreset(next);
        if (next !== 'custom') { const value = statisticsPresetRange(next, new Date(), firstActivityDate); setDraft(value); setRange(value); setError(''); }
      }}><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option><option value="year">Este año</option><option value="lifetime" disabled={!firstActivityDate}>Desde el inicio</option><option value="custom">Personalizado</option></select></label>
      <label>Desde<input type="date" value={draft.from} required disabled={report.busy} onChange={event => { setDraft(value => ({ ...value, from: event.target.value })); setPreset('custom'); }} /></label>
      <label>Hasta<input type="date" value={draft.to} required disabled={report.busy} onChange={event => { setDraft(value => ({ ...value, to: event.target.value })); setPreset('custom'); }} /></label>
      <button type="submit" className="statistics-refresh-button" disabled={report.busy}>Aplicar</button>
      <button type="button" className="statistics-refresh-button" disabled={result.loading || report.busy} onClick={result.reload}>{result.loading ? 'Actualizando…' : 'Actualizar'}</button>
      <button type="button" className="statistics-refresh-button statistics-export-button" aria-busy={report.busy} aria-describedby="statistics-export-hint" disabled={!canExport} onClick={() => void report.download()}><Download size={16} aria-hidden="true" />{report.busy ? 'Generando PDF…' : 'Exportar PDF'}</button>
    </form></div>
    <p className="statistics-export-hint" id="statistics-export-hint">{unapplied ? 'Aplica el período elegido antes de exportar.' : 'El PDF incluirá los indicadores y gráficas actualizados del período aplicado.'}</p>
    {report.error && <div role="alert" className="statistics-error statistics-report-error">{report.error} <button type="button" className="statistics-refresh-button" disabled={!canExport} onClick={() => void report.download()}>Reintentar descarga</button></div>}
    {report.notice && <p role="status" className="statistics-report-notice">{report.notice}</p>}
    {error && <p role="alert" className="statistics-error">{error}</p>}
    {result.error && <p role="alert" className="statistics-error">{result.error} <button type="button" onClick={result.reload}>Reintentar indicadores</button></p>}
    {result.loading && <p role="status">Cargando indicadores…</p>}
    <div className="statistics-grid">
      {primaryStatisticsCards(data).map(card => <div className="stat-card" key={card.key}><span>{card.label}</span><strong>{card.value}</strong><small>{card.description}</small></div>)}
    </div>
    <div className="statistics-columns">
      <div className="statistics-box"><div className="statistics-box-header"><div><h3>Oportunidades por tipo</h3><span>Publicadas durante el período seleccionado.</span></div></div>
        <div className="progress-list">{data?.byKind.map(item => {
          const percent = data.publishedOpportunities ? item.count * 100 / data.publishedOpportunities : 0;
          return <div className="progress-item" key={item.kind}><div><span>{KIND_LABELS[item.kind]}</span><strong>{percent.toFixed(1)}%</strong></div><div className="progress"><span style={{ width: percent + '%' }} /></div><small>{item.count} oportunidades</small></div>;
        })}{data?.publishedOpportunities === 0 && <p>No hubo publicaciones en este período.</p>}</div>
      </div>
      <div className="statistics-box"><div className="statistics-box-header"><div><h3>Estado de postulaciones</h3><span>Estado actual de los intentos recibidos en el período.</span></div></div>
        <div className="simple-stat-list">{data?.states.map(item => <div key={item.status}><span>{APPLICATION_LABELS[item.status]}</span><strong>{item.count}</strong></div>)}{data?.applications === 0 && <p>No hubo postulaciones en este período.</p>}</div>
      </div>
    </div>
    <CategoryStatisticsTable key={range.from + '/' + range.to} rows={data?.byCategory} published={data?.publishedOpportunities} applications={data?.applications} />
    <div className="statistics-box statistics-summary"><div className="statistics-box-header"><div><div className="statistics-summary-title"><h3>Resumen operativo</h3>
      <p className="statistics-applied-period">Período consultado · El Salvador: {statisticsCalendarLabel(range.from)} — {statisticsCalendarLabel(range.to)}</p></div>
      <span>Indicadores acumulados, actividad del período y documentos actuales.</span></div></div><div className="summary-grid">
      {operationalStatisticsCards(data).map(card => <div className="summary-item" key={card.key}><span>{card.label}</span><strong>{card.value}</strong><small>{card.description}</small></div>)}
    </div></div>
    <CandidateDemographicsSection data={data?.demographics} />
  </section>;
}
