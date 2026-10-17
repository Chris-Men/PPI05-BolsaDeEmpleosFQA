import './helpers/typescript.mjs';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { test } from 'node:test';
const { createOperationalReport } = await import('../src/utils/statisticsReportPdf.ts');
const { primaryStatisticsCards, operationalStatisticsCards } = await import('../src/utils/statisticsPresentation.ts');

/** Aggregate-only sample includes every state, withdrawn attempts and all opportunity types. */
const sample = () => ({
  range: { from: '2026-01-01', to: '2026-10-17', firstActivityDate: '2020-01-01', timeZone: 'America/El_Salvador' },
  publishedOpportunities: 100, organizations: 16, applications: 40, applicants: 18, activeOpportunities: 6,
  applicationsPerOpportunity: 2.5, selectionRate: 25, opportunitiesWithApplications: 16, pendingApplications: 23,
  users: { total: 10, candidates: 14, selected: 4, selectionRate: 40, newCandidates: 3, withResume: 7 },
  byKind: [{ kind: 'EMPLOYMENT', count: 40 }, { kind: 'VOLUNTEER', count: 20 }, { kind: 'SOCIAL_HOURS', count: 25 }, { kind: 'INTERNSHIP', count: 15 }],
  states: [{ status: 'PENDING', count: 15 }, { status: 'IN_REVIEW', count: 8 }, { status: 'SELECTED', count: 10 }, { status: 'REJECTED', count: 4 }, { status: 'WITHDRAWN', count: 2 }, { status: 'UNKNOWN', count: 1 }],
});

/** Reads actual PDF content streams to verify text and charts without matching compressed binary bytes. */
const pdfContents = async blob => {
  const raw = Buffer.from(await blob.arrayBuffer()).toString('latin1');
  const commands = [...raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1')).join('\n');
  return { raw, commands };
};

test('reporte operativo genera PDF real de tres páginas con tarjetas, gráficas y criterios coherentes', async () => {
  const result = createOperationalReport(sample(), { generatedAt: new Date('2026-10-18T04:00:00Z') });
  assert.equal(result.fileName, 'reporte-operativo_FQA_2026-01-01_2026-10-17.pdf');
  assert.equal(result.blob.type, 'application/pdf');
  const { raw, commands } = await pdfContents(result.blob);
  assert.ok(raw.startsWith('%PDF-')); assert.equal([...raw.matchAll(/\/Type \/Page\b/g)].length, 3);
  for (const text of ['Reporte operativo', 'Oportunidades publicadas', 'Usuarios registrados', 'Oportunidades por tipo', 'Estado de postulaciones', '40.0%', '25.0%', '01/01/2026 al 17/10/2026', 'Pendiente', 'Retirada']) assert.ok(commands.includes(text), text);
  assert.ok(commands.includes('22:00') || commands.includes('10:00')); // Date generation is shown in Salvador, before UTC midnight.
  assert.ok(commands.includes('activos y no eliminados'));
  assert.doesNotMatch(raw, /\/(JavaScript|Launch|EmbeddedFiles)\b/);
});

test('rangos vacíos conservan métricas cero y describen la ausencia de registros en ambas gráficas', async () => {
  const data = sample();
  for (const key of ['publishedOpportunities', 'organizations', 'applications', 'applicants', 'activeOpportunities', 'applicationsPerOpportunity', 'selectionRate', 'opportunitiesWithApplications', 'pendingApplications']) data[key] = 0;
  for (const key of Object.keys(data.users)) data.users[key] = 0;
  data.byKind.forEach(row => { row.count = 0; }); data.states.forEach(row => { row.count = 0; });
  const { commands } = await pdfContents(createOperationalReport(data, { generatedAt: new Date('2026-10-17T18:00:00Z') }).blob);
  assert.equal([...commands.matchAll(/Sin registros en el/g)].length, 2);
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
});
