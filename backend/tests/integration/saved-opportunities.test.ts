import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';
import { prisma } from '../../src/config/prisma.js';
import { env } from '../../src/config/env.js';
import { createApp } from '../../src/app.js';
import { PERMISSIONS, ROLE_NAMES } from '../../src/constants/authorization.constants.js';
import { OPPORTUNITY_KINDS, OPPORTUNITY_STATUS_NAMES, type OpportunityType } from '../../src/constants/opportunity.constants.js';
import { seedAccountCatalogs } from '../../src/services/catalog.service.js';
import type { RegistrationResponse } from '../../src/types/auth.types.js';
import type { Opportunity } from '../../src/services/opportunity.service.js';
import type { listSavedOpportunities } from '../../src/services/saved-opportunity.service.js';
import { startTestServer, stopTestServer, type TestServer } from '../helpers/http.js';

type SavedPage = Awaited<ReturnType<typeof listSavedOpportunities>>;
const runId = randomUUID();
const password = 'Guardados de prueba 2026';
const userIds: number[] = [];
let api: TestServer;
let candidate: RegistrationResponse;
let other: RegistrationResponse;
let admin: RegistrationResponse;
let organizationId: number;
let categoryId: number;
let employmentTypeId: number;

/** Exercises real middleware and PostgreSQL while identities come only from authenticated sessions. */
const request = (method: string, route: string, actor?: RegistrationResponse, body?: unknown): Promise<Response> => fetch(api.baseUrl + '/api' + route, {
  method, headers: { 'Content-Type': 'application/json', 'X-FQA-Request': '1', ...(actor ? { Authorization: 'Bearer ' + actor.accessToken } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
});
/** Assertions avoid printing tokens or account payloads on failure. */
const json = async <T>(response: Response, status = 200): Promise<T> => { assert.equal(response.status, status); return await response.json() as T; };
/** Builds a published fixture through the same administrative API used by the application. */
const published = async (kind: OpportunityType = 'EMPLOYMENT'): Promise<Opportunity> => {
  const value = await json<Opportunity>(await request('POST', '/admin/opportunities', admin, {
    kind, contactEmail: 'contacto@example.test', title: runId + '-' + randomUUID(), description: 'Vacante completa para comprobar la persistencia de los guardados.',
    organizationId, categoryId, department: runId, municipality: 'Municipio',
    ...(kind === 'EMPLOYMENT' ? { employmentTypeId } : {}),
    ...(kind === 'SOCIAL_HOURS' ? { socialHours: 120 } : {}),
    ...(kind === 'INTERNSHIP' ? { duration: '3 meses' } : {}),
  }), 201);
  return json<Opportunity>(await request('PATCH', '/admin/opportunities/' + value.key + '/status', admin, { status: 'OPEN' }));
};
/** Candidate list and complete identity set are intentionally separate contracts. */
const page = (actor = candidate, query = '') => request('GET', '/saved-opportunities' + query, actor).then(response => json<SavedPage>(response));
const keys = (actor = candidate) => request('GET', '/saved-opportunities/keys', actor).then(response => json<{ keys: string[]; total: number }>(response));

describe('guardados persistentes de los cuatro tipos', () => {
  before(async () => {
    assert.equal(env.NODE_ENV, 'test'); assert.ok(new URL(env.DATABASE_URL).pathname.endsWith('_test'));
    api = await startTestServer(createApp());
    const register = async (label: string) => {
      const result = await json<RegistrationResponse>(await request('POST', '/auth/register', undefined, { fullName: 'Candidato de guardados', email: runId + '-' + label + '@example.test', password }), 201);
      userIds.push(result.userId); return result;
    };
    candidate = await register('candidate'); other = await register('other');
    const source = await prisma.user.findUniqueOrThrow({ where: { id: candidate.userId } });
    const row = await prisma.user.create({ data: { email: runId + '-admin@example.test', passwordHash: source.passwordHash,
      status: { connect: { name: 'Activo' } }, userRoles: { create: { roles: { connect: { name: ROLE_NAMES.ADMINISTRATOR } } } } } });
    userIds.push(row.id);
    admin = await json<RegistrationResponse>(await request('POST', '/auth/login', undefined, { email: row.email, password }));
    organizationId = (await json<{ id: number }>(await request('POST', '/admin/organizations', admin, { name: runId }), 201)).id;
    categoryId = (await json<{ id: number }>(await request('POST', '/admin/categories', admin, { name: runId }), 201)).id;
    employmentTypeId = (await prisma.employmentTypes.findFirstOrThrow()).id;
  });
  beforeEach(async () => {
    await Promise.all([prisma.savedJobs.deleteMany({ where: { userId: { in: userIds } } }), prisma.savedVolunteerOpportunities.deleteMany({ where: { userId: { in: userIds } } })]);
  });
  after(async () => {
    await seedAccountCatalogs(prisma);
    if (organizationId) {
      await prisma.jobs.deleteMany({ where: { organizationId } }); await prisma.volunteerOpportunities.deleteMany({ where: { organizationId } });
      await prisma.organizations.delete({ where: { id: organizationId } });
    }
    await prisma.auditLogs.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (categoryId) await prisma.jobCategories.delete({ where: { id: categoryId } });
    await prisma.locations.deleteMany({ where: { department: runId } });
    await stopTestServer(api.server); await prisma.$disconnect();
  });

  it('persiste los cuatro tipos, devuelve resúmenes privados y recupera guardados en otra sesión', async () => {
    const saved: string[] = [];
    for (const kind of OPPORTUNITY_KINDS) {
      const value = await published(kind); saved.push(value.key);
      assert.equal((await request('PUT', '/saved-opportunities/' + value.key, candidate)).status, 204);
    }
    const result = await page(); assert.equal(result.total, 4); assert.equal(result.items.length, 4);
    assert.deepEqual(new Set(result.items.map(item => item.kind)), new Set(OPPORTUNITY_KINDS));
    assert.ok(result.items.every(item => item.available && item.savedAt && !('userId' in item) && !('description' in item) && !('applications' in item)));
    assert.deepEqual(new Set((await keys()).keys), new Set(saved));
    const response = await request('GET', '/saved-opportunities', candidate); assert.equal(response.headers.get('cache-control'), 'no-store');
    const secondSession = await json<RegistrationResponse>(await request('POST', '/auth/login', undefined, { email: candidate.user.email, password }));
    assert.deepEqual((await keys(secondSession)).keys, (await keys()).keys);
  });

  it('separa IDs coincidentes entre empleo y voluntariado y permite quitar solo uno', async () => {
    const id = 2_000_000_000 + Math.floor(Math.random() * 1_000_000);
    const jobState = await prisma.jobStatuses.findUniqueOrThrow({ where: { name: OPPORTUNITY_STATUS_NAMES.OPEN } });
    const volunteerState = await prisma.volunteerStatuses.findUniqueOrThrow({ where: { name: OPPORTUNITY_STATUS_NAMES.OPEN } });
    const common = { id, title: runId + '-collision', slug: randomUUID(), description: 'Vacante publicada para probar identidades coincidentes.', organizationId, categoryId, publishedAt: new Date() };
    await prisma.jobs.create({ data: { ...common, statusId: jobState.id } });
    await prisma.volunteerOpportunities.create({ data: { ...common, slug: randomUUID(), statusId: volunteerState.id } });
    for (const key of ['job-' + id, 'volunteer-' + id]) assert.equal((await request('PUT', '/saved-opportunities/' + key, candidate)).status, 204);
    assert.deepEqual(new Set((await keys()).keys), new Set(['job-' + id, 'volunteer-' + id]));
    assert.equal((await request('DELETE', '/saved-opportunities/job-' + id, candidate)).status, 204);
    assert.deepEqual((await keys()).keys, ['volunteer-' + id]);
  });

  it('PUT concurrente no duplica ni cambia la fecha, y DELETE repetido es idempotente', async () => {
    for (const kind of ['EMPLOYMENT','VOLUNTEER'] as const) {
      const value = await published(kind);
      const results = await Promise.all(Array.from({ length: 6 }, () => request('PUT', '/saved-opportunities/' + value.key, candidate)));
      assert.ok(results.every(result => result.status === 204));
      const before = (await page()).items.find(item => item.key === value.key)!;
      assert.equal((await request('PUT', '/saved-opportunities/' + value.key, candidate)).status, 204);
      assert.equal((await page()).items.find(item => item.key === value.key)?.savedAt, before.savedAt);
      assert.equal((await request('DELETE', '/saved-opportunities/' + value.key, candidate)).status, 204);
      assert.equal((await request('DELETE', '/saved-opportunities/' + value.key, candidate)).status, 204);
    }
    assert.equal((await keys()).total, 0);
  });

  it('mezcla páginas y fechas nulas sin perder registros y devuelve el total completo', async () => {
    const saved = [];
    for (let index = 0; index < 15; index++) {
      const value = await published(index % 2 ? 'VOLUNTEER' : 'EMPLOYMENT');
      const date = new Date(Date.UTC(2020, 0, index + 1));
      if (value.kind === 'VOLUNTEER') await prisma.savedVolunteerOpportunities.create({ data: { userId: candidate.userId, volunteerOpportunityId: value.id, createdAt: date } });
      else await prisma.savedJobs.create({ data: { userId: candidate.userId, jobId: value.id, createdAt: index === 0 ? null : date } });
      saved.push(value.key);
    }
    const first = await page(candidate, '?page=1&pageSize=10'); const second = await page(candidate, '?page=2&pageSize=10');
    assert.equal(first.total, 15); assert.equal(first.items.length, 10); assert.equal(second.items.length, 5);
    assert.deepEqual([...first.items, ...second.items].map(item => item.key), saved.reverse());
    assert.equal(second.items.at(-1)?.savedAt, null); assert.equal((await keys()).keys.length, 15);
    assert.equal((await request('GET', '/saved-opportunities?page=0', candidate)).status, 400);
    assert.equal((await request('GET', '/saved-opportunities?pageSize=101', candidate)).status, 400);
    assert.equal((await request('GET', '/saved-opportunities?page=1001&pageSize=10', candidate)).status, 400);
  });

  it('conserva el ID y la fecha de SavedJobs existentes al repetir un guardado no disponible', async () => {
    const value = await published();
    const existing = await prisma.savedJobs.create({ data: { userId: candidate.userId, jobId: value.id, createdAt: new Date('2019-01-02T03:04:05Z') } });
    await request('PATCH', '/admin/opportunities/' + value.key + '/status', admin, { status: 'CLOSED' });
    assert.equal((await request('PUT', '/saved-opportunities/' + value.key, candidate)).status, 204);
    const after = await prisma.savedJobs.findUniqueOrThrow({ where: { id: existing.id } }); assert.equal(after.createdAt?.toISOString(), existing.createdAt?.toISOString());
    assert.equal((await page()).items[0]?.available, false);
  });

  it('retiene cerradas, vencidas y archivadas y bloquea guardados nuevos para ellas', async () => {
    for (const kind of ['EMPLOYMENT','VOLUNTEER'] as const) {
      for (const reason of ['closed','expired','archived'] as const) {
        const value = await published(kind); await request('PUT', '/saved-opportunities/' + value.key, candidate);
        if (reason === 'closed') await request('PATCH', '/admin/opportunities/' + value.key + '/status', admin, { status: 'CLOSED' });
        else if (reason === 'archived') await request('DELETE', '/admin/opportunities/' + value.key, admin);
        else if (kind === 'VOLUNTEER') await prisma.volunteerOpportunities.update({ where: { id: value.id }, data: { expiresAt: new Date('2020-01-01') } });
        else await prisma.jobs.update({ where: { id: value.id }, data: { expiresAt: new Date('2020-01-01') } });
        assert.equal((await page()).items.find(item => item.key === value.key)?.available, false);
        assert.equal((await request('PUT', '/saved-opportunities/' + value.key, other)).status, 404);
        assert.equal((await request('GET', '/opportunities/' + value.key)).status, 404);
        assert.equal((await request('DELETE', '/saved-opportunities/' + value.key, candidate)).status, 204);
      }
    }
    assert.equal((await keys()).total, 0);
  });

  it('aplica organización, categoría y fecha de publicación, y recupera disponibilidad al reactivarse', async () => {
    const value = await published(); await request('PUT', '/saved-opportunities/' + value.key, candidate);
    await prisma.jobCategories.update({ where: { id: categoryId }, data: { isActive: false } });
    try { assert.equal((await page()).items[0]?.available, false); assert.equal((await request('PUT', '/saved-opportunities/' + value.key, other)).status, 404); }
    finally { await prisma.jobCategories.update({ where: { id: categoryId }, data: { isActive: true } }); }
    assert.equal((await page()).items[0]?.available, true);
    await request('PATCH', '/admin/organizations/' + organizationId + '/status', admin, { status: 'INACTIVE' });
    try { assert.equal((await page()).items[0]?.available, false); assert.equal((await request('PUT', '/saved-opportunities/' + value.key, other)).status, 404); }
    finally { await request('PATCH', '/admin/organizations/' + organizationId + '/status', admin, { status: 'ACTIVE' }); }
    await prisma.jobs.update({ where: { id: value.id }, data: { publishedAt: new Date('2099-01-01') } });
    assert.equal((await page()).items[0]?.available, false); assert.equal((await request('PUT', '/saved-opportunities/' + value.key, other)).status, 404);
  });

  it('aisla candidatos y rechaza identidades ajenas, claves inválidas y accesos sin sesión', async () => {
    const value = await published(); await request('PUT', '/saved-opportunities/' + value.key, candidate);
    assert.equal((await keys(other)).total, 0);
    assert.equal((await request('DELETE', '/saved-opportunities/' + value.key, other)).status, 204); assert.equal((await keys()).total, 1);
    assert.equal((await request('PUT', '/saved-opportunities/' + value.key, other, { userId: candidate.userId })).status, 400);
    assert.equal((await request('GET', '/saved-opportunities?userId=' + candidate.userId, other)).status, 400);
    for (const route of ['/saved-opportunities','/saved-opportunities/keys']) assert.equal((await request('GET', route)).status, 401);
    assert.equal((await request('PUT', '/saved-opportunities/' + value.key)).status, 401);
    for (const key of ['job-0','job-2147483648','volunteer--1','invalid']) assert.equal((await request('PUT', '/saved-opportunities/' + key, candidate)).status, 400);
  });

  it('consulta grants vigentes y niega acceso administrativo aunque reciba permisos propios', async () => {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: ROLE_NAMES.CANDIDATE } });
    const read = await prisma.permissions.findUniqueOrThrow({ where: { name: PERMISSIONS.SAVED_OPPORTUNITY_READ_OWN } });
    const update = await prisma.permissions.findUniqueOrThrow({ where: { name: PERMISSIONS.SAVED_OPPORTUNITY_UPDATE_OWN } });
    const value = await published();
    await prisma.rolePermissions.deleteMany({ where: { roleId: role.id, permissionId: update.id } });
    try { assert.equal((await request('PUT', '/saved-opportunities/' + value.key, candidate)).status, 403); assert.equal((await request('GET', '/saved-opportunities/keys', candidate)).status, 200); }
    finally { await seedAccountCatalogs(prisma); }
    await prisma.rolePermissions.deleteMany({ where: { roleId: role.id, permissionId: read.id } });
    try { assert.equal((await request('GET', '/saved-opportunities/keys', candidate)).status, 403); }
    finally { await seedAccountCatalogs(prisma); }
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: ROLE_NAMES.ADMINISTRATOR } });
    await prisma.rolePermissions.createMany({ data: [read,update].map(permission => ({ roleId: adminRole.id, permissionId: permission.id })), skipDuplicates: true });
    try { assert.equal((await request('GET', '/saved-opportunities/keys', admin)).status, 403); assert.equal((await request('PUT', '/saved-opportunities/' + value.key, admin)).status, 403); }
    finally { await seedAccountCatalogs(prisma); }
  });

  it('un fallo de DB no confirma el guardado ni altera la colección', async () => {
    const value = await published();
    // Prisma's proxy methods lack property descriptors required by node:test's mock.method.
    const original = prisma.$transaction;
    prisma.$transaction = async () => { throw new Error('Fallo controlado de pruebas'); };
    try { assert.equal((await request('PUT', '/saved-opportunities/' + value.key, candidate)).status, 500); }
    finally { prisma.$transaction = original; }
    assert.equal((await keys()).total, 0);
    assert.equal((await request('PUT', '/saved-opportunities/' + value.key, candidate)).status, 204);
  });
});
