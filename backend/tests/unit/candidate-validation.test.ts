import assert from 'node:assert/strict';
import { test } from 'node:test';
import { birthDateSchema, candidateNameSchema, candidatePhoneSchema, isAtLeastSixteen } from '../../src/validation/candidate.schema.js';
import { updateProfileSchema } from '../../src/validation/profile.schema.js';
import { applicationDataSchema, finalApplicationDataSchema } from '../../src/validation/application.schema.js';
import { LOCATION_ZONES } from '../../src/constants/candidate-catalogs.constants.js';

const personal = { firstName: 'Ana María', lastName: "O’Connor-Pérez", phone: '+503 7123-4567', birthDate: '2000-02-29', sex: 'UNDISCLOSED',
  department: 'San Salvador', municipality: 'San Salvador Centro', profession: '', educationLevel: 'Posgrado' };
const application = { personal, experience: { lastRole: '', lastOrg: '', skills: '', motivation: 'Deseo participar.' } };

test('nombres admiten Unicode y separadores y teléfonos se normalizan sin aceptar otros países', () => {
  assert.equal(candidateNameSchema.parse('  Ana   María '), 'Ana María');
  for (const value of ['Ana1', '<Ana>', '---', '🙂', 'x'.repeat(101)]) assert.equal(candidateNameSchema.safeParse(value).success, false);
  for (const value of ['71234567', '+503 7123-4567', ' 7123 4567 ']) assert.equal(candidatePhoneSchema.parse(value), '71234567');
  for (const value of ['123', '+1 71234567', 'abcdefgh', '50371234567', '123456789']) assert.equal(candidatePhoneSchema.safeParse(value).success, false);
});

test('el límite de 16 años usa el día de El Salvador y valida días bisiestos', () => {
  const beforeMidnight = new Date('2026-10-24T05:59:59Z');
  const afterMidnight = new Date('2026-10-24T06:00:00Z');
  assert.equal(isAtLeastSixteen('2010-10-24', beforeMidnight), false);
  assert.equal(isAtLeastSixteen('2010-10-24', afterMidnight), true);
  assert.equal(isAtLeastSixteen('2010-10-25', afterMidnight), false);
  for (const value of ['2001-02-29', '2000-02-30', '0000-01-01', '2099-01-01', '2026-13-01']) assert.equal(birthDateSchema.safeParse(value).success, false);
  assert.equal(birthDateSchema.safeParse('2000-02-29').success, true);
});

test('los datos de perfil pueden omitirse o limpiarse sin aceptar elecciones arbitrarias', () => {
  assert.deepEqual(updateProfileSchema.parse({ birthDate: '', sex: null, phone: ' ' }), { birthDate: null, sex: null, phone: null });
  assert.deepEqual(updateProfileSchema.parse({ profession: 'Docente' }), { profession: 'Docente' });
  assert.equal(updateProfileSchema.safeParse({ sex: 'UNDISCLOSED' }).success, true);
  for (const value of [{ sex: 'OTHER' }, { educationLevel: 'Inventado' }, { department: 'Inventado' }, { birthDate: '2099-01-01' }]) assert.equal(updateProfileSchema.safeParse(value).success, false);
  assert.equal(LOCATION_ZONES.flatMap(zone => zone.departments).length, 14);
  assert.equal(LOCATION_ZONES.flatMap(zone => zone.departments).flatMap(item => item.municipalities).length, 44);
});

test('el envío exige opciones válidas y una pareja geográfica compatible', () => {
  const result = finalApplicationDataSchema.parse(application);
  assert.equal(result.personal.phone, '71234567');
  assert.equal(result.personal.sex, 'UNDISCLOSED');
  for (const patch of [{ municipality: 'Santa Ana Centro' }, { department: 'Inventado' }, { sex: '' }, { birthDate: '' }, { educationLevel: 'Maestría' }]) {
    assert.equal(finalApplicationDataSchema.safeParse({ ...application, personal: { ...personal, ...patch } }).success, false);
  }
});

test('borradores e históricos admiten vacíos y valores anteriores sin aplicar requisitos de envío', () => {
  const { birthDate: _birthDate, sex: _sex, ...legacyPersonal } = personal;
  void _birthDate; void _sex;
  const legacy = { ...application, personal: { ...legacyPersonal, phone: '7', municipality: 'San Salvador', educationLevel: 'Maestría' } };
  const restored = applicationDataSchema.parse(legacy);
  assert.equal(restored.personal.birthDate, ''); assert.equal(restored.personal.sex, '');
  assert.equal(restored.personal.municipality, 'San Salvador');
  assert.equal(Object.hasOwn(legacy.personal, 'birthDate'), false);
  assert.equal(finalApplicationDataSchema.safeParse(restored).success, false);
});
