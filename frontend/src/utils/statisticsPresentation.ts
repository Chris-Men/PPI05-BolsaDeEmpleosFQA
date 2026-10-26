import type { AdministrativeStatistics, CandidateDemographics, DistributionRow } from '../types/statistics';

/** Cards share labels, scope and formatting between the screen and the exported report. */
export interface StatisticsCard {
  key: string; label: string; value: string; description: string; scope: 'Período' | 'Acumulado' | 'Actual';
}

/** Pending indicators remain unknown instead of being formatted as zero. */
const count = (value: number | undefined): string => value === undefined ? '—' : value.toLocaleString('es-SV');
const percent = (value: number | undefined): string => value === undefined ? '—' : value.toFixed(1) + '%';

/** Main totals come directly from the same server snapshot as the charts. */
export const primaryStatisticsCards = (data: AdministrativeStatistics | null): StatisticsCard[] => [
  { key: 'published', label: 'Oportunidades publicadas', value: count(data?.publishedOpportunities), description: 'Primera publicación en el período', scope: 'Período' },
  { key: 'applications', label: 'Postulaciones', value: count(data?.applications), description: 'Intentos recibidos en el período', scope: 'Período' },
  { key: 'organizations', label: 'Organizaciones', value: count(data?.organizations), description: 'Total acumulado · activas e inactivas', scope: 'Acumulado' },
  { key: 'applicants', label: 'Postulantes', value: count(data?.applicants), description: 'Candidatos únicos del período', scope: 'Período' },
];

/** Scope notes preserve the distinction between active candidates, lifetime selections and dated attempts. */
export const operationalStatisticsCards = (data: AdministrativeStatistics | null): StatisticsCard[] => [
  { key: 'users', label: 'Usuarios registrados', value: count(data?.users.total), description: 'Acumulado · candidatos activos y no eliminados', scope: 'Acumulado' },
  { key: 'candidates', label: 'Candidatos registrados', value: count(data?.users.candidates), description: 'Acumulado · activos y deshabilitados', scope: 'Acumulado' },
  { key: 'selectedUsers', label: 'Usuarios seleccionados alguna vez', value: count(data?.users.selected), description: 'Candidatos activos · cada persona cuenta una vez', scope: 'Acumulado' },
  { key: 'selectedUsersRate', label: 'Usuarios con alguna selección', value: percent(data?.users.selectionRate), description: 'Porcentaje de los candidatos activos registrados', scope: 'Acumulado' },
  { key: 'newCandidates', label: 'Candidatos nuevos', value: count(data?.users.newCandidates), description: 'Registrados en el período seleccionado', scope: 'Período' },
  { key: 'resume', label: 'Candidatos con CV activo', value: count(data?.users.withResume), description: 'Actual · CV disponible en su perfil', scope: 'Actual' },
  { key: 'receivedOpportunities', label: 'Vacantes con postulaciones', value: count(data?.opportunitiesWithApplications), description: 'Recibieron al menos una en el período', scope: 'Período' },
  { key: 'average', label: 'Postulaciones por vacante con postulaciones', value: data?.applicationsPerOpportunity.toFixed(1) ?? '—', description: 'Promedio del período seleccionado', scope: 'Período' },
  { key: 'selectionRate', label: 'Tasa de selección del período', value: percent(data?.selectionRate), description: 'Postulaciones seleccionadas del período', scope: 'Período' },
];

/** ISO calendar dates are formatted without conversion to the browser's local timezone. */
export const statisticsCalendarLabel = (value: string): string => value.split('-').reverse().join('/');

/** The same percentage text is used on screen and in vector reports, including zero populations. */
export const distributionPercent = (value: number, total: number): string => (total ? value * 100 / total : 0).toFixed(1) + '%';

/** Ranks at most five visible groups without changing API aggregates or the full-roster denominator. */
const topDemographicGroups = (rows: DistributionRow[] | undefined): DistributionRow[] | undefined => rows
  ?.filter(row => row.key !== 'OTHER')
  .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es') || a.key.localeCompare(b.key))
  .slice(0, 5);

/** Shared chart definitions keep roster scope and captions consistent across both outputs. */
export interface StatisticsDistribution { key: string; title: string; rows: DistributionRow[] | undefined; total: number | undefined }
export const demographicStatisticsCharts = (data: CandidateDemographics | undefined): StatisticsDistribution[] => [
  { key: 'age', title: 'Edad', rows: data?.byAge, total: data?.totalCandidates },
  { key: 'sex', title: 'Sexo', rows: data?.bySex, total: data?.totalCandidates },
  { key: 'education', title: 'Nivel educativo · Top 5', rows: topDemographicGroups(data?.byEducationLevel), total: data?.totalCandidates },
  { key: 'department', title: 'Departamento de residencia · Top 5', rows: topDemographicGroups(data?.byDepartment), total: data?.totalCandidates },
];
