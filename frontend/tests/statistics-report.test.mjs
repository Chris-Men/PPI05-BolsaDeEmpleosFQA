import './helpers/typescript.mjs';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { test } from 'node:test';
const { createOperationalReport } = await import('../src/utils/statisticsReportPdf.ts');
const { primaryStatisticsCards, operationalStatisticsCards, demographicStatisticsCharts, distributionPercent } = await import('../src/utils/statisticsPresentation.ts');

/** Aggregate-only sample includes every state, withdrawn attempts and all opportunity types. */
const sample = () => ({
  range: { from: '2026-01-01', to: '2026-10-17', firstActivityDate: '2020-01-01', timeZone: 'America/El_Salvador' },
  publishedOpportunities: 100, organizations: 16, applications: 40, applicants: 18, activeOpportunities: 6,
  applicationsPerOpportunity: 2.5, selectionRate: 25, opportunitiesWithApplications: 16, pendingApplications: 23,
  users: { total: 10, candidates: 14, selected: 4, selectionRate: 40, newCandidates: 3, withResume: 7 },
  byKind: [{ kind: 'EMPLOYMENT', count: 40 }, { kind: 'VOLUNTEER', count: 20 }, { kind: 'SOCIAL_HOURS', count: 25 }, { kind: 'INTERNSHIP', count: 15 }],
  states: [{ status: 'PENDING', count: 15 }, { status: 'IN_REVIEW', count: 8 }, { status: 'SELECTED', count: 10 }, { status: 'REJECTED', count: 4 }, { status: 'WITHDRAWN', count: 2 }, { status: 'UNKNOWN', count: 1 }],
  byCategory: [{ categoryId: 1, name: 'Tecnología', publishedOpportunities: 100, applications: 40 }],
  demographics: { totalCandidates: 10, asOfDate: '2026-10-17', timeZone: 'America/El_Salvador',
    byAge: [{ key: 'AGE_16_24', label: '16–24 años', count: 7 }, { key: 'UNKNOWN', label: 'Sin datos', count: 3 }],
    bySex: [{ key: 'FEMALE', label: 'Femenino', count: 4 }, { key: 'MALE', label: 'Masculino', count: 3 }, { key: 'UNDISCLOSED', label: 'Prefiero no indicar', count: 2 }, { key: 'UNKNOWN', label: 'Sin datos', count: 1 }],
    byEducationLevel: [{ key: 'Técnico', label: 'Técnico', count: 10 }],
    byDepartment: [{ key: 'San Salvador', label: 'San Salvador', count: 10 }] },
});

