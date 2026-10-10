import './helpers/typescript.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const { configureAuthentication, ApiError } = await import('../src/services/api.ts');
const service = await import('../src/services/opportunityService.ts');
const { canManageVacancies } = await import('../src/utils/vacancyManagement.ts');
const { opportunitySalary, opportunityToJob, opportunityToStudent, opportunityToVolunteer } = await import('../src/utils/opportunityPresentation.ts');

test('vacantes separa transporte público y administrativo y codifica filtros', async (context) => {
  const calls = [];
  configureAuthentication({ getToken: () => 'fixture', refresh: async () => {}, invalidate: () => {} });
  context.mock.method(globalThis, 'fetch', async (url, options) => { calls.push({ url, options }); return Response.json({}); });
  await service.listOpportunities({ search: 'Salud & educación', kind: 'SOCIAL_HOURS', categoryId: 12, page: 2 });
  assert.equal(calls[0].options.headers.get('Authorization'), null);
  const query = new URL(calls[0].url, 'http://localhost').searchParams;
  assert.equal(query.get('search'), 'Salud & educación'); assert.equal(query.get('kind'), 'SOCIAL_HOURS'); assert.equal(query.get('page'), '2');
  await service.createOpportunity('INTERNSHIP', { title: 'Práctica', duration: '3 meses' });
  await service.updateOpportunity('job-8', { requirements: [] });
  await service.setOpportunityStatus('job-8', 'CLOSED');
  await service.archiveOpportunity('volunteer-8');
  assert.equal(calls[1].options.headers.get('Authorization'), 'Bearer fixture');
  assert.deepEqual(JSON.parse(calls[1].options.body), { kind: 'INTERNSHIP', title: 'Práctica', duration: '3 meses' });
  assert.deepEqual(JSON.parse(calls[2].options.body), { requirements: [] });
  assert.equal(calls[3].url, '/api/admin/opportunities/job-8/status');
  assert.equal(calls[4].url, '/api/admin/opportunities/volunteer-8'); assert.equal(calls[4].options.method, 'DELETE');
});

test('Home consulta estadísticas globales sin filtros ni credenciales', async (context) => {
  const calls = [];
  const statistics = { activeOpportunities: 23, organizations: 4, candidates: 15, impactAxes: 5 };
  context.mock.method(globalThis, 'fetch', async (url, options) => { calls.push({ url, options }); return Response.json(statistics); });
  assert.deepEqual(await service.getPublicOpportunityStatistics(), statistics);
  assert.equal(calls[0].url, '/api/opportunities/statistics');
  assert.equal(calls[0].options.headers.get('Authorization'), null);
});

test('vacantes conserva errores por campo y categorías los conflictos de relaciones', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'No se puede publicar.', errors: [{ field: 'duration', message: 'Indica duración.' }] }, { status: 400 }));
  await assert.rejects(service.setOpportunityStatus('job-1', 'OPEN'), (error) => error instanceof ApiError && error.validationErrors[0].field === 'duration');
  context.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'La categoría tiene vacantes.' }, { status: 409 }));
  await assert.rejects(service.deleteCategory(4), (error) => error instanceof ApiError && error.status === 409);
});

test('adaptadores mantienen datos específicos y no inventan estadísticas o salarios', () => {
  const fixture = { id: 2, key: 'job-2', kind: 'SOCIAL_HOURS', title: 'Apoyo', description: 'Descripción', organization: { name: 'Organización', description: null }, category: { name: 'Salud' }, department: 'San Salvador', municipality: 'Mejicanos', modality: 'ON_SITE', socialHours: 80, salaryMin: null, salaryMax: null, slots: null, requirements: [], responsibilities: [], benefits: [], publishedAt: null, expiresAt: null };
  assert.equal(opportunitySalary(fixture), 'Salario no especificado');
  const job = opportunityToJob(fixture); assert.equal(job.views, undefined); assert.equal(job.compat, undefined); assert.equal(job.opportunityKey, 'job-2');
  assert.equal(opportunityToStudent(fixture).horas, 80); assert.equal(opportunityToStudent(fixture).tipo, 'social');
  assert.equal(opportunityToStudent({ ...fixture, kind: 'INTERNSHIP', duration: '4 meses' }).duracion, '4 meses');
  assert.equal(opportunityToVolunteer(fixture).slots, null);
});

test('navegación exige rol y permiso incluso si un candidato recibe un grant administrativo', () => {
  assert.equal(canManageVacancies({ roles: ['CANDIDATE'], permissions: ['opportunities.read'] }), false);
  assert.equal(canManageVacancies({ roles: ['ADMINISTRATOR'], permissions: [] }), false);
  assert.equal(canManageVacancies({ roles: ['SUPER_ADMIN'], permissions: ['categories.create'] }, 'categories.create'), true);
});
