import './helpers/typescript.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const dates = await import('../src/utils/statisticsDates.ts');
const permissions = await import('../src/utils/siteManagement.ts');
const statistics = await import('../src/services/statisticsService.ts');
const settings = await import('../src/services/siteSettingsService.ts');
const { initialSiteConfiguration } = await import('../src/config/siteConfiguration.ts');
const { configureAuthentication } = await import('../src/services/api.ts');
const links = await import('../src/utils/siteLinks.ts');

test('períodos rápidos incluyen hoy en El Salvador y conservan fechas calendarias', () => {
  const now = new Date('2026-01-01T05:59:59Z');
  assert.equal(dates.siteToday(now), '2025-12-31');
  assert.deepEqual(dates.statisticsPresetRange('30', now), { from: '2025-12-02', to: '2025-12-31' });
  assert.deepEqual(dates.statisticsPresetRange('year', now), { from: '2025-01-01', to: '2025-12-31' });
  assert.equal(dates.statisticsPresetRange('90', new Date('2024-03-01T12:00:00Z')).from, '2023-12-03');
  assert.deepEqual(dates.statisticsPresetRange('lifetime', now, '2012-04-15'), { from: '2012-04-15', to: '2025-12-31' });
  assert.deepEqual(dates.statisticsPresetRange('lifetime', now), { from: '2025-12-31', to: '2025-12-31' });
  assert.deepEqual(dates.statisticsPresetRange('lifetime', now, '2030-01-01'), { from: '2025-12-31', to: '2025-12-31' });
  for (const value of [{ from: '', to: '' }, { from: '2023-02-29', to: '2023-03-01' }, { from: '2026-02-01', to: '2026-01-01' }]) assert.notEqual(dates.statisticsRangeError(value), '');
});

test('roles administrativos leen indicadores; solo Super Admin puede modificar configuración', () => {
  const account = (roles, grants) => ({ roles, permissions: grants, userId: 12 });
  assert.equal(permissions.canReadStatistics(account(['CANDIDATE'], ['statistics.read'])), false);
  assert.equal(permissions.canReadStatistics(account(['ADMINISTRATOR'], ['statistics.read'])), true);
  assert.equal(permissions.canUpdateSiteSettings(account(['ADMINISTRATOR'], ['site-settings.update'])), false);
  assert.equal(permissions.canUpdateSiteSettings(account(['SUPER_ADMIN'], ['site-settings.update'])), true);
  assert.equal(permissions.canReadSiteSettings(account(['SUPER_ADMIN'], [])), false);
});

test('contratos separan contenido público de versiones y usan precondición de identidad en administración', async context => {
  const calls = [];
  configureAuthentication({ getUserId: () => 12, getToken: () => 'test-only', refresh: async () => {}, invalidate: () => {} });
  context.mock.method(globalThis, 'fetch', async (url, options) => { calls.push({ url, options }); return Response.json({ version: 1, configuration: initialSiteConfiguration }); });
  await settings.getPublicSiteSettings(); await settings.getAdminSiteSettings(12);
  await settings.saveSiteSettings({ version: 1, configuration: initialSiteConfiguration }, 12); await settings.resetSiteSettings(2, 12);
  await statistics.getDashboardStatistics(12); await statistics.getAdministrativeStatistics({ from: '2026-01-01', to: '2026-01-31' }, 12);
  assert.deepEqual(calls.map(item => item.url), ['/api/site-settings', '/api/admin/site-settings', '/api/admin/site-settings', '/api/admin/site-settings/reset', '/api/admin/statistics/dashboard', '/api/admin/statistics?from=2026-01-01&to=2026-01-31']);
  assert.equal(calls[0].options.headers.has('Authorization'), false);
  assert.deepEqual(JSON.parse(calls[3].options.body), { version: 2 });
  assert.ok(calls.every(item => !('expectedUserId' in item.options)));
  await assert.rejects(settings.saveSiteSettings({ version: 1, configuration: initialSiteConfiguration }, 13));
  assert.equal(calls.length, 6);
});

test('contactos y redes vacías no crean enlaces inseguros ni grupos retirados', () => {
  for (const value of ['', 'javascript:alert(1)', 'http://example.test', 'https://user:secret@example.test']) assert.equal(links.safeSocialUrl(value), null);
  assert.equal(links.safeSocialUrl('https://example.test'), 'https://example.test/');
  assert.equal(links.telephoneHref('+503 7623-4832'), 'tel:+50376234832');
  assert.equal(links.whatsappHref('+503 7623 4832'), 'https://wa.me/50376234832');
  assert.deepEqual(Object.keys(initialSiteConfiguration).sort(), ['contacto', 'inicio', 'institucional', 'redes']);
});
