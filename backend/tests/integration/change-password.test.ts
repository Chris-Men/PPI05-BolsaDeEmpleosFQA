import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import bcrypt from 'bcrypt';
import { prisma } from '../../src/config/prisma.js';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { ROLE_NAMES, type RoleCode } from '../../src/constants/authorization.constants.js';
import { startTestServer, stopTestServer, type TestServer } from '../helpers/http.js';

const originalPassword = 'Clave original 2026';
const changedPassword = 'Clave nueva segura 2026';
const accounts: { id: number; email: string }[] = [];
let api: TestServer;

/** Uses the browser's mutation headers with an optional authenticated access token. */
const post = (path: string, body: unknown, token?: string, cookie?: string): Promise<Response> =>
  fetch(api.baseUrl + '/api/auth' + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', 'X-FQA-Request': '1', Origin: env.CORS_ORIGIN,
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });

/** Creates an active account for each supported role without a hardcoded identity. */
const createAccount = async (role: RoleCode): Promise<{ id: number; email: string }> => {
  const account = await prisma.user.create({
    data: {
      email: randomUUID() + '@example.test',
      passwordHash: await bcrypt.hash(originalPassword, 12),
      status: { connect: { name: 'Activo' } },
      userRoles: { create: { roles: { connect: { name: ROLE_NAMES[role] } } } },
    },
    select: { id: true, email: true },
  });
  accounts.push(account);
  return account;
};

describe('Cambio autenticado de contraseña', () => {
  before(async () => {
    assert.equal(process.env.NODE_ENV, 'test');
    assert.equal(process.env.DATABASE_URL, process.env.TEST_DATABASE_URL);
    api = await startTestServer(createApp());
  });

  after(async () => {
    if (api) await stopTestServer(api.server);
    await prisma.emailOutbox.deleteMany({ where: { recipientEmail: { in: accounts.map((account) => account.email) } } });
    await prisma.user.deleteMany({ where: { id: { in: accounts.map((account) => account.id) } } });
    await prisma.$disconnect();
  });

  for (const role of ['CANDIDATE', 'ADMINISTRATOR', 'SUPER_ADMIN'] as RoleCode[]) {
    it(`actualiza ${role}, conserva la sesión actual y revoca las demás`, async () => {
      const account = await createAccount(role);
      const logins = await Promise.all([
        post('/login', { email: account.email, password: originalPassword }),
        post('/login', { email: account.email, password: originalPassword }),
      ]);
      for (const response of logins) assert.equal(response.status, 200);
      const access = await Promise.all(logins.map((response) => response.json() as Promise<{ accessToken: string }>));
      const cookies = logins.map((response) => response.headers.get('set-cookie')?.split(';')[0]);
      assert.ok(cookies[0]); assert.ok(cookies[1]);

      const resetToken = randomUUID();
      await prisma.passwordResetToken.create({ data: {
        userId: account.id,
        tokenHash: createHash('sha256').update(resetToken).digest('hex'),
        expiresAt: new Date(Date.now() + 30 * 60_000),
      } });
      const wrong = await post('/change-password', {
        currentPassword: 'Contraseña equivocada', newPassword: changedPassword,
      }, access[0].accessToken);
      assert.equal(wrong.status, 400);
      assert.equal(await prisma.authSession.count({ where: { userId: account.id, revokedAt: null } }), 2);

      const changed = await post('/change-password', {
        currentPassword: originalPassword, newPassword: changedPassword,
      }, access[0].accessToken);
      assert.equal(changed.status, 200);
      assert.equal(changed.headers.get('set-cookie'), null);
      const stored = await prisma.user.findUniqueOrThrow({ where: { id: account.id }, select: { passwordHash: true } });
      assert.equal(await bcrypt.compare(changedPassword, stored.passwordHash), true);
      assert.equal(await bcrypt.compare(originalPassword, stored.passwordHash), false);
      assert.equal(await prisma.authSession.count({ where: { userId: account.id, revokedAt: null } }), 1);
      assert.equal(await prisma.authSession.count({ where: { userId: account.id, revokedAt: { not: null } } }), 1);
      assert.equal(await prisma.passwordResetToken.count({ where: { userId: account.id, usedAt: null } }), 0);
      assert.equal(await prisma.emailOutbox.count({ where: { recipientEmail: account.email, kind: 'PASSWORD_CHANGED' } }), 1);

      const currentAccess = await fetch(api.baseUrl + '/api/auth/me', {
        headers: { Authorization: 'Bearer ' + access[0].accessToken },
      });
      assert.equal(currentAccess.status, 200);
      const otherAccess = await fetch(api.baseUrl + '/api/auth/me', {
        headers: { Authorization: 'Bearer ' + access[1].accessToken },
      });
      assert.equal(otherAccess.status, 401);
      assert.equal((await post('/refresh', {}, undefined, cookies[0])).status, 200);
      assert.equal((await post('/refresh', {}, undefined, cookies[1])).status, 401);
      assert.equal((await post('/login', { email: account.email, password: originalPassword })).status, 401);
      assert.equal((await post('/login', { email: account.email, password: changedPassword })).status, 200);
    });
  }
});
