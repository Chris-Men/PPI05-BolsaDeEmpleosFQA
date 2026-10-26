import '../helpers/unit-environment.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { candidatePhoneSchema } from '../../src/validation/candidate.schema.js';
import { createOpportunitySchema, updateOpportunitySchema } from '../../src/validation/opportunity.schema.js';
import { siteConfigurationSchema, storedSiteSettingsSchema } from '../../src/validation/site-settings.schema.js';
import { DEFAULT_SITE_SETTINGS } from '../../src/constants/site-settings.constants.js';
import { closingInstant, siteDate } from '../../src/utils/site-date.js';

test('teléfonos aceptan prefijos y conservan ocho dígitos sin truncar', () => {
  for (const value of ['71234567', '7123-4567', '+503 7123-4567', '50371234567']) assert.equal(candidatePhoneSchema.parse(value), '71234567');
  assert.equal(candidatePhoneSchema.parse('50312345'), '50312345');
  for (const value of ['+1 71234567', '503712345678', 'texto71234567', '7123456', '+503']) assert.equal(candidatePhoneSchema.safeParse(value).success, false);
});

test('salarios positivos, precisión, cupos enteros y cierre salvadoreño', context => {
  context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-25T05:59:59Z') });
  assert.equal(siteDate(), '2026-10-24');
  assert.equal(closingInstant('2026-10-24').toISOString(), '2026-10-25T05:59:59.999Z');
  for (const value of [{ salaryMin: 0 }, { salaryMax: -1 }, { salaryMin: '100' }, { salaryMax: 1.001 }, { slots: 0 }, { slots: 1.5 }, { slots: '3' }, { expiresAt: '2026-10-23' }, { expiresAt: '2027-02-29' }]) assert.equal(updateOpportunitySchema.safeParse(value).success, false);
  assert.equal(updateOpportunitySchema.safeParse({ salaryMin: 0.01, salaryMax: 0.01, slots: 1, expiresAt: '2026-10-24' }).success, true);
  context.mock.timers.tick(1000);
  assert.equal(siteDate(), '2026-10-25');
  assert.equal(updateOpportunitySchema.safeParse({ expiresAt: '2026-10-24' }).success, false);
  for (const kind of ['EMPLOYMENT', 'SOCIAL_HOURS', 'INTERNSHIP', 'VOLUNTEER']) assert.equal(createOpportunitySchema.safeParse({ title: 'Vacante', kind, contactEmail: 'contacto@example.test', expiresAt: '2026-10-25' }).success, true);
});

test('soporte hereda solamente cuando falta y respeta el vacío explícito', () => {
  const configuration = structuredClone(DEFAULT_SITE_SETTINGS);
  const { correoSoporte: ignored, ...legacy } = configuration.contacto;
  assert.ok(ignored);
  const previous = { version: 7, configuration: { ...configuration, contacto: { ...legacy, correo: 'anterior@example.test' } } };
  assert.equal(storedSiteSettingsSchema.parse(previous).configuration.contacto.correoSoporte, 'anterior@example.test');
  configuration.contacto.correoSoporte = '';
  assert.equal(storedSiteSettingsSchema.parse({ version: 7, configuration }).configuration.contacto.correoSoporte, '');
  configuration.contacto.correoSoporte = 'incorrecto';
  assert.equal(siteConfigurationSchema.safeParse(configuration).success, false);
  configuration.contacto.correoSoporte = 'soporte@example.test'; configuration.contacto.telefono = '50371234567';
  assert.equal(siteConfigurationSchema.parse(configuration).contacto.telefono, '+503 7123-4567');
});
