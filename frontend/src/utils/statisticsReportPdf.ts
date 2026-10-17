import { jsPDF } from 'jspdf';
import type { AdministrativeStatistics } from '../types/statistics';
import { APPLICATION_LABELS } from '../types/application';
import { KIND_LABELS } from '../types/opportunity';
import { operationalStatisticsCards, primaryStatisticsCards, statisticsCalendarLabel, type StatisticsCard } from './statisticsPresentation';

interface ReportOptions { generatedAt: Date; logoDataUrl?: string }
export interface OperationalReport { blob: Blob; fileName: string }
interface ChartRow { label: string; count: number; color: string }

const palette = { dark: '#193007', green: '#82BA2E', text: '#374151', muted: '#64748B', border: '#E1E9DD', pale: '#F6F9F1' };

/** Draws searchable text at a size that fits its allocated width, including large totals. */
function fittedText(pdf: jsPDF, text: string, x: number, y: number, width: number, size: number, align: 'left' | 'right' = 'left'): void {
  pdf.setFontSize(size);
  while (pdf.getTextWidth(text) > width && size > 7) { size -= .5; pdf.setFontSize(size); }
  pdf.text(text, x, y, { align });
}

/** Wrapped labels are limited by the known card layout rather than rasterized screenshots. */
function wrappedText(pdf: jsPDF, text: string, x: number, y: number, width: number, size: number): void {
  pdf.setFontSize(size); pdf.text(pdf.splitTextToSize(text, width) as string[], x, y, { lineHeightFactor: 1.25 });
}

/** Vector cards retain the application's green palette when printed or zoomed. */
function drawCard(pdf: jsPDF, card: StatisticsCard, x: number, y: number): void {
  pdf.setFillColor('#FFFFFF'); pdf.setDrawColor(palette.border); pdf.roundedRect(x, y, 86, 36, 3, 3, 'FD');
  pdf.setFillColor(palette.green); pdf.roundedRect(x, y, 1.5, 36, .7, .7, 'F');
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(palette.muted);
  wrappedText(pdf, card.label, x + 6, y + 7, 74, 9);
  pdf.setFont('helvetica', 'bold'); pdf.setTextColor(palette.dark);
  fittedText(pdf, card.value, x + 6, y + 22, 74, 23);
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(palette.muted);
  wrappedText(pdf, card.description, x + 6, y + 29, 74, 7);
}

/** Horizontal bars carry counts and percentages, so meaning never depends on color alone. */
function drawChart(pdf: jsPDF, title: string, subtitle: string, rows: ChartRow[], total: number, y: number, height: number): void {
  pdf.setFillColor('#FFFFFF'); pdf.setDrawColor(palette.border); pdf.roundedRect(16, y, 178, height, 3, 3, 'FD');
  pdf.setFont('helvetica', 'bold'); pdf.setTextColor(palette.dark); pdf.setFontSize(12); pdf.text(title, 22, y + 10);
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(palette.muted); pdf.setFontSize(8); pdf.text(subtitle, 22, y + 17);
  if (!total) {
    pdf.setFillColor(palette.pale); pdf.roundedRect(22, y + 26, 166, height - 35, 2, 2, 'F');
    wrappedText(pdf, 'Sin registros en el período seleccionado.', 29, y + 40, 150, 10); return;
  }
  const maximum = Math.max(1, ...rows.map(row => row.count));
  const chartX = 76; const chartWidth = 77;
  rows.forEach((row, index) => {
    const lineY = y + 30 + index * (rows.length > 5 ? 11 : 13);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(palette.text);
    fittedText(pdf, row.label, 22, lineY + 2, 50, 9);
    pdf.setFillColor(palette.pale); pdf.roundedRect(chartX, lineY - 3, chartWidth, 6, 1, 1, 'F');
    const width = row.count / maximum * chartWidth;
    if (width > 0) { pdf.setFillColor(row.color); pdf.rect(chartX, lineY - 3, width, 6, 'F'); }
    pdf.setTextColor(palette.dark);
    fittedText(pdf, row.count.toLocaleString('es-SV') + ' (' + (row.count * 100 / total).toFixed(1) + '%)', 188, lineY + 2, 32, 8, 'right');
  });
  const axisY = y + height - 9;
  pdf.setDrawColor(palette.border); pdf.line(chartX, axisY - 4, chartX + chartWidth, axisY - 4);
  const ticks = Math.min(4, maximum);
  for (let index = 0; index <= ticks; index++) {
    const x = chartX + chartWidth * index / ticks;
    pdf.line(x, axisY - 5, x, axisY - 3); pdf.setTextColor(palette.muted); pdf.setFontSize(7);
    pdf.text(Math.round(maximum * index / ticks).toLocaleString('es-SV'), x, axisY, { align: 'center' });
  }
}

