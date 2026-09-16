import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, after, describe, it } from 'node:test';
import bcrypt from 'bcrypt';
import { prisma } from '../../src/config/prisma.js';
import { createApp } from '../../src/app.js';
import { ROLE_NAMES, PERMISSIONS, type RoleCode } from '../../src/constants/authorization.constants.js';
import { seedAccountCatalogs } from '../../src/services/catalog.service.js';
import type { ManagedUser, UserListResponse } from '../../src/types/admin-user.types.js';
import type { RegistrationResponse } from '../../src/types/auth.types.js';
import { startTestServer, stopTestServer, type TestServer } from '../helpers/http.js';

interface Identity { id: number; email: string; token: string; cookie: string }
const runId = randomUUID();
const createdIds: number[] = [];
const identities = new Map<RoleCode, Identity>();
const password = 'Contraseña de pruebas 2026';
let passwordHash: string;
let api: TestServer;

/** Test accounts are scoped to this suite and created only in the isolated database. */
const fixture = async (roles: RoleCode[], fullName = 'Cuenta Prueba'): Promise<{ id: number; email: string }> => {
  const user = await prisma.user.create({
    data: { email: runId + '-' + randomUUID() + '@example.test', passwordHash,
      profile: { create: { firstName: fullName, lastName: 'Integración' } },
      status: { connect: { name: 'Activo' } },
      userRoles: { create: roles.map((role) => ({ roles: { connect: { name: ROLE_NAMES[role] } } })) } },
    select: { id: true, email: true },
  });
  createdIds.push(user.id); return user;
};

