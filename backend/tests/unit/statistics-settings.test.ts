import assert from 'node:assert/strict';
import { test } from 'node:test';
import { statisticsRangeSchema, statisticsDateBounds } from '../../src/validation/statistics.schema.js';
import { saveSiteSettingsSchema, siteConfigurationSchema } from '../../src/validation/site-settings.schema.js';
import { DEFAULT_SITE_SETTINGS } from '../../src/constants/site-settings.constants.js';

test('estadísticas valida fechas reales, orden y días completos de El Salvador', () => {
  const range = statisticsRangeSchema.parse({ from: '2024-02-29', to: '2024-03-01' });
  const bounds = statisticsDateBounds(range);
  assert.equal(bounds.gte.toISOString(), '2024-02-29T06:00:00.000Z');
  assert.equal(bounds.lt.toISOString(), '2024-03-02T06:00:00.000Z');
  for (const value of [{ from: '2023-02-29', to: '2024-03-01' }, { from: '2024-03-02', to: '2024-03-01' }, { from: '2024-03-01' }, { ...range, userId: 1 }]) assert.equal(statisticsRangeSchema.safeParse(value).success, false);
});

test('configuración rechaza campos retirados, enlaces inseguros y valores excesivos', () => {
  assert.deepEqual(siteConfigurationSchema.parse(DEFAULT_SITE_SETTINGS), DEFAULT_SITE_SETTINGS);
  assert.equal(siteConfigurationSchema.safeParse({ ...DEFAULT_SITE_SETTINGS, publicaciones: {} }).success, false);
  assert.equal(siteConfigurationSchema.safeParse({ ...DEFAULT_SITE_SETTINGS, institucional: { ...DEFAULT_SITE_SETTINGS.institucional, descripcion: '' } }).success, false);
  for (const value of ['javascript:alert(1)', 'http://example.test', 'https://user:password@example.test', 'invalid']) assert.equal(siteConfigurationSchema.safeParse({ ...DEFAULT_SITE_SETTINGS, redes: { ...DEFAULT_SITE_SETTINGS.redes, facebook: value } }).success, false);
  assert.equal(siteConfigurationSchema.safeParse({ ...DEFAULT_SITE_SETTINGS, contacto: { ...DEFAULT_SITE_SETTINGS.contacto, telefono: 'incorrecto' } }).success, false);
  assert.equal(siteConfigurationSchema.safeParse({ ...DEFAULT_SITE_SETTINGS, inicio: { ...DEFAULT_SITE_SETTINGS.inicio, titulo: '', descripcion: 'x'.repeat(2001) } }).success, false);
  assert.equal(saveSiteSettingsSchema.safeParse({ version: -1, configuration: DEFAULT_SITE_SETTINGS }).success, false);
  assert.ok(siteConfigurationSchema.safeParse({ ...DEFAULT_SITE_SETTINGS, contacto: { correo: '', telefono: '', direccion: '', whatsapp: '' } }).success);
});
