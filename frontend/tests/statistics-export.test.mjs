import './helpers/typescript.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const { configureAuthentication } = await import('../src/services/api.ts');
const service = await import('../src/services/statisticsExportService.ts');
const { canExportStatistics } = await import('../src/utils/siteManagement.ts');
const { exportDownloadMarker, isStatisticsExportPending } = await import('../src/utils/statisticsExport.ts');

test('Excel requiere rol administrativo y ambos permisos y separa marcadores entre identidades', () => {
  const access = (roles, permissions) => ({ roles, permissions, userId: 12 });
  assert.equal(canExportStatistics(access(['CANDIDATE'], ['statistics.read', 'statistics.export'])), false);
  assert.equal(canExportStatistics(access(['ADMINISTRATOR'], ['statistics.read'])), false);
  assert.equal(canExportStatistics(access(['SUPER_ADMIN'], ['statistics.export'])), false);
  assert.equal(canExportStatistics(access(['ADMINISTRATOR'], ['statistics.read', 'statistics.export'])), true);
  const createdAt = '2026-10-24T06:00:00Z';
  assert.notEqual(exportDownloadMarker(12, 1, createdAt), exportDownloadMarker(13, 1, createdAt));
  assert.notEqual(exportDownloadMarker(12, 1, createdAt), exportDownloadMarker(12, 2, createdAt));
  assert.notEqual(exportDownloadMarker(12, 1, createdAt), exportDownloadMarker(12, 1, '2026-10-24T07:00:00Z'));
  for (const status of ['QUEUED', 'PROCESSING']) assert.equal(isStatisticsExportPending({ status }), true);
  for (const status of ['READY', 'FAILED', 'EXPIRED']) assert.equal(isStatisticsExportPending({ status }), false);
});

test('cola, seguimiento y descarga binaria conservan identidad y UUID al usar el transporte autenticado', async context => {
  const calls = [];
  configureAuthentication({ getUserId: () => 12, getToken: () => 'test-only', refresh: async () => {}, invalidate: () => {} });
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options }); return url.endsWith('/file') ? new Response(new Uint8Array([80, 75, 3, 4])) : Response.json({ id: 1, status: 'QUEUED' });
  });
  const payload = { from: '2026-01-01', to: '2026-01-31', confirmed: true, requestId: '0b7f2cc0-c084-42ec-8e27-a025182f7c18' };
  await service.requestStatisticsExport(payload, 12); await service.listStatisticsExports(2, 12); await service.getStatisticsExport(1, 12);
  const file = await service.downloadStatisticsExport(1, 12);
  assert.deepEqual(Array.from(new Uint8Array(await file.arrayBuffer())), [80, 75, 3, 4]);
  assert.deepEqual(JSON.parse(calls[0].options.body), payload);
  assert.deepEqual(calls.map(call => call.url), ['/api/admin/statistics/exports', '/api/admin/statistics/exports?page=2&pageSize=10', '/api/admin/statistics/exports/1', '/api/admin/statistics/exports/1/file']);
  assert.ok(calls.every(call => call.options.headers.get('Authorization') === 'Bearer test-only'));
  await assert.rejects(service.requestStatisticsExport(payload, 13));
  const controller = new AbortController(); controller.abort(); await assert.rejects(service.downloadStatisticsExport(1, 12, controller.signal));
  assert.equal(calls.length, 4);
});
