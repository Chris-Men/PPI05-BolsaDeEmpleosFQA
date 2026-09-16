import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, after, describe, it } from 'node:test';
import bcrypt from 'bcrypt';
import { prisma } from '../../src/config/prisma.js';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { ROLE_NAMES, PERMISSIONS, type RoleCode } from '../../src/constants/authorization.constants.js';
import { tokenService } from '../../src/services/token.service.js';
import type { RegistrationResponse } from '../../src/types/auth.types.js';
import { startTestServer, stopTestServer, type TestServer } from '../helpers/http.js';

interface Account { id: number; email: string }
interface LoginResult { body: RegistrationResponse; cookie: string }
const accounts = new Map<RoleCode, Account>();
const createdIds: number[] = [];
const password = '  Clave de sesión 2026  ';
let api: TestServer;

/** Calls the real HTTP surface with explicit cookie-mutation protection. */
const post = (path: string, body?: unknown, cookie?: string, token?: string): Promise<Response> =>
  fetch(api.baseUrl + '/api/auth' + path, {
    method: 'POST', headers: {
      'Content-Type': 'application/json', 'X-FQA-Request': '1', Origin: env.CORS_ORIGIN,
      ...(cookie ? { Cookie: cookie } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}),
    }, body: body === undefined ? undefined : JSON.stringify(body),
  });

/** Returns a fixture without exposing account credentials in test output. */
const accountFor = (role: RoleCode): Account => {
  const account = accounts.get(role); assert.ok(account); return account;
};

/** Extracts only the test browser's opaque cookie. */
const cookieFor = (response: Response): string => {
  const cookie = response.headers.get('set-cookie'); assert.ok(cookie); return cookie.split(';')[0];
};

/** Authenticates a prepared account through the public endpoint. */
const login = async (role: RoleCode = 'CANDIDATE'): Promise<LoginResult> => {
  const response = await post('/login', { email: accountFor(role).email, password });
  assert.equal(response.status, 200);
  return { body: await response.json() as RegistrationResponse, cookie: cookieFor(response) };
};

/** Exercises middleware-protected identity lookup. */
const me = (token: string): Promise<Response> =>
  fetch(api.baseUrl + '/api/auth/me', { headers: { Authorization: 'Bearer ' + token } });