/** Calls the real API with origin protection and optional authenticated access. */
const request = (method: string, path: string, actor?: Identity, body?: unknown): Promise<Response> =>
  fetch(api.baseUrl + '/api' + path, {
    method, headers: { 'Content-Type': 'application/json', 'X-FQA-Request': '1',
      ...(actor ? { Authorization: 'Bearer ' + actor.token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

/** Logs in fixtures without printing or persisting credentials. */
const login = async (account: { id: number; email: string }): Promise<Identity> => {
  const response = await request('POST', '/auth/login', undefined, { email: account.email, password });
  assert.equal(response.status, 200);
  const body = await response.json() as RegistrationResponse;
  return { ...account, token: body.accessToken, cookie: response.headers.get('set-cookie')!.split(';')[0] };
};

/** Requires a prepared role-specific identity. */
const actorFor = (role: RoleCode = 'SUPER_ADMIN'): Identity => {
  const actor = identities.get(role); assert.ok(actor); return actor;
};

describe('Gestión de usuarios del Super Admin', () => {
  before(async () => {
    assert.equal(process.env.NODE_ENV, 'test');
    assert.ok(process.env.TEST_DATABASE_URL?.includes('_test'));
    assert.equal(process.env.DATABASE_URL, process.env.TEST_DATABASE_URL);
    passwordHash = await bcrypt.hash(password, 12);
    api = await startTestServer(createApp());
    for (const role of Object.keys(ROLE_NAMES) as RoleCode[]) {
      identities.set(role, await login(await fixture([role], role)));
    }
  });
  after(async () => {
    if (api) await stopTestServer(api.server);
    await prisma.auditLogs.deleteMany({ where: { entityType: 'User', entityId: { in: createdIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.$disconnect();
  });

  it('rechaza visitantes y candidatos en las tres operaciones', async () => {
    for (const actor of [undefined, actorFor('CANDIDATE')]) {
      for (const [method, path, body] of [
        ['GET', '/admin/users', undefined],
        ['POST', '/admin/users', { fullName: 'Persona', email: 'fixture@example.test', password, role: 'CANDIDATE' }],
        ['PATCH', '/admin/users/' + actorFor('CANDIDATE').id, { fullName: 'Otro nombre' }],
      ] as const) {
        assert.equal((await request(method, path, actor, body)).status, actor ? 403 : 401);
      }
    }
  });

  it('Administrador consulta solo candidatos y puede crearlos sin cambiar su sesión', async () => {
    const admin = actorFor('ADMINISTRATOR');
    const mixed = await fixture(['CANDIDATE', 'ADMINISTRATOR']);
    const privileged = await fixture(['CANDIDATE', 'SUPER_ADMIN']);
    const email = runId + '-admin-created-' + randomUUID() + '@example.test';
    const response = await request('POST', '/admin/users', admin, { fullName: 'Nuevo Candidato', email, password, role: 'CANDIDATE' });
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('set-cookie'), null);
    const created = await response.json() as ManagedUser; createdIds.push(created.id);
    assert.deepEqual(created.roles, ['CANDIDATE']);
    const list = await request('GET', '/admin/users?search=' + runId + '&pageSize=100', admin);
    assert.equal(list.status, 200);
    const result = await list.json() as UserListResponse;
    assert.ok(result.items.some((user) => user.id === created.id));
    assert.ok(result.items.every((user) => user.roles.length === 1 && user.roles[0] === 'CANDIDATE'));
    assert.ok(!result.items.some((user) => [admin.id, actorFor().id, mixed.id, privileged.id].includes(user.id)));
    const filtered = await request('GET', '/admin/users?role=CANDIDATE&search=' + email, admin);
    assert.equal((await filtered.json() as UserListResponse).total, 1);
    assert.equal((await request('GET', '/auth/me', admin)).status, 200);
    const audit = await prisma.auditLogs.findFirstOrThrow({ where: { entityType: 'User', entityId: created.id, action: 'CREATE' } });
    assert.equal(audit.userId, admin.id);
  });

  it('Administrador no puede crear, editar ni filtrar cuentas privilegiadas', async () => {
    const admin = actorFor('ADMINISTRATOR');
    for (const role of ['ADMINISTRATOR', 'SUPER_ADMIN']) {
      const response = await request('POST', '/admin/users', admin, {
        fullName: 'Cuenta prohibida', email: runId + '-forbidden@example.test', password, role,
      });
      assert.equal(response.status, role === 'SUPER_ADMIN' ? 400 : 403);
      assert.equal((await request('GET', '/admin/users?role=' + role, admin)).status, 403);
    }
    for (const target of [actorFor(), admin, actorFor('CANDIDATE'), await fixture(['CANDIDATE', 'SUPER_ADMIN'])]) {
      assert.equal((await request('PATCH', '/admin/users/' + target.id, admin, { fullName: 'Cambio prohibido' })).status, 403);
      assert.equal((await request('PATCH', '/admin/users/' + target.id, admin, { role: 'ADMINISTRATOR' })).status, 403);
    }
    assert.equal(await prisma.user.count({ where: { email: runId + '-forbidden@example.test' } }), 0);
  });

  it('Administrador necesita permisos vigentes y no obtiene privilegios por un grant incorrecto', async () => {
    const admin = actorFor('ADMINISTRATOR');
    const role = await prisma.role.findUniqueOrThrow({ where: { name: ROLE_NAMES.ADMINISTRATOR } });
    for (const permission of [PERMISSIONS.CANDIDATE_READ, PERMISSIONS.CANDIDATE_CREATE]) {
      const record = await prisma.permissions.findUniqueOrThrow({ where: { name: permission } });
      await prisma.rolePermissions.delete({ where: { roleId_permissionId: { roleId: role.id, permissionId: record.id } } });
      try {
        const response = permission === PERMISSIONS.CANDIDATE_READ
          ? await request('GET', '/admin/users', admin)
          : await request('POST', '/admin/users', admin, { fullName: 'Persona', email: runId + '-denied@example.test', password, role: 'CANDIDATE' });
        assert.equal(response.status, 403);
      } finally { await seedAccountCatalogs(prisma); }
    }
    const grant = await prisma.permissions.findUniqueOrThrow({ where: { name: PERMISSIONS.ADMINISTRATOR_CREATE } });
    await prisma.rolePermissions.create({ data: { roleId: role.id, permissionId: grant.id } });
    try {
      assert.equal((await request('POST', '/admin/users', admin, {
        fullName: 'Persona', email: runId + '-denied@example.test', password, role: 'ADMINISTRATOR',
      })).status, 403);
    } finally { await seedAccountCatalogs(prisma); }
  });

  it('lista identidades reales con orden, filtros, nombre completo y paginación', async () => {
    const user = await fixture(['CANDIDATE'], 'Ana Rivera');
    const disabled = await prisma.userStatus.findUniqueOrThrow({ where: { name: 'Deshabilitado' } });
    await prisma.user.update({ where: { id: user.id }, data: { statusId: disabled.id } });
    const first = await request('GET', '/admin/users?search=' + runId + '&pageSize=2', actorFor());
    assert.equal(first.status, 200);
    const page = await first.json() as UserListResponse;
    assert.equal(page.items.length, 2); assert.ok(page.items[0].id < page.items[1].id);
    assert.equal(page.page, 1); assert.equal(page.pageSize, 2);
    assert.equal(page.total, createdIds.length);
    const second = await request('GET', '/admin/users?search=' + runId + '&pageSize=2&page=2', actorFor());
    const next = await second.json() as UserListResponse;
    assert.ok(next.items.every((item) => item.id > page.items[1].id));
    const filtered = await request('GET', '/admin/users?search=Ana%20Rivera&status=DISABLED&role=CANDIDATE', actorFor());
    const result = await filtered.json() as UserListResponse;
    assert.ok(result.items.some((item) => item.id === user.id && item.status === 'DISABLED'));
    assert.ok(!JSON.stringify(result).includes('password'));
    const defaultPage = await (await request('GET', '/admin/users', actorFor())).json() as UserListResponse;
    assert.equal(defaultPage.pageSize, 20);
  });

  it('crea candidatos y administradores activos con perfil y auditoría sin abrirles sesión', async () => {
    for (const role of ['CANDIDATE', 'ADMINISTRATOR'] as const) {
      const email = runId + '-' + randomUUID() + '@example.test';
      const response = await request('POST', '/admin/users', actorFor(), { fullName: ' Ana Rivera ', email: ' ' + email.toUpperCase() + ' ', password, role });
      assert.equal(response.status, 201);
      assert.equal(response.headers.get('set-cookie'), null);
      const created = await response.json() as ManagedUser; createdIds.push(created.id);
      assert.equal(created.email, email); assert.equal(created.fullName, 'Ana Rivera');
      assert.equal(created.status, 'ACTIVE'); assert.deepEqual(created.roles, [role]);
      assert.deepEqual(Object.keys(created).sort(), ['createdAt', 'deletedAt', 'email', 'fullName', 'id', 'roles', 'status']);
      const saved = await prisma.user.findUniqueOrThrow({ where: { id: created.id }, include: { profile: true } });
      assert.equal(saved.deletedAt, null);
      assert.equal(await bcrypt.compare(password, saved.passwordHash), true);
      assert.equal(bcrypt.getRounds(saved.passwordHash), 12);
      assert.equal(await prisma.authSession.count({ where: { userId: created.id } }), 0);
      const audit = await prisma.auditLogs.findFirstOrThrow({ where: { entityType: 'User', entityId: created.id, action: 'CREATE' } });
      assert.equal(audit.userId, actorFor().id);
      assert.ok(!JSON.stringify(audit.changes).includes('password'));
      assert.ok(!JSON.stringify(audit.changes).includes(password));
      assert.equal((await request('GET', '/auth/me', actorFor())).status, 200);
      assert.equal((await request('GET', '/auth/me', await login(created))).status, 200);
    }
  });

  it('libera correos de eliminados y mantiene su identidad fuera del listado normal', async () => {
    const account = await fixture(['CANDIDATE']);
    await prisma.user.update({ where: { id: account.id }, data: { deletedAt: new Date() } });
    const response = await request('POST', '/admin/users', actorFor(), {
      fullName: 'Duplicado', email: ' ' + account.email.toUpperCase() + ' ', password, role: 'CANDIDATE',
    });
    assert.equal(response.status, 201);
    const created = await response.json() as ManagedUser; createdIds.push(created.id);
    const results = await (await request('GET', '/admin/users?search=' + account.email, actorFor())).json() as UserListResponse;
    assert.equal(results.total, 1);
    assert.equal(results.items[0].id, created.id);
    assert.equal((await request('PATCH', '/admin/users/' + account.id, actorFor(), { fullName: 'Otro nombre' })).status, 404);
  });

  it('rechaza asignación Super Admin, permisos, contraseñas y cambios de ciclo de vida', async () => {
    const target = await fixture(['CANDIDATE']);
    for (const extra of [{ role: 'SUPER_ADMIN' }, { status: 'DISABLED' }, { deletedAt: null },
      { statusId: 1 }, { permissions: ['users.update'] }, { passwordHash: 'invalid' }]) {
      assert.equal((await request('POST', '/admin/users', actorFor(), { fullName: 'Persona', email: 'valid@example.test', password, role: 'CANDIDATE', ...extra })).status, 400);
      assert.equal((await request('PATCH', '/admin/users/' + target.id, actorFor(), { fullName: 'Persona', ...extra })).status, 400);
    }
    assert.equal((await request('PATCH', '/admin/users/' + target.id, actorFor(), { password })).status, 400);
    assert.equal((await request('PATCH', '/admin/users/' + target.id, actorFor(), {})).status, 400);
    assert.equal((await request('PATCH', '/admin/users/invalid', actorFor(), { fullName: 'Persona' })).status, 400);
    assert.equal((await request('GET', '/admin/users?pageSize=101', actorFor())).status, 400);
    assert.equal((await request('PATCH', '/admin/users/2147483647', actorFor(), { fullName: 'Persona' })).status, 404);
    assert.equal((await request('DELETE', '/admin/users/' + target.id, actorFor())).status, 400);
  });

  it('protege todas las cuentas Super Admin incluso si tienen roles adicionales', async () => {
    const other = await fixture(['SUPER_ADMIN', 'CANDIDATE']);
    for (const id of [actorFor().id, other.id]) {
      assert.equal((await request('PATCH', '/admin/users/' + id, actorFor(), { fullName: 'Cambio' })).status, 403);
      assert.equal((await request('PATCH', '/admin/users/' + id, actorFor(), { role: 'CANDIDATE' })).status, 403);
    }
  });

  it('edita perfiles sin cambiar roles múltiples ni cerrar sesiones cuando solo cambia el nombre', async () => {
    const account = await fixture(['CANDIDATE', 'ADMINISTRATOR']);
    const identity = await login(account);
    const response = await request('PATCH', '/admin/users/' + account.id, actorFor(), { fullName: 'Nombre Nuevo' });
    assert.equal(response.status, 200);
    const body = await response.json() as ManagedUser;
    assert.equal(body.fullName, 'Nombre Nuevo'); assert.deepEqual(body.roles, ['ADMINISTRATOR', 'CANDIDATE']);
    assert.equal((await request('GET', '/auth/me', identity)).status, 200);
  });

  it('reemplaza roles solo por petición explícita y revoca todas las sesiones anteriores', async () => {
    const account = await fixture(['CANDIDATE']);
    const first = await login(account); const second = await login(account);
    const response = await request('PATCH', '/admin/users/' + account.id, actorFor(), { role: 'ADMINISTRATOR' });
    assert.equal(response.status, 200); assert.deepEqual((await response.json() as ManagedUser).roles, ['ADMINISTRATOR']);
    assert.equal((await request('GET', '/auth/me', first)).status, 401);
    assert.equal((await request('GET', '/auth/me', second)).status, 401);
    const current = await login(account);
    const access = await (await request('GET', '/auth/me', current)).json() as RegistrationResponse;
    assert.ok(access.permissions.includes('candidates.create'));
    assert.ok(!access.permissions.includes('users.update'));
    const audit = await prisma.auditLogs.findFirstOrThrow({ where: { entityType: 'User', entityId: account.id, action: 'UPDATE' } });
    assert.deepEqual((audit.changes as { after: { roles: string[] } }).after.roles, ['ADMINISTRATOR']);
  });

  it('cambiar correo revoca acceso y cambiarlo solo en mayúsculas no lo revoca', async () => {
    const account = await fixture(['CANDIDATE']); const identity = await login(account);
    assert.equal((await request('PATCH', '/admin/users/' + account.id, actorFor(), { email: account.email.toUpperCase() })).status, 200);
    assert.equal((await request('GET', '/auth/me', identity)).status, 200);
    const email = runId + '-renamed-' + randomUUID() + '@example.test';
    assert.equal((await request('PATCH', '/admin/users/' + account.id, actorFor(), { email })).status, 200);
    assert.equal((await request('GET', '/auth/me', identity)).status, 401);
    assert.equal((await request('POST', '/auth/login', undefined, { email: account.email, password })).status, 401);
    assert.equal((await request('GET', '/auth/me', await login({ ...account, email }))).status, 200);
  });

  it('un conflicto de correo revierte cambios de perfil, rol, sesiones y auditoría', async () => {
    const account = await fixture(['CANDIDATE']); const identity = await login(account);
    const before = await prisma.user.findUniqueOrThrow({ where: { id: account.id }, include: { profile: true, userRoles: true } });
    const count = await prisma.auditLogs.count({ where: { entityType: 'User', entityId: account.id } });
    const response = await request('PATCH', '/admin/users/' + account.id, actorFor(), {
      fullName: 'No debe guardarse', email: actorFor().email, role: 'ADMINISTRATOR',
    });
    assert.equal(response.status, 409);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: account.id }, include: { profile: true, userRoles: true } });
    assert.equal(after.email, before.email); assert.deepEqual(after.profile, before.profile); assert.deepEqual(after.userRoles, before.userRoles);
    assert.equal(await prisma.auditLogs.count({ where: { entityType: 'User', entityId: account.id } }), count);
    assert.equal((await request('GET', '/auth/me', identity)).status, 200);
  });

  it('estado deshabilitado y deleted_at bloquean login, JWT y renovación de forma independiente', async () => {
    const disabled = await prisma.userStatus.findUniqueOrThrow({ where: { name: 'Deshabilitado' } });
    for (const data of [{ statusId: disabled.id }, { deletedAt: new Date() }]) {
      const account = await fixture(['CANDIDATE']); const identity = await login(account);
      await prisma.user.update({ where: { id: account.id }, data });
      assert.equal((await request('POST', '/auth/login', undefined, { email: account.email, password })).status, 401);
      assert.equal((await request('GET', '/auth/me', identity)).status, 401);
      const refresh = await fetch(api.baseUrl + '/api/auth/refresh', { method: 'POST', headers: { 'X-FQA-Request': '1', Cookie: identity.cookie } });
      assert.equal(refresh.status, 401);
      if ('statusId' in data) {
        const update = await request('PATCH', '/admin/users/' + account.id, actorFor(), { fullName: 'Perfil actualizado' });
        assert.equal(update.status, 200);
        assert.equal((await update.json() as ManagedUser).status, 'DISABLED');
      }
    }
  });

  it('consulta y edición requieren permisos vigentes además del rol Super Admin', async () => {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: ROLE_NAMES.SUPER_ADMIN } });
    const target = await fixture(['CANDIDATE']);
    for (const permission of [PERMISSIONS.USERS_READ, PERMISSIONS.USERS_UPDATE, PERMISSIONS.CANDIDATE_CREATE, PERMISSIONS.ADMINISTRATOR_CREATE]) {
      const record = await prisma.permissions.findUniqueOrThrow({ where: { name: permission } });
      await prisma.rolePermissions.delete({ where: { roleId_permissionId: { roleId: role.id, permissionId: record.id } } });
      try {
        if (permission === PERMISSIONS.USERS_READ) assert.equal((await request('GET', '/admin/users', actorFor())).status, 403);
        else if (permission === PERMISSIONS.USERS_UPDATE) assert.equal((await request('PATCH', '/admin/users/' + target.id, actorFor(), { fullName: 'Nuevo' })).status, 403);
        else assert.equal((await request('POST', '/admin/users', actorFor(), {
          fullName: 'Persona', email: 'valid@example.test', password,
          role: permission === PERMISSIONS.CANDIDATE_CREATE ? 'CANDIDATE' : 'ADMINISTRATOR',
        })).status, 403);
      } finally { await seedAccountCatalogs(prisma); }
    }
  });
});
