import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, after, describe, it } from 'node:test';
import bcrypt from 'bcrypt';
import { prisma } from '../../src/config/prisma.js';
import { createApp } from '../../src/app.js';
import { ROLE_NAMES, ROLE_PERMISSIONS, PERMISSIONS, type RoleCode } from '../../src/constants/authorization.constants.js';
import { seedAccountCatalogs, seedOrganizationCatalogs } from '../../src/services/catalog.service.js';
import { createOrganization, updateOrganization, changeOrganizationStatus } from '../../src/services/organization.service.js';
import type { ManagedOrganization, OrganizationListResponse } from '../../src/types/organization.types.js';
import type { RegistrationResponse } from '../../src/types/auth.types.js';
import { startTestServer, stopTestServer, type TestServer } from '../helpers/http.js';

interface Identity { id: number; token: string }
const runId = randomUUID();
const userIds: number[] = [];
const organizationIds: number[] = [];
const identities = new Map<RoleCode, Identity>();
const password = 'Contraseña de pruebas 2026';
const path = '/admin/organizations';
let api: TestServer;

/** Calls only the loopback API bound to the isolated test database. */
const request = (method: string, route: string, actor?: Identity, body?: unknown): Promise<Response> =>
  fetch(api.baseUrl + '/api' + route, {
    method, headers: { 'Content-Type': 'application/json', 'X-FQA-Request': '1',
      ...(actor ? { Authorization: 'Bearer ' + actor.token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

/** Returns an authenticated fixture with a real revocable session. */
const actorFor = (role: RoleCode = 'SUPER_ADMIN'): Identity => {
  const actor = identities.get(role); assert.ok(actor); return actor;
};

/** Creates uniquely named organizations through the real API and tracks cleanup. */
const create = async (actor = actorFor(), fields: Record<string, unknown> = {}): Promise<ManagedOrganization> => {
  const response = await request('POST', path, actor, { name: runId + '-' + randomUUID(), ...fields });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('set-cookie'), null);
  const result = await response.json() as ManagedOrganization;
  organizationIds.push(result.id);
  return result;
};

/** Covers every route separately even where they share a permission. */
const operations = (id: number) => [
  { method: 'GET', route: path, permission: PERMISSIONS.ORGANIZATION_READ, body: undefined },
  { method: 'GET', route: path + '/' + id, permission: PERMISSIONS.ORGANIZATION_READ, body: undefined },
  { method: 'POST', route: path, permission: PERMISSIONS.ORGANIZATION_CREATE, body: { name: runId + '-denied' } },
  { method: 'PATCH', route: path + '/' + id, permission: PERMISSIONS.ORGANIZATION_UPDATE, body: { description: 'Cambio' } },
  { method: 'PATCH', route: path + '/' + id + '/status', permission: PERMISSIONS.ORGANIZATION_STATUS_UPDATE, body: { status: 'INACTIVE' } },
];

describe('Gestión administrativa de organizaciones', () => {
  before(async () => {
    assert.equal(process.env.NODE_ENV, 'test');
    assert.ok(process.env.TEST_DATABASE_URL?.includes('_test'));
    assert.equal(process.env.DATABASE_URL, process.env.TEST_DATABASE_URL);
    api = await startTestServer(createApp());
    const passwordHash = await bcrypt.hash(password, 12);
    for (const role of Object.keys(ROLE_NAMES) as RoleCode[]) {
      const user = await prisma.user.create({
        data: { email: runId + '-' + role.toLowerCase() + '@example.test', passwordHash,
          status: { connect: { name: 'Activo' } },
          userRoles: { create: { roles: { connect: { name: ROLE_NAMES[role] } } } } },
      });
      userIds.push(user.id);
      const login = await request('POST', '/auth/login', undefined, { email: user.email, password });
      assert.equal(login.status, 200);
      identities.set(role, { id: user.id, token: (await login.json() as RegistrationResponse).accessToken });
    }
  });

  after(async () => {
    if (api) await stopTestServer(api.server);
    await seedAccountCatalogs(prisma);
    await prisma.auditLogs.deleteMany({ where: { entityType: 'Organization', entityId: { in: organizationIds } } });
    await prisma.organizations.deleteMany({ where: { OR: [{ id: { in: organizationIds } }, { name: { startsWith: runId } }] } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.jobCategories.deleteMany({ where: { name: runId } });
    await prisma.employmentTypes.deleteMany({ where: { name: runId } });
    await prisma.experienceLevels.deleteMany({ where: { name: runId } });
    await prisma.jobStatuses.deleteMany({ where: { name: runId } });
    await prisma.volunteerStatuses.deleteMany({ where: { name: runId } });
    await prisma.locations.deleteMany({ where: { department: runId } });
    await prisma.$disconnect();
  });

  it('permite las cinco operaciones a ambos roles y devuelve solo el contrato público', async () => {
    for (const role of ['ADMINISTRATOR', 'SUPER_ADMIN'] as const) {
      const actor = actorFor(role);
      const organization = await create(actor, { email: ' CONTACTO@EXAMPLE.TEST ', description: ' Texto ' });
      assert.deepEqual(Object.keys(organization).sort(), ['createdAt', 'description', 'email', 'id', 'name', 'status']);
      assert.equal(organization.email, 'contacto@example.test');
      assert.equal(organization.description, 'Texto');
      assert.equal(organization.status, 'ACTIVE');
      assert.ok(organization.createdAt);
      const detail = await request('GET', path + '/' + organization.id, actor);
      assert.equal(detail.status, 200);
      assert.equal(detail.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await detail.json(), organization);
      assert.equal((await request('GET', path, actor)).status, 200);
      const update = await request('PATCH', path + '/' + organization.id, actor, { description: 'Nueva' });
      assert.equal(update.status, 200);
      assert.equal((await update.json() as ManagedOrganization).email, organization.email);
      for (const status of ['INACTIVE', 'ACTIVE']) {
        const change = await request('PATCH', path + '/' + organization.id + '/status', actor, { status });
        assert.equal(change.status, 204); assert.equal(await change.text(), '');
        assert.equal((await (await request('GET', path + '/' + organization.id, actor)).json() as ManagedOrganization).status, status);
      }
      const logs = await prisma.auditLogs.findMany({ where: { entityType: 'Organization', entityId: organization.id }, orderBy: { id: 'asc' } });
      assert.deepEqual(logs.map((log) => log.action), ['CREATE', 'UPDATE', 'DISABLE', 'ENABLE']);
      assert.ok(logs.every((log) => log.userId === actor.id));
      assert.deepEqual(logs[0].changes, { before: null, after: organization });
      assert.deepEqual(logs[1].changes, { before: organization, after: { ...organization, description: 'Nueva' } });
      assert.equal(await prisma.organizationUsers.count({ where: { organizationId: organization.id } }), 0);
      assert.equal((await request('GET', '/auth/me', actor)).status, 200);
    }
  });

  it('rechaza visitantes, candidatos, JWT inválidos y sesiones revocadas en todas las rutas', async () => {
    const organization = await create();
    for (const actor of [undefined, actorFor('CANDIDATE'), { id: 0, token: 'invalido' }]) {
      for (const op of operations(organization.id)) {
        assert.equal((await request(op.method, op.route, actor, op.body)).status,
          actor === identities.get('CANDIDATE') ? 403 : 401);
      }
    }
    const actor = actorFor('ADMINISTRATOR');
    const session = await prisma.authSession.findFirstOrThrow({ where: { userId: actor.id } });
    await prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    try {
      for (const op of operations(organization.id)) assert.equal((await request(op.method, op.route, actor, op.body)).status, 401);
    } finally {
      await prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: null } });
    }
  });

  it('exige los permisos vigentes y conserva el límite de rol ante grants incorrectos', async () => {
    const organization = await create();
    for (const roleCode of ['ADMINISTRATOR', 'SUPER_ADMIN'] as const) {
      const role = await prisma.role.findUniqueOrThrow({ where: { name: ROLE_NAMES[roleCode] } });
      for (const op of operations(organization.id)) {
        const permission = await prisma.permissions.findUniqueOrThrow({ where: { name: op.permission } });
        await prisma.rolePermissions.delete({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } } });
        try { assert.equal((await request(op.method, op.route, actorFor(roleCode), op.body)).status, 403); }
        finally { await seedAccountCatalogs(prisma); }
      }
    }
    const candidate = await prisma.role.findUniqueOrThrow({ where: { name: ROLE_NAMES.CANDIDATE } });
    const grants = await prisma.permissions.findMany({ where: { name: { startsWith: 'organizations.' } } });
    await prisma.rolePermissions.createMany({ data: grants.map((grant) => ({ roleId: candidate.id, permissionId: grant.id })) });
    try {
      for (const op of operations(organization.id)) assert.equal((await request(op.method, op.route, actorFor('CANDIDATE'), op.body)).status, 403);
    } finally { await seedAccountCatalogs(prisma); }
  });

  it('protege mutaciones por encabezado y origen', async () => {
    const organization = await create();
    for (const op of operations(organization.id).filter((operation) => operation.method !== 'GET')) {
      const protections: Record<string, string>[] = [{}, { 'X-FQA-Request': '1', Origin: 'https://otro.example.test' }];
      for (const protection of protections) {
        const response = await fetch(api.baseUrl + '/api' + op.route, {
          method: op.method, headers: {
            'Content-Type': 'application/json', Authorization: 'Bearer ' + actorFor().token, ...protection,
          }, body: JSON.stringify(op.body),
        });
        assert.equal(response.status, 403);
      }
    }
  });

  it('permite correo compartido, omisión y null sin alterar el estado durante edición', async () => {
    const first = await create(undefined, { email: 'compartido@example.test' });
    const second = await create(undefined, { email: 'compartido@example.test' });
    assert.equal(first.email, second.email);
    const empty = await create(); assert.equal(empty.email, null); assert.equal(empty.description, null);
    await request('PATCH', path + '/' + first.id + '/status', actorFor(), { status: 'INACTIVE' });
    const edited = await request('PATCH', path + '/' + first.id, actorFor(), { email: null, description: '  ' });
    assert.equal(edited.status, 200);
    const body = await edited.json() as ManagedOrganization;
    assert.equal(body.email, null); assert.equal(body.description, null); assert.equal(body.status, 'INACTIVE');
    const restored = await request('PATCH', path + '/' + first.id, actorFor(), { email: ' NUEVO@EXAMPLE.TEST ' });
    assert.equal(restored.status, 200);
    assert.equal((await restored.json() as ManagedOrganization).email, 'nuevo@example.test');
  });

  it('combina filtros con búsqueda insensible a mayúsculas y paginación estable', async () => {
    const marker = runId + '-filter';
    const first = await create(undefined, { name: marker + '-Uno', email: marker + '@example.test' });
    const second = await create(undefined, { name: marker + '-Dos', email: marker + '@example.test' });
    await request('PATCH', path + '/' + second.id + '/status', actorFor(), { status: 'INACTIVE' });
    const getPage = async (query: string): Promise<OrganizationListResponse> => {
      const response = await request('GET', path + '?' + query, actorFor());
      assert.equal(response.status, 200); return await response.json() as OrganizationListResponse;
    };
    const defaults = await getPage('search=' + marker.toUpperCase());
    assert.equal(defaults.total, 2); assert.equal(defaults.page, 1); assert.equal(defaults.pageSize, 20);
    assert.deepEqual(defaults.items.map((item) => item.id), [first.id, second.id]);
    const page = await getPage('search=' + marker + '&pageSize=1&page=2');
    assert.equal(page.total, 2); assert.deepEqual(page.items.map((item) => item.id), [second.id]);
    const inactive = await getPage('search=' + marker.toUpperCase() + '%40EXAMPLE.TEST&status=INACTIVE');
    assert.deepEqual(inactive.items.map((item) => item.id), [second.id]);
    const active = await getPage('search=' + marker + '&status=ACTIVE');
    assert.deepEqual(active.items.map((item) => item.id), [first.id]);
    assert.deepEqual((await getPage('search=' + marker + '&page=10')).items, []);
    const missing = await getPage('search=' + randomUUID()); assert.equal(missing.total, 0); assert.deepEqual(missing.items, []);
  });

  it('rechaza solicitudes inválidas y devuelve 404 para IDs inexistentes', async () => {
    const organization = await create();
    for (const body of [{}, { name: ' ' }, { name: 'A' }, { name: 'a'.repeat(151) }, { email: '' }, { email: 'invalido' },
      { description: 'a'.repeat(5001) }, { status: 'ACTIVE' }, { statusId: 1 }, { userId: actorFor().id }, { organizationUsers: [] }]) {
      assert.equal((await request('PATCH', path + '/' + organization.id, actorFor(), body)).status, 400);
    }
    for (const extra of [{ status: 'INACTIVE' }, { statusId: 1 }, { userId: actorFor().id }, { email: '' }, { id: 1 }]) {
      assert.equal((await request('POST', path, actorFor(), { name: runId + '-invalid', ...extra })).status, 400);
    }
    for (const body of [{}, { status: 'DISABLED' }, { status: 'ACTIVE', name: 'Otro' }]) {
      assert.equal((await request('PATCH', path + '/' + organization.id + '/status', actorFor(), body)).status, 400);
    }
    for (const query of ['page=0', 'pageSize=101', 'status=DISABLED', 'unknown=1']) {
      assert.equal((await request('GET', path + '?' + query, actorFor())).status, 400);
    }
    for (const id of ['abc', '0', '-1', '1.5', '2147483648', '2147483647']) {
      for (const op of operations(1).filter((operation) => operation.route.includes('/1'))) {
        const response = await request(op.method, op.route.replace('/1', '/' + id), actorFor(), op.body);
        assert.equal(response.status, id === '2147483647' ? 404 : 400);
      }
    }
  });

  it('protege nombre único también en concurrencia y revierte cambios parciales y auditoría', async () => {
    const original = await create();
    const other = await create(undefined, { description: 'Original' });
    assert.equal((await request('POST', path, actorFor(), { name: ' ' + original.name + ' ' })).status, 409);
    const before = await prisma.auditLogs.count({ where: { entityType: 'Organization', entityId: other.id } });
    assert.equal((await request('PATCH', path + '/' + other.id, actorFor(), {
      name: original.name, description: 'No guardar', email: 'no@example.test',
    })).status, 409);
    assert.deepEqual(await (await request('GET', path + '/' + other.id, actorFor())).json(), other);
    assert.equal(await prisma.auditLogs.count({ where: { entityType: 'Organization', entityId: other.id } }), before);
    const name = runId + '-race';
    const results = await Promise.all([request('POST', path, actorFor(), { name }), request('POST', path, actorFor(), { name })]);
    assert.deepEqual(results.map((response) => response.status).sort(), [201, 409]);
    for (const response of results) if (response.status === 201) organizationIds.push((await response.json() as ManagedOrganization).id);
    assert.equal(await prisma.organizations.count({ where: { name } }), 1);
    const caseVariant = await create(undefined, { name: original.name.toUpperCase() });
    assert.notEqual(caseVariant.id, original.id);
  });

  it('revierte cada mutación si no puede persistir la auditoría', async () => {
    const organization = await create();
    const actor = { userId: 2147483647, roles: ['SUPER_ADMIN'] as ['SUPER_ADMIN'], permissions: [...ROLE_PERMISSIONS.SUPER_ADMIN] };
    const name = runId + '-rollback';
    await assert.rejects(createOrganization({ name }, actor));
    assert.equal(await prisma.organizations.count({ where: { name } }), 0);
    await assert.rejects(updateOrganization(organization.id, { description: 'No guardar' }, actor));
    await assert.rejects(changeOrganizationStatus(organization.id, 'INACTIVE', actor));
    assert.deepEqual(await (await request('GET', path + '/' + organization.id, actorFor())).json(), organization);
    assert.equal(await prisma.auditLogs.count({ where: { entityType: 'Organization', entityId: organization.id } }), 1);
  });

  it('repetir estados incluso simultáneamente no duplica auditorías', async () => {
    const organization = await create();
    const route = path + '/' + organization.id + '/status';
    assert.equal((await request('PATCH', route, actorFor(), { status: 'ACTIVE' })).status, 204);
    for (const status of ['INACTIVE', 'ACTIVE']) {
      const results = await Promise.all([
        request('PATCH', route, actorFor(), { status }), request('PATCH', route, actorFor('ADMINISTRATOR'), { status }),
      ]);
      assert.deepEqual(results.map((response) => response.status), [204, 204]);
      assert.equal((await request('PATCH', route, actorFor(), { status })).status, 204);
    }
    const logs = await prisma.auditLogs.findMany({ where: { entityType: 'Organization', entityId: organization.id }, orderBy: { id: 'asc' } });
    assert.deepEqual(logs.map((log) => log.action), ['CREATE', 'DISABLE', 'ENABLE']);
  });

  it('desactivar conserva empleos, voluntariados, archivos y relaciones históricas', async () => {
    const organization = await create();
    const category = await prisma.jobCategories.create({ data: { name: runId, slug: runId } });
    const employment = await prisma.employmentTypes.create({ data: { name: runId } });
    const experience = await prisma.experienceLevels.create({ data: { name: runId } });
    const jobStatus = await prisma.jobStatuses.create({ data: { name: runId } });
    const volunteerStatus = await prisma.volunteerStatuses.create({ data: { name: runId } });
    const location = await prisma.locations.create({ data: { department: runId, municipality: 'Prueba' } });
    await prisma.jobs.create({ data: {
      organizationId: organization.id, categoryId: category.id, employmentTypeId: employment.id,
      experienceLevelId: experience.id, statusId: jobStatus.id, locationId: location.id,
      title: 'Empleo de prueba', description: 'Descripción', slug: runId, publishedAt: new Date(),
    } });
    await prisma.volunteerOpportunities.create({ data: {
      organizationId: organization.id, categoryId: category.id, locationId: location.id,
      statusId: volunteerStatus.id, title: 'Voluntariado de prueba', description: 'Descripción', slug: runId,
    } });
    await prisma.files.create({ data: { organizationId: organization.id, filePath: 'test/documento.pdf', fileType: 'application/pdf' } });
    await prisma.organizationUsers.create({ data: { organizationId: organization.id, userId: actorFor('CANDIDATE').id } });
    const snapshot = () => prisma.organizations.findUniqueOrThrow({
      where: { id: organization.id },
      select: { jobs: true, volunteerOpportunities: true, files: true, organizationUsers: true },
    });
    const before = await snapshot();
    assert.equal((await request('PATCH', path + '/' + organization.id + '/status', actorFor(), { status: 'INACTIVE' })).status, 204);
    assert.deepEqual(await snapshot(), before);
  });

  it('el seed preserva IDs, organizaciones y permisos al repetirse', async () => {
    const organization = await create();
    const snapshot = () => prisma.organizationStatuses.findMany({ orderBy: { id: 'asc' } });
    const before = await snapshot();
    await seedOrganizationCatalogs(prisma); await seedOrganizationCatalogs(prisma);
    await seedAccountCatalogs(prisma); await seedAccountCatalogs(prisma);
    assert.deepEqual(await snapshot(), before);
    assert.deepEqual(await (await request('GET', path + '/' + organization.id, actorFor())).json(), organization);
    assert.equal(before.filter((state) => state.name === 'Activo').length, 1);
    assert.equal(before.filter((state) => state.name === 'Inactivo').length, 1);
  });
});
