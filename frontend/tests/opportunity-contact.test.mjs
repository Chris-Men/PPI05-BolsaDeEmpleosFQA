import './helpers/typescript.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const { validateOpportunityValues } = await import('../src/utils/opportunityValidation.ts');
const { opportunityContactLabel } = await import('../src/utils/opportunityPresentation.ts');
const keys = ['title', 'description', 'organizationId', 'categoryId', 'department', 'municipality', 'modality', 'employmentTypeId', 'experienceLevelId', 'salaryMin', 'salaryMax', 'slots', 'socialHours', 'duration', 'contactEmail', 'contactPhone', 'requirements', 'responsibilities', 'benefits', 'expiresAt'];
const values = Object.fromEntries(keys.map(key => [key, key === 'title' ? 'Vacante de contacto' : '']));
const check = patch => validateOpportunityValues({ ...values, ...patch }, 'EMPLOYMENT', [], false);

test('contactos relacionados se validan también al guardar borradores', () => {
  assert.ok(check({}).contactEmail); assert.ok(check({}).contactPhone);
  assert.deepEqual(check({ contactEmail: 'correo@example.test' }), {});
  assert.deepEqual(check({ contactPhone: '+503 7123-4567' }), {});
  assert.deepEqual(check({ contactEmail: 'correo@example.test', contactPhone: '50371234567' }), {});
  assert.ok(check({ contactEmail: 'incorrecto', contactPhone: '71234567' }).contactEmail);
  assert.ok(check({ contactEmail: 'correo@example.test', contactPhone: '123' }).contactPhone);
  assert.equal(opportunityContactLabel({ contactEmail: 'correo@example.test', contactPhone: '71234567', contact: 'Anterior' }), 'correo@example.test · +503 7123-4567');
  assert.equal(opportunityContactLabel({ contactEmail: null, contactPhone: null, contact: 'Texto anterior' }), 'Texto anterior');
});
