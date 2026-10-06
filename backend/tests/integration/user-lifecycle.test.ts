import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, after, describe, it } from 'node:test';
import bcrypt from 'bcrypt';
import { prisma } from '../../src/config/prisma.js';
import { createApp } from '../../src/app.js';
import { ROLE_NAMES, PERMISSIONS, type RoleCode } from '../../src/constants/authorization.constants.js';
import { seedAccountCatalogs } from '../../src/services/catalog.service.js';
import type { RegistrationResponse } from '../../src/types/auth.types.js';
import type { UserListResponse } from '../../src/types/admin-user.types.js';
import { startTestServer, stopTestServer, type TestServer } from '../helpers/http.js';

interface Account { id: number; email: string }
interface Identity extends Account { token: string; cookie: string }
const ids: number[] = [];
const actors = new Map<RoleCode, Identity>();
const runId = randomUUID();
const password = 'Clave de prueba exclusiva 2026';
const acknowledgement = { confirmDeletion: true };
let hash: string;
let api: TestServer;

/** Creates isolated fixtures; the DB guard runs before any writes. */
const fixture = async (roles: RoleCode[] = ['CANDIDATE'], email = runId + '-' + randomUUID() + '@example.test'): Promise<Account> => {
  const user = await prisma.user.create({ data: { email, passwordHash: hash,
    profile: { create: { firstName: 'Persona', lastName: 'Prueba' } },
    status: { connect: { name: 'Activo' } },
    userRoles: { create: roles.map((role) => ({ roles: { connect: { name: ROLE_NAMES[role] } } })) },
  }, select: { id: true, email: true } });
  ids.push(user.id); return user;
};
/** Sends real HTTP requests without logging credentials. */
const request = (method: string, path: string, actor?: Identity, body?: unknown): Promise<Response> =>
  fetch(api.baseUrl + '/api' + path, { method, headers: { 'Content-Type': 'application/json',
    'X-FQA-Request': '1', ...(actor ? { Authorization: 'Bearer ' + actor.token } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body) });
/** Signs in a fixture and retains credentials in memory only. */
const login = async (account: Account): Promise<Identity> => {
  const response = await request('POST', '/auth/login', undefined, { email: account.email, password });
  assert.equal(response.status, 200);
  const body = await response.json() as RegistrationResponse;
  return { ...account, token: body.accessToken, cookie: response.headers.get('set-cookie')!.split(';')[0] };
};
/** Loads the prepared administrative principal. */
const actor = (role: RoleCode = 'SUPER_ADMIN'): Identity => { const value = actors.get(role); assert.ok(value); return value; };
/** Calls the explicit delete endpoint with acknowledgement. */
const remove = (account: Account, principal = actor('ADMINISTRATOR')): Promise<Response> =>
  request('DELETE', '/admin/users/' + account.id, principal, acknowledgement);
/** Calls the restore endpoint. */
const restore = (account: Account, principal = actor()): Promise<Response> =>
  request('POST', '/admin/users/' + account.id + '/restore', principal, {});
/** Reads current persisted identity and history. */
const saved = (account: Account) => prisma.user.findUniqueOrThrow({
  where: { id: account.id }, include: { profile: true, status: true, userRoles: true },
});

describe('Ciclo de vida y unicidad de usuarios', () => {
  before(async () => {
    assert.equal(process.env.NODE_ENV, 'test');
    assert.equal(process.env.DATABASE_URL, process.env.TEST_DATABASE_URL);
    assert.ok(new URL(process.env.DATABASE_URL!).pathname.endsWith('_test'));
    hash = await bcrypt.hash(password, 12);
    api = await startTestServer(createApp());
    for (const role of ['CANDIDATE', 'ADMINISTRATOR', 'SUPER_ADMIN'] as const) actors.set(role, await login(await fixture([role])));
  });
  after(async () => {
    if (api) await stopTestServer(api.server);
    await prisma.auditLogs.deleteMany({ where: { entityType: 'User', entityId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it('exige autenticación, permisos y confirmación explícita en operaciones destructivas', async () => {
    const account = await fixture();
    assert.equal((await request('DELETE', '/admin/users/' + account.id, undefined, acknowledgement)).status, 401);
    assert.equal((await remove(account, actor('CANDIDATE'))).status, 403);
    assert.equal((await request('DELETE', '/admin/users/' + account.id, actor(), {})).status, 400);
    assert.equal((await request('DELETE', '/auth/me', actor('CANDIDATE'), { ...acknowledgement, id: account.id })).status, 400);
    assert.equal((await request('PATCH', '/admin/users/' + account.id + '/status', actor(), { status: 'ACTIVE', deletedAt: null })).status, 400);
    const forbiddenOrigin = await fetch(api.baseUrl + '/api/admin/users/' + account.id, {
      method: 'DELETE', headers: { Authorization: 'Bearer ' + actor().token, 'Content-Type': 'application/json' },
      body: JSON.stringify(acknowledgement),
    });
    assert.equal(forbiddenOrigin.status, 403);
    assert.equal((await saved(account)).deletedAt, null);
  });

  it('Administrador deshabilita y rehabilita candidatos sin revivir sesiones antiguas', async () => {
    const account = await fixture(); const first = await login(account); const second = await login(account);
    assert.equal((await request('PATCH', '/admin/users/' + account.id + '/status', actor('ADMINISTRATOR'), { status: 'DISABLED' })).status, 204);
    assert.equal((await saved(account)).deletedAt, null);
    assert.equal((await request('GET', '/auth/me', first)).status, 401);
    assert.equal((await request('GET', '/auth/me', second)).status, 401);
    assert.equal((await request('POST', '/auth/login', undefined, { email: account.email, password })).status, 401);
    assert.equal((await request('PATCH', '/admin/users/' + account.id + '/status', actor('ADMINISTRATOR'), { status: 'ACTIVE' })).status, 204);
    assert.equal((await saved(account)).status.name, 'Activo');
    assert.equal((await request('GET', '/auth/me', first)).status, 401);
    assert.equal((await request('GET', '/auth/me', await login(account))).status, 200);
  });

  it('el borrado añade un solo prefijo, conserva historial y revoca JWT y refresh', async () => {
    const account = await fixture(); const identity = await login(account); const before = await saved(account);
    assert.equal((await remove(account)).status, 204);
    assert.equal((await remove(account)).status, 204);
    const after = await saved(account);
    assert.equal(after.email, 'inactive.' + account.email);
    assert.ok(after.deletedAt); assert.equal(after.status.name, 'Deshabilitado');
    assert.deepEqual(after.profile, before.profile); assert.deepEqual(after.userRoles, before.userRoles);
    assert.equal(after.passwordHash, before.passwordHash);
    assert.equal((await request('GET', '/auth/me', identity)).status, 401);
    for (const email of [account.email, after.email]) assert.equal((await request('POST', '/auth/login', undefined, { email, password })).status, 401);
    assert.equal((await fetch(api.baseUrl + '/api/auth/refresh', { method: 'POST', headers: { Cookie: identity.cookie, 'X-FQA-Request': '1' } })).status, 401);
    const audits = await prisma.auditLogs.findMany({ where: { entityId: account.id, entityType: 'User', action: 'DELETE' } });
    assert.equal(audits.length, 1);
    assert.ok(!JSON.stringify(audits).includes(hash)); assert.ok(!JSON.stringify(audits).includes(password));
  });

  it('permite repetir creación y borrado con correos eliminados idénticos, pero protege los vigentes', async () => {
    const email = runId + '-repeated@example.test';
    const first = await fixture(['CANDIDATE'], email); assert.equal((await remove(first)).status, 204);
    const response = await request('POST', '/auth/register', undefined, { fullName: 'Persona Nueva', email: email.toUpperCase(), password });
    assert.equal(response.status, 201);
    const body = await response.json() as RegistrationResponse;
    const second = body.user; ids.push(second.id);
    assert.notEqual(second.id, first.id);
    assert.equal((await remove(second)).status, 204);
    assert.equal(await prisma.user.count({ where: { email: 'inactive.' + email, deletedAt: { not: null } } }), 2);
    const third = await fixture(['CANDIDATE'], email);
    const duplicate = await request('POST', '/auth/register', undefined, { fullName: 'Duplicado', email, password });
    assert.equal(duplicate.status, 409);
    await request('PATCH', '/admin/users/' + third.id + '/status', actor(), { status: 'DISABLED' });
    assert.equal((await restore(first)).status, 409);
    assert.equal((await restore(second)).status, 409);
  });

  it('solo Super Admin ve y restaura eliminados, sin recrear perfil ni contraseña', async () => {
    const account = await fixture(); const identity = await login(account); const before = await saved(account);
    assert.equal((await remove(account)).status, 204);
    assert.equal((await restore(account, actor('ADMINISTRATOR'))).status, 403);
    assert.equal((await request('PATCH', '/admin/users/' + account.id + '/status', actor('ADMINISTRATOR'), { status: 'ACTIVE' })).status, 409);
    assert.equal((await request('GET', '/admin/users?deleted=true', actor('ADMINISTRATOR'))).status, 403);
    const regular = await (await request('GET', '/admin/users?search=' + account.email, actor())).json() as UserListResponse;
    assert.equal(regular.total, 0);
    const deleted = await (await request('GET', '/admin/users?deleted=true&search=' + account.email, actor())).json() as UserListResponse;
    assert.equal(deleted.items[0].id, account.id); assert.ok(deleted.items[0].deletedAt);
    assert.equal((await restore(account)).status, 204);
    const after = await saved(account);
    assert.equal(after.email, account.email); assert.equal(after.deletedAt, null); assert.equal(after.status.name, 'Activo');
    assert.deepEqual(after.profile, before.profile); assert.equal(after.passwordHash, before.passwordHash);
    assert.equal((await request('GET', '/auth/me', identity)).status, 401);
    assert.equal((await request('GET', '/auth/me', await login(account))).status, 200);
  });

  it('un correo reutilizado bloquea restauración sin sobrescribir ninguna cuenta', async () => {
    const old = await fixture(); assert.equal((await remove(old)).status, 204);
    const current = await fixture(['CANDIDATE'], old.email);
    const before = await saved(old);
    assert.equal((await restore(old)).status, 409);
    assert.deepEqual(await saved(old), before);
    assert.equal((await saved(current)).email, old.email);
    assert.equal((await remove(current)).status, 204);
    assert.equal((await restore(old)).status, 204);
  });

  it('la restricción PostgreSQL arbitra restauraciones concurrentes del mismo correo', async () => {
    const email = runId + '-restore-race@example.test';
    const first = await fixture(['CANDIDATE'], email); await remove(first);
    const second = await fixture(['CANDIDATE'], email); await remove(second);
    const results = await Promise.all([restore(first), restore(second)]);
    assert.deepEqual(results.map((response) => response.status).sort(), [204, 409]);
    assert.equal(await prisma.user.count({ where: { email, deletedAt: null } }), 1);
  });

  it('el índice permite correos repetidos solo en eliminados, incluso con el prefijo como correo real', async () => {
    const prefixed = 'inactive.' + runId + '@example.test';
    const old = await fixture(['CANDIDATE'], prefixed); await remove(old);
    assert.equal((await saved(old)).email, 'inactive.' + prefixed);
    assert.equal((await restore(old)).status, 204);
    assert.equal((await saved(old)).email, prefixed);
    // Direct Prisma writes prove that uniqueness is enforced by PostgreSQL, not a preflight API check.
    await assert.rejects(fixture(['CANDIDATE'], prefixed), { code: 'P2002' });
  });

  it('restauración y registro concurrentes nunca dejan dos cuentas vigentes con el mismo correo', async () => {
    const account = await fixture(); await remove(account);
    const results = await Promise.all([restore(account), request('POST', '/auth/register', undefined, {
      fullName: 'Persona concurrente', email: account.email, password,
    })]);
    const created = results[1];
    if (created.status === 201) ids.push((await created.json() as RegistrationResponse).user.id);
    assert.equal(results.filter((response) => response.ok).length, 1);
    assert.equal(results.find((response) => !response.ok)?.status, 409);
    assert.equal(await prisma.user.count({ where: { email: account.email, deletedAt: null } }), 1);
  });

  it('añade el prefijo incluso a correos originales de 255 caracteres', async () => {
    const email = 'a'.repeat(64) + '@' + 'b'.repeat(63) + '.' + 'c'.repeat(63) + '.' + 'd'.repeat(59) + '.co';
    assert.equal(email.length, 255);
    const account = await fixture(['CANDIDATE'], email);
    assert.equal((await remove(account)).status, 204);
    assert.equal((await saved(account)).email.length, 264);
    assert.equal((await restore(account)).status, 204);
    assert.equal((await saved(account)).email, email);
  });

  it('Administrador no puede afectar administradores, Super Admin ni roles privilegiados mixtos', async () => {
    for (const account of [actor(), actor('ADMINISTRATOR'), await fixture(['ADMINISTRATOR']), await fixture(['CANDIDATE', 'ADMINISTRATOR']), await fixture(['CANDIDATE', 'SUPER_ADMIN'])]) {
      for (const status of ['ACTIVE', 'DISABLED']) {
        assert.equal((await request('PATCH', '/admin/users/' + account.id + '/status', actor('ADMINISTRATOR'), { status })).status, 403);
      }
      assert.equal((await remove(account)).status, 403);
    }
    assert.equal((await remove(actor(), actor())).status, 403);
    assert.equal((await request('DELETE', '/auth/me', actor(), acknowledgement)).status, 403);
    const admin = await fixture(['ADMINISTRATOR']);
    assert.equal((await request('PATCH', '/admin/users/' + admin.id + '/status', actor(), { status: 'DISABLED' })).status, 204);
    assert.equal((await remove(admin, actor())).status, 204);
    assert.equal((await restore(admin)).status, 204);
  });

  it('el perfil elimina exclusivamente su cuenta y borra la cookie tras confirmar', async () => {
    const account = await fixture(); const identity = await login(account);
    const response = await request('DELETE', '/auth/me', identity, acknowledgement);
    assert.equal(response.status, 204);
    assert.match(response.headers.get('set-cookie') ?? '', /fqa_refresh=;/);
    assert.ok((await saved(account)).deletedAt);
    assert.equal((await request('GET', '/auth/me', identity)).status, 401);
    const audit = await prisma.auditLogs.findFirstOrThrow({ where: { entityId: account.id, action: 'DELETE' } });
    assert.equal(audit.userId, account.id);
  });

  it('revalida permisos vigentes para borrado, estado y restauración', async () => {
    const target = await fixture();
    for (const [code, permission, operation] of [
      ['ADMINISTRATOR', PERMISSIONS.CANDIDATE_DELETE, 'delete'],
      ['ADMINISTRATOR', PERMISSIONS.CANDIDATE_STATUS_UPDATE, 'status'],
      ['SUPER_ADMIN', PERMISSIONS.USERS_RESTORE, 'restore'],
    ] as const) {
      const role = await prisma.role.findUniqueOrThrow({ where: { name: ROLE_NAMES[code] } });
      const grant = await prisma.permissions.findUniqueOrThrow({ where: { name: permission } });
      await prisma.rolePermissions.delete({ where: { roleId_permissionId: { roleId: role.id, permissionId: grant.id } } });
      try {
        const response = operation === 'delete' ? await remove(target, actor(code))
          : operation === 'restore' ? await restore(target, actor(code))
            : await request('PATCH', '/admin/users/' + target.id + '/status', actor(code), { status: 'DISABLED' });
        assert.equal(response.status, 403);
      } finally { await seedAccountCatalogs(prisma); }
    }
  });
});