/** Reads actual PDF content streams to verify text and charts without matching compressed binary bytes. */
const pdfContents = async blob => {
  const raw = Buffer.from(await blob.arrayBuffer()).toString('latin1');
  const commands = [...raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1')).join('\n');
  return { raw, commands };
};

test('reporte operativo genera páginas adicionales con categorías, demografía y criterios coherentes', async () => {
  const result = createOperationalReport(sample(), { generatedAt: new Date('2026-10-18T04:00:00Z') });
  assert.equal(result.fileName, 'reporte-operativo_FQA_2026-01-01_2026-10-17.pdf');
  assert.equal(result.blob.type, 'application/pdf');
  const { raw, commands } = await pdfContents(result.blob);
  assert.ok(raw.startsWith('%PDF-')); assert.ok([...raw.matchAll(/\/Type \/Page\b/g)].length > 3);
  for (const text of ['Reporte operativo', 'Oportunidades publicadas', 'Usuarios registrados', 'Oportunidades por tipo', 'Estado de postulaciones', '40.0%', '25.0%', '01/01/2026 al 17/10/2026', 'Pendiente', 'Retirada']) assert.ok(commands.includes(text), text);
  assert.ok(commands.includes('22:00') || commands.includes('10:00')); // Date generation is shown in Salvador, before UTC midnight.
  assert.ok(commands.includes('activos y no eliminados'));
  for (const label of ['Oferta y demanda', 'Perfil del padrón', 'Prefiero no indicar', 'San Salvador', '70.0%', 'Tecnología']) assert.ok(commands.includes(label), label);
  for (const label of ['Postulaciones por revisar', 'Oportunidades activas actualmente']) assert.ok(!commands.includes(label), label);
  assert.doesNotMatch(raw, /\/(JavaScript|Launch|EmbeddedFiles)\b/);
});

test('rangos vacíos conservan métricas cero y describen la ausencia de registros en ambas gráficas', async () => {
  const data = sample();
  for (const key of ['publishedOpportunities', 'organizations', 'applications', 'applicants', 'activeOpportunities', 'applicationsPerOpportunity', 'selectionRate', 'opportunitiesWithApplications', 'pendingApplications']) data[key] = 0;
  for (const key of Object.keys(data.users)) data.users[key] = 0;
  data.byKind.forEach(row => { row.count = 0; }); data.states.forEach(row => { row.count = 0; });
  data.byCategory = []; data.demographics.totalCandidates = 0;
  for (const key of ['byAge', 'bySex', 'byEducationLevel', 'byDepartment']) data.demographics[key].forEach(row => { row.count = 0; });
  const { commands } = await pdfContents(createOperationalReport(data, { generatedAt: new Date('2026-10-17T18:00:00Z') }).blob);
  assert.equal([...commands.matchAll(/Sin registros en el/g)].length, 3);
  assert.equal([...commands.matchAll(/No hay candidatos activos/g)].length, 4);
  assert.ok(commands.includes('0.0%')); assert.doesNotMatch(commands, /NaN|Infinity|undefined/);
});

test('las tarjetas compartidas conservan desconocidos, tasas distintas y denominadores de candidatos activos', () => {
  assert.ok(primaryStatisticsCards(null).every(card => card.value === '—'));
  assert.ok(operationalStatisticsCards(null).every(card => card.value === '—'));
  const cards = operationalStatisticsCards(sample());
  assert.equal(cards.find(card => card.key === 'users').value, '10');
  assert.equal(cards.find(card => card.key === 'selectedUsersRate').value, '40.0%');
  assert.equal(cards.find(card => card.key === 'selectionRate').value, '25.0%');
  assert.ok(cards.find(card => card.key === 'users').description.includes('activos y no eliminados'));
  assert.ok(cards.every(card => !['pending', 'active'].includes(card.key)));
});

test('PDF conserva todas las categorías en páginas automáticas y muestra solo los cinco departamentos principales', async () => {
  const data = sample();
  data.byCategory = Array.from({ length: 85 }, (_, index) => ({ categoryId: index, name: 'Categoria extensa ' + index + ' con nombre para verificar ajuste de texto', publishedOpportunities: index, applications: index + 1 }));
  data.demographics.byDepartment = Array.from({ length: 43 }, (_, index) => ({ key: String(index), label: 'Departamento ' + index, count: index + 1 }));
  const { raw, commands } = await pdfContents(createOperationalReport(data, { generatedAt: new Date('2026-10-17T18:00:00Z') }).blob);
  assert.ok([...raw.matchAll(/\/Type \/Page\b/g)].length > 6);
  for (let index = 0; index < 85; index++) assert.ok(commands.includes('Categoria extensa ' + index + ' con'), String(index));
  for (let index = 0; index < 43; index++) assert.equal(commands.includes('(Departamento ' + index + ')'), index >= 38, String(index));
  assert.ok(commands.includes('Top 5'));
  assert.doesNotMatch(commands, /NaN|Infinity|undefined/);
});

test('educación y departamento excluyen valores anteriores y comparten top cinco descendente sin alterar agregados', async () => {
  const data = sample();
  const rows = [
    { key: 'OTHER', label: 'Otros valores anteriores', count: 30 },
    { key: 'z', label: 'Zeta', count: 1 }, { key: 'UNKNOWN', label: 'Sin datos', count: 20 },
    { key: 'b', label: 'Beta', count: 10 }, { key: 'a', label: 'Álfa', count: 10 },
    { key: 'd', label: 'Delta', count: 5 }, { key: 'e', label: 'Épsilon', count: 3 },
    { key: 'f', label: 'Fuera del top', count: 2 },
  ];
  data.demographics.totalCandidates = 81;
  data.demographics.byEducationLevel = structuredClone(rows); data.demographics.byDepartment = structuredClone(rows);
  const original = structuredClone(data.demographics);
  const charts = demographicStatisticsCharts(data.demographics);
  for (const chart of charts.filter(item => ['education', 'department'].includes(item.key))) {
    assert.deepEqual(chart.rows.map(row => row.key), ['UNKNOWN', 'a', 'b', 'd', 'e']);
    assert.equal(chart.total, 81);
    assert.equal(distributionPercent(chart.rows[0].count, chart.total), '24.7%');
    assert.ok(chart.title.includes('Top 5'));
  }
  assert.deepEqual(data.demographics, original);
  assert.deepEqual(charts.find(chart => chart.key === 'age').rows, original.byAge);
  assert.deepEqual(charts.find(chart => chart.key === 'sex').rows, original.bySex);
  assert.ok(demographicStatisticsCharts(undefined).every(chart => chart.rows === undefined && chart.total === undefined));
  const { commands } = await pdfContents(createOperationalReport(data, { generatedAt: new Date('2026-10-17T18:00:00Z') }).blob);
  for (const label of ['Zeta', 'Fuera del top', 'Otros valores anteriores']) assert.ok(!commands.includes('(' + label + ')'), label);
  for (const label of ['Sin datos', 'Álfa', 'Beta', 'Delta', 'Épsilon']) assert.ok(commands.includes('(' + label + ')'), label);
  assert.ok(commands.includes('24.7%'));
});
