import './helpers/typescript.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const { phoneDigits, phoneEdit, formatPhone } = await import('../src/utils/phone.ts');
const { closingDay, isNumericEdit, validateOpportunityValues } = await import('../src/utils/opportunityValidation.ts');
const { validateSiteSettings } = await import('../src/validation/siteSettings.ts');
const { initialSiteConfiguration } = await import('../src/config/siteConfiguration.ts');

test('máscara admite edición parcial y prefijos completos sin duplicarlos ni truncar', () => {
  for (const value of ['71234567', '+503 7123-4567', '50371234567']) { assert.equal(phoneDigits(value), '71234567'); assert.equal(formatPhone(value), '+503 7123-4567'); }
  assert.equal(phoneDigits('50312345'), '50312345');
  assert.equal(phoneEdit('+503 7123-4'), '71234'); assert.equal(phoneEdit(''), '');
  for (const value of ['+1 71234567', '503712345678', 'abc', '712345678']) assert.equal(phoneEdit(value), null);
  assert.equal(formatPhone('anterior'), 'anterior');
});

test('validación de vacantes mantiene borradores y valida los dependientes y límites', () => {
  const values = Object.fromEntries(['title', 'description', 'organizationId', 'categoryId', 'department', 'municipality', 'modality', 'employmentTypeId', 'experienceLevelId', 'salaryMin', 'salaryMax', 'slots', 'socialHours', 'duration', 'contactEmail', 'contactPhone', 'requirements', 'responsibilities', 'benefits', 'expiresAt'].map(name => [name, name === 'title' ? 'Vacante' : name === 'contactEmail' ? 'contacto@example.test' : '']));
  const check = patch => validateOpportunityValues({ ...values, ...patch }, 'EMPLOYMENT', ['title', 'description'], false, new Date('2026-10-25T05:59:59Z'));
  assert.deepEqual(check({}), {});
  for (const patch of [{ salaryMin: '0' }, { salaryMax: '-1' }, { salaryMin: '1e3' }, { salaryMin: '1.001' }, { slots: '1.5' }, { slots: '0' }, { slots: '1000001' }, { salaryMin: '100', salaryMax: '99' }, { expiresAt: '2026-10-23' }, { expiresAt: '2027-02-29' }]) assert.ok(Object.keys(check(patch)).length);
  assert.deepEqual(check({ salaryMin: '0.25', salaryMax: '0.25', slots: '1', expiresAt: '2026-10-24' }), {});
  assert.equal(closingDay('2026-10-25T05:59:59.999Z'), '2026-10-24');
  for (const value of ['e', '-1', '+1', '1.001', '1a']) assert.equal(isNumericEdit(value, true), false);
  assert.equal(isNumericEdit('0.', true), true);
});

test('configuración valida soporte, teléfonos y enlaces sin requerir campos opcionales', () => {
  assert.deepEqual(validateSiteSettings(initialSiteConfiguration), {});
  const value = structuredClone(initialSiteConfiguration); value.contacto.correoSoporte = 'incorrecto'; value.contacto.whatsapp = '+1 71234567'; value.redes.facebook = 'http://example.test';
  assert.deepEqual(Object.keys(validateSiteSettings(value)).sort(), ['contacto.correoSoporte', 'contacto.whatsapp', 'redes.facebook']);
  value.contacto.correoSoporte = ''; value.contacto.whatsapp = ''; value.redes.facebook = '';
  assert.deepEqual(validateSiteSettings(value), {});
});
