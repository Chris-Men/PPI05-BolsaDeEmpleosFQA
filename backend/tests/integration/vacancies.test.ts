import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import bcrypt from 'bcrypt';
import { prisma } from '../../src/config/prisma.js';
import { createApp } from '../../src/app.js';
import { PERMISSIONS, ROLE_NAMES, ROLE_PERMISSIONS, type RoleCode } from '../../src/constants/authorization.constants.js';
import { OPPORTUNITY_KINDS, type OpportunityType } from '../../src/constants/opportunity.constants.js';
import { seedAccountCatalogs } from '../../src/services/catalog.service.js';
import { seedOpportunityCatalogs } from '../../src/services/opportunity-catalog.service.js';
import { createOpportunity, type Opportunity, type getPublicStatistics } from '../../src/services/opportunity.service.js';
import { startTestServer, stopTestServer, type TestServer } from '../helpers/http.js';
import type { RegistrationResponse } from '../../src/types/auth.types.js';

interface Identity { id: number; token: string }
interface Category { id: number; name: string; isActive: boolean; parentId: number | null; opportunityCount: number }
interface Page<T> { items: T[]; total: number; page: number; pageSize: number }
const runId = randomUUID();
const users: number[] = [];
const categoryIds: number[] = [];
const identities = new Map<RoleCode, Identity>();
let api: TestServer;
let organizationId: number;
let categoryId: number;
let employmentTypeId: number;
let experienceLevelId: number;
/** Loopback HTTP calls exercise real authorization, validation, controllers and PostgreSQL. */
const request = (method: string, route: string, actor?: Identity, body?: unknown): Promise<Response> => fetch(api.baseUrl + '/api' + route, {
  method, headers: { 'Content-Type': 'application/json', 'X-FQA-Request': '1', ...(actor ? { Authorization: 'Bearer ' + actor.token } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
});
/** A fresh seeded identity is used rather than token claims as the authorization source. */
const admin = (): Identity => { const actor = identities.get('ADMINISTRATOR'); assert.ok(actor); return actor; };
/** Fixture categories are tracked even if later renamed. */
const createCategory = async (fields: object = {}): Promise<Category> => {
  const result = await request('POST', '/admin/categories', admin(), { name: runId + '-' + randomUUID(), ...fields });
  assert.equal(result.status, 201);
  const value = await result.json() as Category; categoryIds.push(value.id); return value;
};
/** Minimal draft fixture has no invented required references. */
const draft = async (kind: OpportunityType = 'EMPLOYMENT', fields: object = {}): Promise<Opportunity> => {
  const result = await request('POST', '/admin/opportunities', admin(), { kind, title: runId + '-' + randomUUID(), ...fields });
  assert.equal(result.status, 201);
  return await result.json() as Opportunity;
};
/** Type-specific publication fields use actual catalog identities. */
const publicationFields = (kind: OpportunityType) => ({
  organizationId, categoryId, department: runId, municipality: 'Municipio', description: 'Descripción completa de una oportunidad con impacto social.',
  modality: 'HYBRID', slots: 3, contact: 'contacto@example.test', requirements: ['Primer requisito'], responsibilities: ['Primera responsabilidad'], benefits: ['Aprendizaje'], expiresAt: '2099-12-31',
  ...(kind === 'EMPLOYMENT' ? { employmentTypeId, experienceLevelId, salaryMin: 500.25, salaryMax: 1000.5 } : {}),
  ...(kind === 'SOCIAL_HOURS' ? { socialHours: 100, experienceLevelId } : {}),
  ...(kind === 'INTERNSHIP' ? { duration: '4 meses', experienceLevelId } : {}),
});
/** Publishes a complete fixture with the separate lifecycle endpoint. */
const published = async (kind: OpportunityType = 'EMPLOYMENT', fields: object = {}): Promise<Opportunity> => {
  const value = await draft(kind, { ...publicationFields(kind), ...fields });
  const result = await request('PATCH', '/admin/opportunities/' + value.key + '/status', admin(), { status: 'OPEN' });
  assert.equal(result.status, 200); return await result.json() as Opportunity;
};

describe('PB-129: vacantes y categorías persistentes', () => {
  before(async () => {
    assert.equal(process.env.NODE_ENV, 'test');
    assert.equal(new URL(process.env.DATABASE_URL!).pathname.endsWith('_test'), true);
    assert.equal(process.env.DATABASE_URL, process.env.TEST_DATABASE_URL);
    api = await startTestServer(createApp());
    const password = 'Pruebas.1234567890';
    const passwordHash = await bcrypt.hash(password, 12);
    for (const role of ['ADMINISTRATOR', 'SUPER_ADMIN', 'CANDIDATE'] as const) {
      const user = await prisma.user.create({ data: { email: runId + '-' + role.toLowerCase() + '@example.test', passwordHash,
        status: { connect: { name: 'Activo' } }, userRoles: { create: { roles: { connect: { name: ROLE_NAMES[role] } } } } } });
      users.push(user.id);
      const login = await request('POST', '/auth/login', undefined, { email: user.email, password });
      assert.equal(login.status, 200);
      identities.set(role, { id: user.id, token: (await login.json() as RegistrationResponse).accessToken });
    }
    const organization = await request('POST', '/admin/organizations', admin(), { name: runId });
    assert.equal(organization.status, 201); organizationId = (await organization.json() as { id: number }).id;
    categoryId = (await createCategory()).id;
    employmentTypeId = (await prisma.employmentTypes.findFirstOrThrow()).id;
    experienceLevelId = (await prisma.experienceLevels.findFirstOrThrow()).id;
  });
  after(async () => {
    if (api) await stopTestServer(api.server);
    await seedAccountCatalogs(prisma);
    await prisma.jobs.deleteMany({ where: { OR: [{ title: { startsWith: runId } }, { organizationId }] } });
    await prisma.volunteerOpportunities.deleteMany({ where: { OR: [{ title: { startsWith: runId } }, { organizationId }] } });
    await prisma.jobCategories.updateMany({ where: { id: { in: categoryIds } }, data: { parentId: null } });
    await prisma.jobCategories.deleteMany({ where: { id: { in: categoryIds } } });
    await prisma.auditLogs.deleteMany({ where: { userId: { in: users } } });
    if (organizationId) await prisma.organizations.delete({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.locations.deleteMany({ where: { department: runId } });
    await prisma.applicationStatuses.deleteMany({ where: { name: runId } });
    await prisma.$disconnect();
  });

  it('expone estadísticas globales reales sin usuarios, borradores ni publicaciones ocultas', async () => {
    type Statistics = Awaited<ReturnType<typeof getPublicStatistics>>;
    const statistics = async (): Promise<Statistics> => {
      const response = await request('GET', '/opportunities/statistics');
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const value = await response.json() as Statistics;
      assert.deepEqual(Object.keys(value).sort(), ['activeOpportunities', 'candidates', 'impactAxes', 'organizations']);
      return value;
    };
    const baseline = await statistics();
    const category = await createCategory();
    const opportunities = new Map<OpportunityType, Opportunity>();
    for (const kind of OPPORTUNITY_KINDS) opportunities.set(kind, await published(kind, { categoryId: category.id }));
    await draft('EMPLOYMENT', { categoryId: category.id });
    assert.equal((await statistics()).activeOpportunities, baseline.activeOpportunities + 4);
    assert.equal((await statistics()).impactAxes, baseline.impactAxes + 1);
    const filtered = await request('GET', '/opportunities/statistics?search=no-match&location=no-match');
    assert.deepEqual(await filtered.json(), await statistics());

    const employment = opportunities.get('EMPLOYMENT')!;
    const volunteer = opportunities.get('VOLUNTEER')!;
    const social = opportunities.get('SOCIAL_HOURS')!;
    const internship = opportunities.get('INTERNSHIP')!;
    assert.equal((await request('PATCH', '/admin/opportunities/' + employment.key + '/status', admin(), { status: 'CLOSED' })).status, 200);
    assert.equal((await request('DELETE', '/admin/opportunities/' + volunteer.key, admin())).status, 200);
    await prisma.jobs.update({ where: { id: social.id }, data: { expiresAt: new Date('2020-01-01') } });
    assert.equal((await statistics()).activeOpportunities, baseline.activeOpportunities + 1);
    await prisma.jobs.update({ where: { id: internship.id }, data: { publishedAt: new Date('2099-01-01') } });
    assert.equal((await statistics()).activeOpportunities, baseline.activeOpportunities);
    await prisma.jobs.update({ where: { id: internship.id }, data: { publishedAt: new Date() } });
    assert.equal((await request('PATCH', '/admin/categories/' + category.id, admin(), { isActive: false })).status, 200);
    assert.equal((await statistics()).activeOpportunities, baseline.activeOpportunities);
    assert.equal((await statistics()).impactAxes, baseline.impactAxes);
    try {
      assert.equal((await request('PATCH', '/admin/organizations/' + organizationId + '/status', admin(), { status: 'INACTIVE' })).status, 204);
      assert.equal((await statistics()).organizations, baseline.organizations - 1);
    } finally {
      await request('PATCH', '/admin/organizations/' + organizationId + '/status', admin(), { status: 'ACTIVE' });
    }

    const candidateIdentity = identities.get('CANDIDATE')!;
    const { passwordHash } = await prisma.user.findUniqueOrThrow({ where: { id: candidateIdentity.id }, select: { passwordHash: true } });
    const candidate = await prisma.user.create({ data: { email: runId + '-stats-candidate@example.test', passwordHash,
      status: { connect: { name: 'Deshabilitado' } }, userRoles: { create: { roles: { connect: { name: ROLE_NAMES.CANDIDATE } } } } } });
    users.push(candidate.id);
    assert.equal((await statistics()).candidates, baseline.candidates + 1);
    await prisma.userRoles.create({ data: { users: { connect: { id: candidate.id } }, roles: { connect: { name: ROLE_NAMES.ADMINISTRATOR } } } });
    assert.equal((await statistics()).candidates, baseline.candidates + 1);
    await prisma.user.update({ where: { id: candidate.id }, data: { deletedAt: new Date() } });
    assert.equal((await statistics()).candidates, baseline.candidates);
    const administrator = await prisma.user.create({ data: { email: runId + '-stats-admin@example.test', passwordHash,
      status: { connect: { name: 'Activo' } }, userRoles: { create: { roles: { connect: { name: ROLE_NAMES.ADMINISTRATOR } } } } } });
    users.push(administrator.id);
    assert.equal((await statistics()).candidates, baseline.candidates);
  });

  it('filtra la opción Remoto por modalidad y conserva el filtro de texto', async () => {
    const prefix = runId + '-remote-';
    const remote = await published('EMPLOYMENT', { title: prefix + 'remote', modality: 'REMOTE' });
    await published('EMPLOYMENT', { title: prefix + 'hybrid', modality: 'HYBRID' });
    const result = await request('GET', '/opportunities?kind=EMPLOYMENT&search=' + prefix + '&modality=REMOTE');
    assert.equal(result.status, 200);
    const page = await result.json() as Page<Opportunity>;
    assert.equal(page.total, 1);
    assert.equal(page.items[0].key, remote.key);
    assert.equal((await request('GET', '/opportunities?modality=invalid')).status, 400);
  });

  it('guarda, completa, publica, cierra, reabre y archiva los cuatro tipos', async () => {
    for (const kind of OPPORTUNITY_KINDS) {
      const value = await draft(kind);
      assert.equal(value.status, 'DRAFT'); assert.equal(value.organizationId, null);
      assert.equal((await request('GET', '/opportunities/' + value.key)).status, 404);
      const invalid = await request('PATCH', '/admin/opportunities/' + value.key + '/status', admin(), { status: 'OPEN' });
      assert.equal(invalid.status, 400); assert.ok((await invalid.json() as { errors: unknown[] }).errors.length > 0);
      const updated = await request('PATCH', '/admin/opportunities/' + value.key, admin(), publicationFields(kind));
      assert.equal(updated.status, 200);
      assert.equal((await request('PATCH', '/admin/opportunities/' + value.key + '/status', admin(), { status: 'OPEN' })).status, 200);
      const detail = await request('GET', '/opportunities/' + value.key);
      assert.equal(detail.status, 200); assert.equal(detail.headers.get('cache-control'), 'no-store');
      const saved = await detail.json() as Opportunity;
      assert.equal(saved.kind, kind); assert.deepEqual(saved.requirements, ['Primer requisito']); assert.ok(saved.publishedAt);
      assert.equal(saved.modality, 'HYBRID'); assert.equal(saved.department, runId);
      if (kind === 'EMPLOYMENT') assert.equal(saved.salaryMin, 500.25);
      if (kind === 'SOCIAL_HOURS') assert.equal(saved.socialHours, 100);
      if (kind === 'INTERNSHIP') assert.equal(saved.duration, '4 meses');
      assert.equal((await request('PATCH', '/admin/opportunities/' + value.key + '/status', admin(), { status: 'CLOSED' })).status, 200);
      assert.equal((await request('GET', '/opportunities/' + value.key)).status, 404);
      assert.equal((await request('PATCH', '/admin/opportunities/' + value.key + '/status', admin(), { status: 'OPEN' })).status, 200);
      assert.equal((await request('DELETE', '/admin/opportunities/' + value.key, admin())).status, 200);
      assert.equal((await request('GET', '/opportunities/' + value.key)).status, 404);
      assert.equal((await request('PATCH', '/admin/opportunities/' + value.key, admin(), { title: runId + '-cerrada' })).status, 409);
    }
  });

  it('edita campos y colecciones sin perder omitidos y revierte salarios incoherentes', async () => {
    const value = await published();
    const invalid = await request('PATCH', '/admin/opportunities/' + value.key, admin(), { salaryMax: 1 });
    assert.equal(invalid.status, 400);
    const before = await (await request('GET', '/admin/opportunities/' + value.key, admin())).json() as Opportunity;
    assert.equal(before.salaryMax, 1000.5);
    const result = await request('PATCH', '/admin/opportunities/' + value.key, admin(), { requirements: [], contact: null, salaryMax: 1200 });
    assert.equal(result.status, 200);
    const saved = await result.json() as Opportunity;
    assert.deepEqual(saved.requirements, []); assert.deepEqual(saved.benefits, ['Aprendizaje']); assert.equal(saved.contact, null); assert.equal(saved.salaryMin, 500.25);
    assert.equal(await prisma.jobRevisions.count({ where: { jobId: value.id } }), 1);
    for (const payload of [{ expiresAt: '2027-02-29' }, { kind: 'VOLUNTEER' }, { status: 'CLOSED' }, { organizationId: 2147483647 }, { department: null }]) {
      assert.equal((await request('PATCH', '/admin/opportunities/' + value.key, admin(), payload)).status, 400);
    }
  });

  it('protege categorías duplicadas, jerarquías cíclicas y eliminación de padres', async () => {
    const parent = await createCategory({ name: runId + '-Educación' });
    assert.equal((await request('POST', '/admin/categories', admin(), { name: runId + '-EDUCACION' })).status, 409);
    const child = await createCategory({ parentId: parent.id });
    assert.equal((await request('PATCH', '/admin/categories/' + parent.id, admin(), { parentId: child.id })).status, 400);
    assert.equal((await request('PATCH', '/admin/categories/' + parent.id, admin(), { parentId: parent.id })).status, 400);
    assert.equal((await request('PATCH', '/admin/categories/' + child.id, admin(), { parentId: 2147483647 })).status, 400);
    assert.equal((await request('DELETE', '/admin/categories/' + parent.id, admin())).status, 409);
    assert.equal((await request('DELETE', '/admin/categories/' + child.id, admin())).status, 204);
    assert.equal((await request('DELETE', '/admin/categories/' + parent.id, admin())).status, 204);
  });

  it('oculta vacantes de organizaciones o categorías inactivas sin borrar relaciones', async () => {
    const category = await createCategory();
    const value = await published('VOLUNTEER', { categoryId: category.id });
    assert.equal((await request('DELETE', '/admin/categories/' + category.id, admin())).status, 409);
    assert.equal((await request('PATCH', '/admin/categories/' + category.id, admin(), { isActive: false })).status, 200);
    assert.equal((await request('GET', '/opportunities/' + value.key)).status, 404);
    const publicCatalog = await (await request('GET', '/categories')).json() as Category[];
    assert.equal(publicCatalog.some((item) => item.id === category.id), false);
    assert.equal((await request('PATCH', '/admin/categories/' + category.id, admin(), { isActive: true })).status, 200);
    assert.equal((await request('PATCH', '/admin/organizations/' + organizationId + '/status', admin(), { status: 'INACTIVE' })).status, 204);
    assert.equal((await request('GET', '/opportunities/' + value.key)).status, 404);
    assert.equal((await request('PATCH', '/admin/organizations/' + organizationId + '/status', admin(), { status: 'ACTIVE' })).status, 204);
    assert.equal((await request('GET', '/opportunities/' + value.key)).status, 200);
  });

  it('aplica filtros y páginas consistentes incluso mezclando las dos tablas', async () => {
    const prefix = runId + '-pagination-';
    for (const kind of OPPORTUNITY_KINDS) await published(kind, { title: prefix + kind });
    const query = '/opportunities?search=' + prefix + '&pageSize=2';
    const first = await (await request('GET', query)).json() as Page<Opportunity>;
    const second = await (await request('GET', query + '&page=2')).json() as Page<Opportunity>;
    assert.equal(first.total, 4); assert.equal(second.total, 4);
    assert.equal(new Set([...first.items, ...second.items].map((value) => value.key)).size, 4);
    const salary = await (await request('GET', query + '&kind=EMPLOYMENT&salaryMax=500')).json() as Page<Opportunity>;
    assert.equal(salary.total, 0);
    const filtered = await (await request('GET', query + '&kind=SOCIAL_HOURS&categoryId=' + categoryId + '&location=' + runId)).json() as Page<Opportunity>;
    assert.equal(filtered.total, 1); assert.equal(filtered.items[0].kind, 'SOCIAL_HOURS');
    const unpublished = await draft('EMPLOYMENT', { title: prefix + 'draft' });
    const hidden = await (await request('GET', query + '&status=DRAFT')).json() as Page<Opportunity>;
    assert.equal(hidden.total, 4); assert.equal(hidden.items.some((value) => value.key === unpublished.key), false);
    const categories = await (await request('GET', '/admin/categories?search=' + runId + '&pageSize=1&page=2', admin())).json() as Page<Category>;
    assert.equal(categories.items.length, 1); assert.ok(categories.total > 1);
  });

  it('excluye vacantes vencidas y exige una fecha futura para reabrirlas', async () => {
    const value = await published();
    await prisma.jobs.update({ where: { id: value.id }, data: { expiresAt: new Date('2020-01-01') } });
    assert.equal((await request('GET', '/opportunities/' + value.key)).status, 404);
    const listed = await (await request('GET', '/opportunities?search=' + value.title)).json() as Page<Opportunity>;
    assert.equal(listed.total, 0);
    assert.equal((await request('PATCH', '/admin/opportunities/' + value.key + '/status', admin(), { status: 'CLOSED' })).status, 200);
    assert.equal((await request('PATCH', '/admin/opportunities/' + value.key + '/status', admin(), { status: 'OPEN' })).status, 400);
    assert.equal((await request('PATCH', '/admin/opportunities/' + value.key, admin(), { expiresAt: '2099-12-31' })).status, 200);
    assert.equal((await request('PATCH', '/admin/opportunities/' + value.key + '/status', admin(), { status: 'OPEN' })).status, 200);
  });

  it('mantiene páginas mixtas correctas con fechas históricas nulas', async () => {
    const prefix = runId + '-null-dates-';
    const job = await published('EMPLOYMENT', { title: prefix + 'job' });
    const volunteer = await published('VOLUNTEER', { title: prefix + 'volunteer' });
    const current = await published('INTERNSHIP', { title: prefix + 'current' });
    await prisma.jobs.update({ where: { id: job.id }, data: { createdAt: null } });
    await prisma.volunteerOpportunities.update({ where: { id: volunteer.id }, data: { createdAt: null } });
    const pages: Opportunity[] = [];
    for (let page = 1; page <= 3; page += 1) {
      const result = await (await request('GET', '/opportunities?search=' + prefix + '&pageSize=1&page=' + page)).json() as Page<Opportunity>;
      assert.equal(result.total, 3); pages.push(...result.items);
    }
    assert.equal(pages[0].key, current.key); assert.equal(new Set(pages.map((value) => value.key)).size, 3);
  });

  it('impide ciclos de categorías creados por actualizaciones concurrentes', async () => {
    const first = await createCategory();
    const second = await createCategory();
    const results = await Promise.all([
      request('PATCH', '/admin/categories/' + first.id, admin(), { parentId: second.id }),
      request('PATCH', '/admin/categories/' + second.id, admin(), { parentId: first.id }),
    ]);
    assert.deepEqual(results.map((value) => value.status).sort(), [200, 400]);
    const rows = await prisma.jobCategories.findMany({ where: { id: { in: [first.id, second.id] } } });
    assert.equal(rows.filter((value) => value.parentId != null).length, 1);
  });

  it('archiva sin borrar postulaciones, inscripciones ni auditoría y repite sin duplicar auditoría', async () => {
    const candidate = identities.get('CANDIDATE')!;
    const status = await prisma.applicationStatuses.create({ data: { name: runId } });
    const job = await published();
    const volunteer = await published('VOLUNTEER');
    const application = await prisma.applications.create({ data: { jobId: job.id, userId: candidate.id, statusId: status.id, referenceNumber: runId } });
    const registration = await prisma.volunteerRegistrations.create({ data: { volunteerOpportunityId: volunteer.id, userId: candidate.id } });
    for (const value of [job, volunteer]) {
      assert.equal((await request('DELETE', '/admin/opportunities/' + value.key, admin())).status, 200);
      assert.equal((await request('DELETE', '/admin/opportunities/' + value.key, admin())).status, 200);
      assert.equal(await prisma.auditLogs.count({ where: { entityType: value.kind === 'VOLUNTEER' ? 'VolunteerOpportunity' : 'Job', entityId: value.id, action: 'ARCHIVE' } }), 1);
    }
    assert.ok(await prisma.applications.findUnique({ where: { id: application.id } }));
    assert.ok(await prisma.volunteerRegistrations.findUnique({ where: { id: registration.id } }));
  });

  it('rechaza sesiones ausentes, candidatos y permisos revocados en todas las operaciones', async () => {
    const value = await draft();
    const routes = [
      ['GET', '/admin/opportunities', undefined, PERMISSIONS.OPPORTUNITY_READ],
      ['GET', '/admin/opportunities/catalogs', undefined, PERMISSIONS.OPPORTUNITY_READ],
      ['GET', '/admin/opportunities/' + value.key, undefined, PERMISSIONS.OPPORTUNITY_READ],
      ['POST', '/admin/opportunities', { kind: 'EMPLOYMENT', title: runId }, PERMISSIONS.OPPORTUNITY_CREATE],
      ['PATCH', '/admin/opportunities/' + value.key, { description: 'Texto' }, PERMISSIONS.OPPORTUNITY_UPDATE],
      ['PATCH', '/admin/opportunities/' + value.key + '/status', { status: 'OPEN' }, PERMISSIONS.OPPORTUNITY_STATUS_UPDATE],
      ['DELETE', '/admin/opportunities/' + value.key, undefined, PERMISSIONS.OPPORTUNITY_ARCHIVE],
      ['GET', '/admin/categories', undefined, PERMISSIONS.CATEGORY_READ],
      ['POST', '/admin/categories', { name: runId }, PERMISSIONS.CATEGORY_CREATE],
      ['PATCH', '/admin/categories/' + categoryId, { description: 'Texto' }, PERMISSIONS.CATEGORY_UPDATE],
      ['DELETE', '/admin/categories/' + categoryId, undefined, PERMISSIONS.CATEGORY_DELETE],
    ] as const;
    const role = await prisma.role.findUniqueOrThrow({ where: { name: ROLE_NAMES.ADMINISTRATOR } });
    for (const [method, route, body, permissionName] of routes) {
      assert.equal((await request(method, route, undefined, body)).status, 401);
      assert.equal((await request(method, route, identities.get('CANDIDATE'), body)).status, 403);
      const permission = await prisma.permissions.findUniqueOrThrow({ where: { name: permissionName } });
      await prisma.rolePermissions.delete({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } } });
      assert.equal((await request(method, route, admin(), body)).status, 403);
      await seedAccountCatalogs(prisma);
    }
  });

  it('revierte creaciones si falla la auditoría y el seed no cambia los catálogos existentes', async () => {
    const title = runId + '-rollback';
    await assert.rejects(createOpportunity({ title, kind: 'EMPLOYMENT' }, { userId: 2147483647, roles: ['ADMINISTRATOR'], permissions: [...ROLE_PERMISSIONS.ADMINISTRATOR] }));
    assert.equal(await prisma.jobs.count({ where: { title } }), 0);
    const before = await prisma.jobStatuses.findMany({ orderBy: { id: 'asc' } });
    await seedOpportunityCatalogs(prisma); await seedOpportunityCatalogs(prisma);
    assert.deepEqual(await prisma.jobStatuses.findMany({ orderBy: { id: 'asc' } }), before);
  });
});