describe('Inicio de sesión y revocación contra PostgreSQL', () => {
  before(async () => {
    assert.equal(process.env.NODE_ENV, 'test');
    assert.ok(process.env.TEST_DATABASE_URL?.includes('_test'));
    assert.equal(process.env.DATABASE_URL, process.env.TEST_DATABASE_URL);
    const hash = await bcrypt.hash(password, 12);
    for (const role of Object.keys(ROLE_NAMES) as RoleCode[]) {
      const user = await prisma.user.create({
        data: { email: randomUUID() + '@example.test', passwordHash: hash,
          status: { connect: { name: 'Activo' } },
          userRoles: { create: { roles: { connect: { name: ROLE_NAMES[role] } } } } },
        select: { id: true, email: true },
      });
      accounts.set(role, user); createdIds.push(user.id);
    }
    api = await startTestServer(createApp());
  });
  after(async () => {
    if (api) await stopTestServer(api.server);
    await prisma.user.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.$disconnect();
  });

  it('autentica los tres roles, devuelve permisos actuales y no revela credenciales', async () => {
    for (const role of Object.keys(ROLE_NAMES) as RoleCode[]) {
      const response = await post('/login', {
        email: ' ' + accountFor(role).email.toUpperCase() + ' ', password,
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const cookie = response.headers.get('set-cookie')!;
      assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/);
      assert.match(cookie, /Path=\/api\/auth/); assert.match(cookie, /Expires=/);
      const body = await response.json() as RegistrationResponse;
      assert.deepEqual(body.roles, [role]);
      assert.ok(body.expiresIn > 3595 && body.expiresIn <= 3600);
      assert.ok(Date.parse(body.sessionExpiresAt) > Date.now() + 29 * 86400000);
      assert.ok(!JSON.stringify(body).includes('password'));
      assert.ok(!JSON.stringify(body).includes('refreshToken'));
      const profile = await me(body.accessToken); assert.equal(profile.status, 200);
      const current = await profile.json() as RegistrationResponse;
      assert.equal(current.user.email, accountFor(role).email);
      assert.deepEqual(current.roles, [role]);
    }
  });

  it('oculta si la cuenta existe y conserva los espacios de contraseña', async () => {
    const unknown = await post('/login', { email: randomUUID() + '@example.test', password });
    const incorrect = await post('/login', { email: accountFor('CANDIDATE').email, password: password.trim() });
    assert.equal(unknown.status, 401); assert.equal(incorrect.status, 401);
    assert.deepEqual(await unknown.json(), await incorrect.json());
  });

  it('informa una cuenta deshabilitada solo con contraseña válida y sin emitir credenciales', async () => {
    const user = await prisma.user.create({ data: {
      email: randomUUID() + '@example.test', passwordHash: await bcrypt.hash(password, 12),
      status: { connect: { name: 'Deshabilitado' } },
      userRoles: { create: { roles: { connect: { name: ROLE_NAMES.CANDIDATE } } } },
    } });
    createdIds.push(user.id);
    const disabled = await post('/login', { email: user.email, password });
    assert.equal(disabled.status, 401);
    assert.deepEqual(await disabled.json(), {
      message: 'Tu cuenta está deshabilitada. Contacta al administrador para solicitar su rehabilitación.',
    });
    assert.equal(disabled.headers.get('set-cookie'), null);
    assert.equal(await prisma.authSession.count({ where: { userId: user.id } }), 0);
    const incorrect = await post('/login', { email: user.email, password: 'Contraseña incorrecta' });
    assert.equal(incorrect.status, 401);
    assert.deepEqual(await incorrect.json(), { message: 'Correo o contraseña incorrectos.' });
    await prisma.user.update({ where: { id: user.id }, data: { deletedAt: new Date() } });
    const deleted = await post('/login', { email: user.email, password });
    assert.equal(deleted.status, 401);
    assert.deepEqual(await deleted.json(), { message: 'Correo o contraseña incorrectos.' });
  });

  it('rechaza cuentas sin rol e inactivas con el mismo error de credenciales', async () => {
    const user = await prisma.user.create({ data: {
      email: randomUUID() + '@example.test', passwordHash: await bcrypt.hash(password, 12),
      status: { connect: { name: 'Activo' } },
    } });
    createdIds.push(user.id);
    const noRole = await post('/login', { email: user.email, password });
    assert.equal(noRole.status, 401);
    assert.equal(await prisma.authSession.count({ where: { userId: user.id } }), 0);
    const status = await prisma.userStatus.create({ data: { name: 'Inactivo-' + randomUUID() } });
    try {
      await prisma.user.update({ where: { id: user.id }, data: { statusId: status.id } });
      const inactive = await post('/login', { email: user.email, password });
      assert.equal(inactive.status, 401); assert.deepEqual(await inactive.json(), await noRole.json());
    } finally {
      const active = await prisma.userStatus.findUniqueOrThrow({ where: { name: 'Activo' } });
      await prisma.user.update({ where: { id: user.id }, data: { statusId: active.id } });
      await prisma.userStatus.delete({ where: { id: status.id } });
    }
  });

  it('rota, conserva el vencimiento absoluto y almacena solo hashes', async () => {
    const initial = await login();
    const response = await post('/refresh', undefined, initial.cookie);
    assert.equal(response.status, 200);
    const body = await response.json() as RegistrationResponse;
    const nextCookie = cookieFor(response);
    assert.notEqual(nextCookie, initial.cookie);
    assert.equal(body.sessionExpiresAt, initial.body.sessionExpiresAt);
    const claims = tokenService.verifyAccessToken(body.accessToken);
    const credentials = await prisma.refreshCredential.findMany({ where: { sessionId: claims.sessionId } });
    assert.equal(credentials.length, 2);
    assert.equal(credentials.filter((item) => item.consumedAt).length, 1);
    assert.ok(credentials.every((item) => /^[a-f0-9]{64}$/.test(item.tokenHash)));
    assert.ok(!JSON.stringify(credentials).includes(initial.cookie.split('=')[1]));
  });

  it('reutilizar un refresh consumido revoca también los JWT ya emitidos', async () => {
    const initial = await login();
    const renewed = await post('/refresh', undefined, initial.cookie);
    const body = await renewed.json() as RegistrationResponse;
    const cookie = cookieFor(renewed);
    assert.equal((await post('/refresh', undefined, initial.cookie)).status, 401);
    assert.equal((await me(initial.body.accessToken)).status, 401);
    assert.equal((await me(body.accessToken)).status, 401);
    assert.equal((await post('/refresh', undefined, cookie)).status, 401);
  });

  it('dos renovaciones simultáneas no pueden consumir el mismo token dos veces', async () => {
    const initial = await login();
    const responses = await Promise.all([
      post('/refresh', undefined, initial.cookie), post('/refresh', undefined, initial.cookie),
    ]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 401]);
    await Promise.all(responses.map((response) => response.arrayBuffer()));
    assert.equal((await me(initial.body.accessToken)).status, 401);
  });

  it('cierra una sesión de forma idempotente sin revocar otras del usuario', async () => {
    const first = await login(); const second = await login();
    const response = await post('/logout', undefined, first.cookie);
    assert.equal(response.status, 204); assert.match(response.headers.get('set-cookie')!, /1970/);
    assert.equal((await post('/logout', undefined, first.cookie)).status, 204);
    assert.equal((await me(first.body.accessToken)).status, 401);
    assert.equal((await me(second.body.accessToken)).status, 200);
  });

  it('cierra todas las sesiones propias y permite un nuevo login', async () => {
    const first = await login(); const second = await login();
    assert.equal((await post('/logout-all', undefined, first.cookie, first.body.accessToken)).status, 204);
    assert.equal((await me(first.body.accessToken)).status, 401);
    assert.equal((await me(second.body.accessToken)).status, 401);
    assert.equal((await post('/refresh', undefined, second.cookie)).status, 401);
    assert.equal((await me((await login()).body.accessToken)).status, 200);
  });

  it('solo Super Admin con permiso vigente puede revocar una cuenta real', async () => {
    const target = await login();
    for (const role of ['CANDIDATE', 'ADMINISTRATOR'] as const) {
      const actor = await login(role);
      assert.equal((await post('/users/' + target.body.userId + '/revoke-sessions',
        undefined, actor.cookie, actor.body.accessToken)).status, 403);
    }
    const admin = await login('SUPER_ADMIN');
    assert.equal((await post('/users/2147483647/revoke-sessions', undefined, admin.cookie, admin.body.accessToken)).status, 404);
    assert.equal((await post('/users/invalid/revoke-sessions', undefined, admin.cookie, admin.body.accessToken)).status, 400);
    assert.equal((await post('/users/' + target.body.userId + '/revoke-sessions',
      undefined, admin.cookie, admin.body.accessToken)).status, 204);
    assert.equal((await me(target.body.accessToken)).status, 401);
    const role = await prisma.role.findUniqueOrThrow({ where: { name: ROLE_NAMES.SUPER_ADMIN } });
    const permission = await prisma.permissions.findUniqueOrThrow({ where: { name: PERMISSIONS.SESSION_REVOKE_ANY } });
    await prisma.rolePermissions.delete({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } } });
    try {
      assert.equal((await post('/users/' + target.body.userId + '/revoke-sessions',
        undefined, admin.cookie, admin.body.accessToken)).status, 403);
    } finally {
      await prisma.rolePermissions.create({ data: { roleId: role.id, permissionId: permission.id } });
    }
  });

  it('rechaza sesiones vencidas y tokens que apuntan a una sesión ajena', async () => {
    const initial = await login();
    const claims = tokenService.verifyAccessToken(initial.body.accessToken);
    const foreign = tokenService.createAccessToken(String(accountFor('ADMINISTRATOR').id), 'ADMINISTRATOR', claims.sessionId);
    assert.equal((await me(foreign)).status, 401);
    await prisma.authSession.update({ where: { id: claims.sessionId }, data: { expiresAt: new Date(Date.now() - 1) } });
    assert.equal((await me(initial.body.accessToken)).status, 401);
    assert.equal((await post('/refresh', undefined, initial.cookie)).status, 401);
  });

  it('limita un JWT renovado a la duración restante de la sesión', async () => {
    const initial = await login();
    const claims = tokenService.verifyAccessToken(initial.body.accessToken);
    await prisma.authSession.update({ where: { id: claims.sessionId }, data: { expiresAt: new Date(Date.now() + 15000) } });
    const response = await post('/refresh', undefined, initial.cookie);
    assert.equal(response.status, 200);
    const body = await response.json() as RegistrationResponse;
    assert.ok(body.expiresIn > 0 && body.expiresIn <= 15);
  });

  it('rechaza mutaciones sin cabecera o con origen externo y permite CORS con credenciales', async () => {
    for (const headers of [new Headers(), new Headers({ 'X-FQA-Request': '1', Origin: 'https://external.example' })]) {
      const response = await fetch(api.baseUrl + '/api/auth/refresh', { method: 'POST', headers });
      assert.equal(response.status, 403);
    }
    const response = await post('/refresh');
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('access-control-allow-origin'), env.CORS_ORIGIN);
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
  });
});
