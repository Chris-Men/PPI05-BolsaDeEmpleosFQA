import { useEffect, useState, type FormEvent } from 'react';
import { useAdministrativeStatistics } from '../../hooks/useAdministrativeStatistics';
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
  const data = result.data;
  const firstActivityDate = data?.range.firstActivityDate;
  /** A refresh may discover older imported activity; lifetime keeps the calendars and applied range aligned. */
  useEffect(() => {
    if (preset !== 'lifetime' || !firstActivityDate) return;
    const next = statisticsPresetRange('lifetime', new Date(), firstActivityDate);
    if (next.from !== range.from || next.to !== range.to) { setDraft(next); setRange(next); }
  }, [preset, firstActivityDate, range.from, range.to]);
  const metric = (value: number | undefined): string => value === undefined ? '—' : value.toLocaleString('es-SV');
  /** Incomplete inputs preserve the last valid applied range. */
  const apply = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault(); const message = statisticsRangeError(draft); setError(message);
    if (!message) { setRange({ ...draft }); result.reload(); }
  };
  return <section className="admin-screen estadisticas-screen" aria-busy={result.loading}>
    <div className="screen-header"><form className="statistics-header-actions statistics-calendar" onSubmit={apply}>
      <label>Período rápido<select className="period-select" value={preset} onChange={event => {
        const next = event.target.value as StatisticsPreset; setPreset(next);
        if (next !== 'custom') { const value = statisticsPresetRange(next, new Date(), firstActivityDate); setDraft(value); setRange(value); setError(''); }
      }}><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option><option value="year">Este año</option><option value="lifetime" disabled={!firstActivityDate}>Desde el inicio</option><option value="custom">Personalizado</option></select></label>
      <label>Desde<input type="date" value={draft.from} required onChange={event => { setDraft(value => ({ ...value, from: event.target.value })); setPreset('custom'); }} /></label>
      <label>Hasta<input type="date" value={draft.to} required onChange={event => { setDraft(value => ({ ...value, to: event.target.value })); setPreset('custom'); }} /></label>
      <button type="submit" className="statistics-refresh-button">Aplicar</button>
      <button type="button" className="statistics-refresh-button" disabled={result.loading} onClick={result.reload}>{result.loading ? 'Actualizando…' : 'Actualizar'}</button>
    </form></div>
    {error && <p role="alert" className="statistics-error">{error}</p>}
    {result.error && <p role="alert" className="statistics-error">{result.error} <button type="button" onClick={result.reload}>Reintentar indicadores</button></p>}
    {result.loading && <p role="status">Cargando indicadores…</p>}
    <div className="statistics-grid">
      <div className="stat-card"><span>Oportunidades publicadas</span><strong>{metric(data?.publishedOpportunities)}</strong><small>Primera publicación en el período</small></div>
      <div className="stat-card"><span>Postulaciones</span><strong>{metric(data?.applications)}</strong><small>Intentos recibidos en el período</small></div>
      <div className="stat-card"><span>Organizaciones</span><strong>{metric(data?.organizations)}</strong><small>Total acumulado · activas e inactivas</small></div>
      <div className="stat-card"><span>Postulantes</span><strong>{metric(data?.applicants)}</strong><small>Candidatos únicos del período</small></div>
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
    <div className="statistics-box statistics-summary"><div className="statistics-box-header"><div><h3>Resumen operativo</h3><span>Totales acumulados, actividad del período y disponibilidad actual.</span></div></div><div className="summary-grid">
      <div className="summary-item"><span>Usuarios registrados</span><strong>{metric(data?.users.total)}</strong><small>Acumulado · candidatos activos y no eliminados</small></div>
      <div className="summary-item"><span>Candidatos registrados</span><strong>{metric(data?.users.candidates)}</strong><small>Acumulado · activos y deshabilitados</small></div>
      <div className="summary-item"><span>Usuarios seleccionados alguna vez</span><strong>{metric(data?.users.selected)}</strong><small>Candidatos activos · cada persona cuenta una vez</small></div>
      <div className="summary-item"><span>Usuarios con alguna selección</span><strong>{data ? data.users.selectionRate.toFixed(1) + '%' : '—'}</strong><small>Porcentaje de los candidatos activos registrados</small></div>
      <div className="summary-item"><span>Candidatos nuevos</span><strong>{metric(data?.users.newCandidates)}</strong><small>Registrados en el período seleccionado</small></div>
      <div className="summary-item"><span>Candidatos con CV activo</span><strong>{metric(data?.users.withResume)}</strong><small>Actual · CV disponible en su perfil</small></div>
      <div className="summary-item"><span>Vacantes con postulaciones</span><strong>{metric(data?.opportunitiesWithApplications)}</strong><small>Recibieron al menos una en el período</small></div>
      <div className="summary-item"><span>Postulaciones por revisar</span><strong>{metric(data?.pendingApplications)}</strong><small>Del período · pendientes o en revisión</small></div>
      <div className="summary-item"><span>Postulaciones por vacante con postulaciones</span><strong>{data?.applicationsPerOpportunity.toFixed(1) ?? '—'}</strong><small>Promedio del período seleccionado</small></div>
      <div className="summary-item"><span>Tasa de selección del período</span><strong>{data ? data.selectionRate.toFixed(1) + '%' : '—'}</strong><small>Postulaciones seleccionadas del período</small></div>
      <div className="summary-item"><span>Oportunidades activas actualmente</span><strong>{metric(data?.activeOpportunities)}</strong><small>Actual · disponibles para postular</small></div>
      <div className="summary-item"><span>Período consultado · El Salvador</span><strong>{range.from} — {range.to}</strong></div>
    </div></div>
  </section>;
}
