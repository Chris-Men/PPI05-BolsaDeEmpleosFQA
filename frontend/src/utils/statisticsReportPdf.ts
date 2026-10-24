import { jsPDF } from 'jspdf';
import type { AdministrativeStatistics } from '../types/statistics';
import { APPLICATION_LABELS } from '../types/application';
import { KIND_LABELS } from '../types/opportunity';
import { demographicStatisticsCharts, distributionPercent, operationalStatisticsCards, primaryStatisticsCards, statisticsCalendarLabel, type StatisticsCard } from './statisticsPresentation';

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
function drawChart(pdf: jsPDF, title: string, subtitle: string, rows: ChartRow[], total: number, y: number, height: number, options?: { rowStep?: number; emptyMessage?: string }): void {
  pdf.setFillColor('#FFFFFF'); pdf.setDrawColor(palette.border); pdf.roundedRect(16, y, 178, height, 3, 3, 'FD');
  pdf.setFont('helvetica', 'bold'); pdf.setTextColor(palette.dark); pdf.setFontSize(12); pdf.text(title, 22, y + 10);
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(palette.muted); fittedText(pdf, subtitle, 22, y + 17, 166, 8);
  if (!total) {
    pdf.setFillColor(palette.pale); pdf.roundedRect(22, y + 26, 166, height - 35, 2, 2, 'F');
    wrappedText(pdf, options?.emptyMessage ?? 'Sin registros en el período seleccionado.', 29, y + 40, 150, 10); return;
  }
  const maximum = Math.max(1, ...rows.map(row => row.count));
  const chartX = 76; const chartWidth = 77;
  rows.forEach((row, index) => {
    const lineY = y + 30 + index * (options?.rowStep ?? (rows.length > 5 ? 11 : 13));
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(palette.text);
    fittedText(pdf, row.label, 22, lineY + 2, 50, 9);
    pdf.setFillColor(palette.pale); pdf.roundedRect(chartX, lineY - 3, chartWidth, 6, 1, 1, 'F');
    const width = row.count / maximum * chartWidth;
    if (width > 0) { pdf.setFillColor(row.color); pdf.rect(chartX, lineY - 3, width, 6, 'F'); }
    pdf.setTextColor(palette.dark);
    fittedText(pdf, row.count.toLocaleString('es-SV') + ' (' + distributionPercent(row.count, total) + ')', 188, lineY + 2, 32, 8, 'right');
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

/** Variable-length category tables and roster charts paginate beyond the original fixed three-page layout. */
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
  pdf.setFont('helvetica', 'bold'); pdf.setTextColor(palette.dark); pdf.setFontSize(12); pdf.text('Personas y documentos', 16, 173);
  operational.filter(card => ['users', 'selectedUsers', 'selectedUsersRate', 'resume'].includes(card.key))
    .forEach((card, index) => drawCard(pdf, card, 16 + index % 2 * 92, 180 + Math.floor(index / 2) * 42));
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(palette.muted);
  wrappedText(pdf, 'Los datos del período conviven con totales acumulados e indicadores actuales. Consulta el alcance de cada indicador al final del reporte.', 16, 270, 178, 8);

  pdf.addPage(); page('Gráficas del período');
  drawChart(pdf, 'Oportunidades por tipo', 'Primera publicación dentro del período, aunque la vacante haya cerrado.',
    data.byKind.map((row, index) => ({ label: KIND_LABELS[row.kind], count: row.count, color: ['#82BA2E', '#3C8B55', '#2F7E8D', '#B48B36'][index % 4]! })), data.publishedOpportunities, 69, 94);
  const stateColors = { PENDING: '#D4A33D', IN_REVIEW: '#2F7E8D', SELECTED: '#5BA222', REJECTED: '#BE5965', WITHDRAWN: '#88917F', UNKNOWN: '#64748B' };
  drawChart(pdf, 'Estado de postulaciones', 'Estado actual de los intentos recibidos dentro del período.',
    data.states.map(row => ({ label: APPLICATION_LABELS[row.status], count: row.count, color: stateColors[row.status] })), data.applications, 170, 104);

  /** Repeats table headers whenever a wrapped category row needs a new page. */
  const categoryPage = (): number => {
    pdf.addPage(); page('Oferta y demanda por categoría');
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(palette.muted);
    wrappedText(pdf, 'Categoría actual de cada oportunidad. Las postulaciones del período pueden corresponder a publicaciones anteriores.', 16, 70, 178, 8);
    pdf.setFillColor(palette.dark); pdf.roundedRect(16, 82, 178, 11, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor('#FFFFFF'); pdf.setFontSize(8);
    pdf.text('Categoría', 22, 89); pdf.text('Publicaciones', 151, 89, { align: 'right' }); pdf.text('Postulaciones', 188, 89, { align: 'right' });
    return 93;
  };
  let categoryY = categoryPage(); let categoryIndex = 0;
  /** Row height follows wrapped names so long categories cannot overlap numeric cells. */
  const categoryRow = (name: string, published: number, applications: number, total = false): void => {
    pdf.setFont('helvetica', total ? 'bold' : 'normal'); pdf.setFontSize(8.5);
    const lines = pdf.splitTextToSize(name, 94) as string[]; const height = Math.max(10, lines.length * 4 + 5);
    if (categoryY + height > 274) categoryY = categoryPage();
    pdf.setFillColor(total ? '#E4EFD8' : categoryIndex % 2 ? '#FFFFFF' : '#EDF3E7'); pdf.rect(16, categoryY, 178, height, 'F');
    pdf.setFont('helvetica', total ? 'bold' : 'normal'); pdf.setTextColor(palette.text); pdf.setFontSize(8.5);
    pdf.text(lines, 22, categoryY + 6, { lineHeightFactor: 1.25 });
    fittedText(pdf, published.toLocaleString('es-SV'), 151, categoryY + height / 2 + 1.5, 29, 9, 'right');
    fittedText(pdf, applications.toLocaleString('es-SV'), 188, categoryY + height / 2 + 1.5, 29, 9, 'right');
    categoryY += height; categoryIndex++;
  };
  if (!data.byCategory.length) {
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(palette.muted);
    wrappedText(pdf, 'Sin registros en el período seleccionado.', 22, categoryY + 10, 166, 10); categoryY += 22;
  }
  for (const row of data.byCategory) categoryRow(row.name, row.publishedOpportunities, row.applications);
  categoryRow('Total del período', data.publishedOpportunities, data.applications, true);

  let rosterY = 274;
  /** Compact rows fit up to eighteen department groups while retaining vector text and counts. */
  for (const chart of demographicStatisticsCharts(data.demographics)) {
    const rows = chart.rows ?? []; const total = data.demographics.totalCandidates;
    for (let offset = 0; offset < Math.max(rows.length, 1); offset += 18) {
      const chunk = rows.slice(offset, offset + 18); const rowStep = chunk.length > 5 ? 9 : 13;
      const height = total ? 52 + Math.max(0, chunk.length - 1) * rowStep : 70;
      if (rosterY + height > 274) { pdf.addPage(); page('Perfil del padrón de candidatos'); rosterY = 69; }
      const scope = 'Acumulado al ' + statisticsCalendarLabel(data.demographics.asOfDate) + ' · ' + total.toLocaleString('es-SV') + ' candidatos activos · El Salvador';
      drawChart(pdf, chart.title + (offset ? ' (continuación)' : ''), scope,
        chunk.map(row => ({ label: row.label, count: row.count, color: row.key === 'UNKNOWN' || row.key === 'OTHER' ? '#88917F' : palette.green })),
        total, rosterY, height, { rowStep, emptyMessage: 'No hay candidatos activos registrados.' });
      rosterY += height + 9;
    }
  }

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
  let notesY = 79 + (primary.length + operational.length) * 9 + 10;
  pdf.setFont('helvetica', 'bold'); pdf.setTextColor(palette.dark); pdf.setFontSize(10); pdf.text('Cómo interpretar el reporte', 16, notesY);
  notesY += 8;
  const notes = [
    'Usuarios registrados y seleccionados: solo candidatos activos y no eliminados, sin roles administrativos. Cada persona seleccionada cuenta una vez, incluido su historial.',
    'El porcentaje de usuarios con selección usa candidatos activos como base. La tasa de selección del período usa los intentos recibidos en las fechas consultadas.',
    'Organizaciones incluye activas e inactivas. Los CV reflejan la situación actual; las fechas incluyen días completos de El Salvador.',
    'Promedio por vacante: intentos del período / vacantes distintas que los recibieron. Los registros sin fecha no se asignan a un día inventado.',
    'Categorías: publicaciones e intentos se filtran por sus propias fechas y se agrupan por la categoría actual, sin sumar otra vez las categorías padre.',
    'La demografía es acumulada e independiente del período. Educación y departamento muestran el Top 5 sin Otros valores anteriores. Los porcentajes usan el padrón total, incluidos los grupos no mostrados.',
  ];
  for (const note of notes) {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5);
    const lines = pdf.splitTextToSize(note, 178) as string[]; const height = lines.length * 3.5 + 3;
    if (notesY + height > 274) { pdf.addPage(); page('Criterios del reporte'); notesY = 70; }
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(palette.muted); pdf.setFontSize(7.5);
    pdf.text(lines, 16, notesY, { lineHeightFactor: 1.25 }); notesY += height;
  }
  for (let index = 1; index <= pdf.getNumberOfPages(); index++) {
    pdf.setPage(index); pdf.setDrawColor(palette.border); pdf.line(16, 280, 194, 280);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(palette.muted); pdf.setFontSize(7.5);
    pdf.text('Fundación Quintanilla Amaya · Uso administrativo', 16, 286);
    pdf.text('Página ' + index + ' de ' + pdf.getNumberOfPages(), 194, 286, { align: 'right' });
  }
  return { blob: pdf.output('blob'), fileName: 'reporte-operativo_FQA_' + data.range.from + '_' + data.range.to + '.pdf' };
}
