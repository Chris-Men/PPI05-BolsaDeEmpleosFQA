import '../helpers/unit-environment.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOpportunitySchema, updateOpportunitySchema } from '../../src/validation/opportunity.schema.js';
import { opportunityContact } from '../../src/utils/opportunity-contact.js';

test('contacto exige al menos un canal válido y permite cualquiera de los dos o ambos', () => {
  const base = { title: 'Vacante de contacto', kind: 'EMPLOYMENT' };
  for (const fields of [{}, { contactEmail: null, contactPhone: null }, { contactEmail: '  ', contactPhone: '' }, { contactEmail: 'incorrecto' }, { contactPhone: '+1 71234567' }, { contactPhone: '503712345678' }, { contactEmail: 'correo@example.test', contactPhone: '123' }, { contact: 'correo@example.test' }]) assert.equal(createOpportunitySchema.safeParse({ ...base, ...fields }).success, false);
  for (const fields of [{ contactEmail: 'CORREO@EXAMPLE.TEST', contactPhone: null }, { contactPhone: '50371234567', contactEmail: '' }, { contactEmail: 'correo@example.test', contactPhone: '+503 7123-4567' }]) {
    const value = createOpportunitySchema.parse({ ...base, ...fields });
    if (fields.contactPhone) assert.equal(value.contactPhone, '71234567');
    if (fields.contactEmail) assert.equal(value.contactEmail, 'correo@example.test');
  }
  assert.equal(updateOpportunitySchema.safeParse({ contactEmail: null, contactPhone: '' }).success, false);
  assert.deepEqual(updateOpportunitySchema.parse({ contactPhone: '  ' }), { contactPhone: null });
  assert.deepEqual(updateOpportunitySchema.parse({ title: 'Sin modificar contactos' }), { title: 'Sin modificar contactos' });
});

test('lectura histórica reconoce un solo canal y conserva texto ambiguo sin inventar selecciones', () => {
  const legacy = { contactEmail: null, contactPhone: null };
  assert.deepEqual(opportunityContact({ ...legacy, contact: '  CORREO@EXAMPLE.TEST  ' }), { contactEmail: 'correo@example.test', contactPhone: null });
  assert.deepEqual(opportunityContact({ ...legacy, contact: '+503 7123-4567' }), { contactEmail: null, contactPhone: '71234567' });
  assert.deepEqual(opportunityContact({ ...legacy, contact: 'Preguntar por Ana; correo@example.test y 71234567' }), legacy);
  assert.deepEqual(opportunityContact({ contact: 'anterior@example.test', contactEmail: null, contactPhone: '71234567' }), { contactEmail: null, contactPhone: '71234567' });
});