/** Creates a three-page A4 report from one authorized API snapshot; no personal data or external services are used. */
export function createOperationalReport(data: AdministrativeStatistics, options: ReportOptions): OperationalReport {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  pdf.setProperties({ title: 'Reporte operativo — FQA Empleos', subject: 'Indicadores del ' + data.range.from + ' al ' + data.range.to,
    author: 'Fundación Quintanilla Amaya', creator: 'FQA Empleos' });
  pdf.setCreationDate(options.generatedAt);
  const range = statisticsCalendarLabel(data.range.from) + ' al ' + statisticsCalendarLabel(data.range.to);
  const generated = new Intl.DateTimeFormat('es-SV', { timeZone: 'America/El_Salvador', dateStyle: 'medium', timeStyle: 'short' }).format(options.generatedAt);
  const primary = primaryStatisticsCards(data); const operational = operationalStatisticsCards(data);
  /** Headers and footers stay outside every content box and repeat on all pages. */
  const page = (title: string): void => {
    pdf.setFillColor(palette.pale); pdf.rect(0, 0, 210, 297, 'F');
    pdf.setFillColor(palette.dark); pdf.roundedRect(16, 14, 178, 31, 3, 3, 'F');
    if (options.logoDataUrl) {
      const image = pdf.getImageProperties(options.logoDataUrl); const scale = Math.min(45 / image.width, 21 / image.height);
      pdf.addImage(options.logoDataUrl, 'PNG', 22, 14 + (31 - image.height * scale) / 2, image.width * scale, image.height * scale);
    }
    else { pdf.setTextColor('#FFFFFF'); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15); pdf.text('FQA Empleos', 22, 30); }
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor('#FFFFFF'); pdf.setFontSize(17); pdf.text('Reporte operativo', 75, 27);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor('#DDECCB'); pdf.setFontSize(9); pdf.text(title, 75, 35);
    pdf.setTextColor(palette.text); pdf.setFontSize(9); pdf.text('Período: ' + range, 16, 53);
    pdf.setTextColor(palette.muted); pdf.setFontSize(8); pdf.text('Generado: ' + generated + ' · El Salvador', 16, 59);
  };
  page('Resumen ejecutivo');
  pdf.setFont('helvetica', 'bold'); pdf.setTextColor(palette.dark); pdf.setFontSize(12); pdf.text('Actividad y organizaciones', 16, 72);
  primary.forEach((card, index) => drawCard(pdf, card, 16 + index % 2 * 92, 79 + Math.floor(index / 2) * 42));
  pdf.setFont('helvetica', 'bold'); pdf.setTextColor(palette.dark); pdf.setFontSize(12); pdf.text('Personas y disponibilidad', 16, 173);
  operational.filter(card => ['users', 'selectedUsers', 'selectedUsersRate', 'active'].includes(card.key))
    .forEach((card, index) => drawCard(pdf, card, 16 + index % 2 * 92, 180 + Math.floor(index / 2) * 42));
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(palette.muted);
  wrappedText(pdf, 'Los datos del período conviven con totales acumulados e indicadores actuales. Consulta el alcance de cada indicador en la página 3.', 16, 270, 178, 8);

  pdf.addPage(); page('Gráficas del período');
  drawChart(pdf, 'Oportunidades por tipo', 'Primera publicación dentro del período, aunque la vacante haya cerrado.',
    data.byKind.map((row, index) => ({ label: KIND_LABELS[row.kind], count: row.count, color: ['#82BA2E', '#3C8B55', '#2F7E8D', '#B48B36'][index % 4]! })), data.publishedOpportunities, 69, 94);
  const stateColors = { PENDING: '#D4A33D', IN_REVIEW: '#2F7E8D', SELECTED: '#5BA222', REJECTED: '#BE5965', WITHDRAWN: '#88917F', UNKNOWN: '#64748B' };
  drawChart(pdf, 'Estado de postulaciones', 'Estado actual de los intentos recibidos dentro del período.',
    data.states.map(row => ({ label: APPLICATION_LABELS[row.status], count: row.count, color: stateColors[row.status] })), data.applications, 170, 104);

  pdf.addPage(); page('Detalle operativo y criterios');
  const columns = [22, 144, 164];
  pdf.setFillColor(palette.dark); pdf.roundedRect(16, 69, 178, 10, 2, 2, 'F');
  pdf.setFont('helvetica', 'bold'); pdf.setTextColor('#FFFFFF'); pdf.setFontSize(9);
  pdf.text('Indicador', columns[0]!, 75.5); pdf.text('Valor', columns[1]!, 75.5, { align: 'right' }); pdf.text('Alcance', columns[2]!, 75.5);
  [...primary, ...operational].forEach((card, index) => {
    const y = 79 + index * 9;
    pdf.setFillColor(index % 2 ? '#FFFFFF' : '#EDF3E7'); pdf.rect(16, y, 178, 9, 'F');
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(palette.text); fittedText(pdf, card.label, columns[0]!, y + 5.8, 96, 8.5);
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(palette.dark); fittedText(pdf, card.value, columns[1]!, y + 5.8, 27, 9, 'right');
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(palette.muted); pdf.setFontSize(8); pdf.text(card.scope, columns[2]!, y + 5.8);
  });
  pdf.setFont('helvetica', 'bold'); pdf.setTextColor(palette.dark); pdf.setFontSize(10); pdf.text('Cómo interpretar el reporte', 16, 226);
  const notes = [
    'Usuarios registrados y seleccionados: solo candidatos activos y no eliminados, sin roles administrativos. Cada persona seleccionada cuenta una vez, incluido su historial.',
    'El porcentaje de usuarios con selección usa candidatos activos como base. La tasa de selección del período usa los intentos recibidos en las fechas consultadas.',
    'Organizaciones incluye activas e inactivas. Los CV y las oportunidades activas reflejan la situación actual; las fechas incluyen días completos de El Salvador.',
    'Promedio por vacante: intentos del período / vacantes distintas que los recibieron. Los registros sin fecha no se asignan a un día inventado.',
  ];
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(palette.muted);
  notes.forEach((note, index) => wrappedText(pdf, note, 16, 234 + index * 10, 178, 7.5));
  for (let index = 1; index <= pdf.getNumberOfPages(); index++) {
    pdf.setPage(index); pdf.setDrawColor(palette.border); pdf.line(16, 280, 194, 280);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(palette.muted); pdf.setFontSize(7.5);
    pdf.text('Fundación Quintanilla Amaya · Uso administrativo', 16, 286);
    pdf.text('Página ' + index + ' de ' + pdf.getNumberOfPages(), 194, 286, { align: 'right' });
  }
  return { blob: pdf.output('blob'), fileName: 'reporte-operativo_FQA_' + data.range.from + '_' + data.range.to + '.pdf' };
}
