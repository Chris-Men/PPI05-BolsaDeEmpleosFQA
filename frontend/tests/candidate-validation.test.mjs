import './helpers/typescript.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const { changedProfileFields, formatBirthDate, formatSex, isCalendarDate, latestBirthDate, normalizeCandidatePhone, validateApplicationFields, validatePersonal, validateProfileChanges } = await import('../src/utils/candidateValidation.ts');
const { getCandidateCatalogs } = await import('../src/services/profileService.ts');
const { configureAuthentication } = await import('../src/services/api.ts');

const catalogs = { locationZones: [{ name: 'Zona de prueba', departments: [
  { name: 'San Salvador', municipalities: ['San Salvador Centro', 'San Salvador Norte'] },
  { name: 'Santa Ana', municipalities: ['Santa Ana Centro'] },
] }], educationLevels: ['Sin estudios', 'Bachillerato', 'Universitario', 'Posgrado'], sexes: [
  { value: 'FEMALE', label: 'Femenino' }, { value: 'MALE', label: 'Masculino' }, { value: 'UNDISCLOSED', label: 'Prefiero no indicar' },
] };
const profile = { email: 'candidato@example.test', firstName: 'Ana María', lastName: 'Pérez', phone: '71234567', birthDate: '2000-02-29', sex: 'UNDISCLOSED',
  department: 'San Salvador', municipality: 'San Salvador Centro', profession: '', educationLevel: 'Universitario', professionalSummary: null, workExperiences: [], educations: [], skills: [] };
const application = { personal: profile, experience: { lastRole: '', lastOrg: '', skills: '', motivation: 'Deseo colaborar.' } };

test('catálogos utilizan el transporte autenticado sin aceptar identidades del navegador', async context => {
  configureAuthentication({ getToken: () => 'fixture', refresh: async () => {}, invalidate: () => {} });
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/profile/catalogs'); assert.equal(options.headers.get('Authorization'), 'Bearer fixture');
    return Response.json(catalogs);
  });
  assert.deepEqual(await getCandidateCatalogs(), catalogs);
});

test('validación personal comparte límites y distingue opciones pendientes de no indicar sexo', () => {
  assert.deepEqual(validatePersonal(profile, catalogs, true), {});
  for (const [field, value] of [['firstName', 'Ana1'], ['phone', '+1 71234567'], ['birthDate', '2001-02-29'], ['sex', ''], ['educationLevel', 'Inventado'], ['educationLevel', ' Universitario '], ['municipality', 'Santa Ana Centro']]) {
    assert.ok(validatePersonal({ ...profile, [field]: value }, catalogs, true)[field], field);
  }
  assert.deepEqual(validatePersonal({ ...profile, lastName: '', phone: null, birthDate: null, sex: null, department: null, municipality: null, educationLevel: null }, catalogs, false), {});
  assert.equal(normalizeCandidatePhone('+503 7123-4567'), '71234567');
  assert.equal(normalizeCandidatePhone('texto'), 'texto');
});

test('fechas y edad respetan el cambio de día de El Salvador y no desplazan el cumpleaños', () => {
  assert.equal(latestBirthDate(new Date('2026-10-24T05:59:59Z')), '2010-10-23');
  assert.equal(latestBirthDate(new Date('2026-10-24T06:00:00Z')), '2010-10-24');
  assert.ok(validatePersonal({ ...profile, birthDate: '2010-10-24' }, catalogs, true, new Date('2026-10-24T05:59:59Z')).birthDate);
  assert.equal(validatePersonal({ ...profile, birthDate: '2010-10-24' }, catalogs, true, new Date('2026-10-24T06:00:00Z')).birthDate, undefined);
  assert.equal(isCalendarDate('2000-02-29'), true); assert.equal(isCalendarDate('2001-02-29'), false);
  assert.equal(formatBirthDate('2000-02-29'), '29/02/2000'); assert.equal(formatSex('UNDISCLOSED'), 'Prefiero no indicar'); assert.equal(formatSex(''), 'Sin especificar');
});

test('PATCH del perfil conserva valores históricos no editados y normaliza únicamente cambios', () => {
  const legacy = { ...profile, phone: 'antes', municipality: 'San Salvador', educationLevel: 'Maestría' };
  const changed = { ...legacy, profession: 'Docente' };
  assert.deepEqual(changedProfileFields(legacy, changed), { profession: 'Docente' });
  assert.deepEqual(validateProfileChanges(legacy, changed, catalogs), {});
  assert.deepEqual(changedProfileFields(profile, { ...profile, phone: '+503 7123-4567', birthDate: '', sex: null }), { phone: '71234567', birthDate: null, sex: null });
  assert.ok(validateProfileChanges(profile, { ...profile, department: 'Santa Ana' }, catalogs).municipality);
  assert.deepEqual(validateProfileChanges(profile, { ...profile, department: 'Santa Ana', municipality: null }, catalogs), {});
});

test('historial profesional valida fechas, orden, longitudes y listas antes de guardar', () => {
  const changed = { ...profile, workExperiences: [{ companyName: '', position: 'Analista', description: null, startDate: '2025-02-29', endDate: null }],
    educations: [{ institution: 'Universidad', degree: 'Carrera', startDate: '2024-01-01', endDate: '2023-01-01' }], skills: ['x'.repeat(101)] };
  const errors = validateProfileChanges(profile, changed, catalogs);
  for (const field of ['workExperiences.0.companyName', 'workExperiences.0.startDate', 'educations.0.endDate', 'skills.0']) assert.ok(errors[field], field);
});

test('continuar y enviar validan todos los datos exigidos sin obligar profesión o experiencia previa', () => {
  assert.deepEqual(validateApplicationFields(application, catalogs, 4, null, false), {});
  assert.ok(validateApplicationFields(application, catalogs, 4, null, true).resumeId);
  const incomplete = { ...application, personal: { ...profile, birthDate: '', sex: '', department: '', municipality: '', educationLevel: '' }, experience: { ...application.experience, motivation: ' ' } };
  const errors = validateApplicationFields(incomplete, catalogs, 4, null, false);
  for (const key of ['birthDate', 'sex', 'department', 'municipality', 'educationLevel']) assert.ok(errors['personal.' + key]);
  assert.ok(errors['experience.motivation']);
});
