import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import bcrypt from 'bcrypt';
import { prisma } from '../../src/config/prisma.js';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { ROLE_NAMES, type RoleCode } from '../../src/constants/authorization.constants.js';
import { decryptEmailPayload } from '../../src/services/email.service.js';
import { processEmailOutboxBatch, type MailSender } from '../../src/services/email-worker.service.js';
import { startTestServer, stopTestServer, type TestServer } from '../helpers/http.js';

interface Account { id: number; email: string; role: RoleCode }
interface CapturedMessage { from: string; to: string; subject: string; text: string }
const originalPassword = 'Clave original 2026';
const accounts: Account[] = [];
let api: TestServer;

/** Captures outbound mail and can simulate a transient SMTP failure. */
class FakeSender implements MailSender {
  readonly messages: CapturedMessage[] = [];
  failRecipient?: string;

  async sendMail(message: CapturedMessage): Promise<void> {
    if (message.to === this.failRecipient) throw new Error('SMTP temporalmente caído');
    this.messages.push(message);
  }
}

/** Sends a protected mutation using the same headers required by browser clients. */
const post = (path: string, body: unknown, cookie?: string): Promise<Response> =>
  fetch(api.baseUrl + '/api/auth' + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', 'X-FQA-Request': '1', Origin: env.CORS_ORIGIN,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });

/** Creates a role-bearing account isolated by a random address. */
const createAccount = async (role: RoleCode, disabled = false, deleted = false): Promise<Account> => {
  const user = await prisma.user.create({
    data: {
      email: randomUUID() + '@example.test',
      passwordHash: await bcrypt.hash(originalPassword, 12),
      status: { connect: { name: disabled ? 'Deshabilitado' : 'Activo' } },
      ...(deleted ? { deletedAt: new Date() } : {}),
      userRoles: { create: { roles: { connect: { name: ROLE_NAMES[role] } } } },
    },
    select: { id: true, email: true },
  });
  const account = { ...user, role };
  accounts.push(account);
  return account;
};

/** Extracts the opaque credential only from the fake sender's in-memory message. */
const tokenFrom = (message: CapturedMessage): string => {
  const urlText = message.text.match(/https?:\/\/[^\s]+/)?.[0];
  assert.ok(urlText);
  const token = new URL(urlText).searchParams.get('token');
  assert.ok(token);
  return token;
};

describe('Recuperación de contraseña y cola de correo', () => {
  before(async () => {
    assert.equal(process.env.NODE_ENV, 'test');
    assert.equal(process.env.DATABASE_URL, process.env.TEST_DATABASE_URL);
    assert.ok(env.MAIL_OUTBOX_KEY);
    api = await startTestServer(createApp());
  });

  after(async () => {
    if (api) await stopTestServer(api.server);
    await prisma.emailOutbox.deleteMany({ where: { recipientEmail: { in: accounts.map((user) => user.email) } } });
    await prisma.user.deleteMany({ where: { id: { in: accounts.map((user) => user.id) } } });
    await prisma.$disconnect();
  });

  it('valida cuerpos y contraseñas sin crear mensajes', async () => {
    const invalidRequests = [
      post('/forgot-password', { email: 'incorrecto' }),
      post('/forgot-password', { email: 'ana@example.test', role: 'SUPER_ADMIN' }),
      post('/reset-password', { token: '', password: 'Clave larga de prueba 2026' }),
      post('/reset-password', { token: 'a'.repeat(64), password: 'corta' }),
    ];
    const responses = await Promise.all(invalidRequests);
    for (const response of responses) assert.equal(response.status, 400);
  });

  it('no revela cuentas inexistentes, deshabilitadas ni eliminadas', async () => {
    const disabled = await createAccount('CANDIDATE', true);
    const deleted = await createAccount('CANDIDATE', false, true);
    const responses = await Promise.all([
      post('/forgot-password', { email: randomUUID() + '@example.test' }),
      post('/forgot-password', { email: disabled.email }),
      post('/forgot-password', { email: deleted.email }),
    ]);
    for (const response of responses) assert.equal(response.status, 202);
    const bodies = await Promise.all(responses.map((response) => response.json()));
    assert.deepEqual(bodies[0], bodies[1]);
    assert.deepEqual(bodies[1], bodies[2]);
    assert.equal(await prisma.emailOutbox.count({
      where: { recipientEmail: { in: [disabled.email, deleted.email] } },
    }), 0);
  });

  it('limita dos solicitudes simultáneas y permite otra después de cinco minutos', async () => {
    const account = await createAccount('CANDIDATE');
    const responses = await Promise.all([
      post('/forgot-password', { email: account.email }),
      post('/forgot-password', { email: account.email }),
    ]);
    assert.deepEqual(responses.map((response) => response.status), [202, 202]);
    assert.equal(await prisma.passwordResetToken.count({ where: { userId: account.id } }), 1);
    assert.equal(await prisma.emailOutbox.count({
      where: { recipientEmail: account.email, kind: 'PASSWORD_RESET' },
    }), 1);
    await prisma.passwordResetToken.updateMany({
      where: { userId: account.id },
      data: { createdAt: new Date(Date.now() - 5 * 60_000 - 1000) },
    });
    assert.equal((await post('/forgot-password', { email: account.email })).status, 202);
    const records = await prisma.passwordResetToken.findMany({
      where: { userId: account.id }, orderBy: { createdAt: 'asc' },
    });
    assert.equal(records.length, 2);
    assert.ok(records[0]?.usedAt);
    assert.equal(records[1]?.usedAt, null);
    assert.equal(await prisma.emailOutbox.count({
      where: { recipientEmail: account.email, kind: 'PASSWORD_RESET' },
    }), 2);
  });

  it('restablece los tres roles, limita solicitudes y revoca sesiones anteriores', async () => {
    for (const role of ['CANDIDATE', 'ADMINISTRATOR', 'SUPER_ADMIN'] as RoleCode[]) {
      const account = await createAccount(role);
      const login = await post('/login', { email: account.email, password: originalPassword });
      assert.equal(login.status, 200);
      const access = await login.json() as { accessToken: string };
      const cookie = login.headers.get('set-cookie')?.split(';')[0];
      assert.ok(cookie);
      const secondLogin = await post('/login', { email: account.email, password: originalPassword });
      assert.equal(secondLogin.status, 200);
      const secondAccess = await secondLogin.json() as { accessToken: string };
      const secondCookie = secondLogin.headers.get('set-cookie')?.split(';')[0];
      assert.ok(secondCookie);
      const oldHash = (await prisma.user.findUniqueOrThrow({
        where: { id: account.id }, select: { passwordHash: true },
      })).passwordHash;

      const requested = await post('/forgot-password', { email: account.email.toUpperCase() });
      assert.equal(requested.status, 202);
      const sender = new FakeSender();
      await processEmailOutboxBatch(sender);
      const mail = sender.messages.find((item) => item.to === account.email && item.subject.includes('Recupera'));
      assert.ok(mail);
      const token = tokenFrom(mail);
      const stored = await prisma.passwordResetToken.findFirst({ where: { userId: account.id }, orderBy: { createdAt: 'desc' } });
      assert.ok(stored);
      assert.equal(stored.tokenHash, createHash('sha256').update(token).digest('hex'));
      assert.ok(!JSON.stringify(stored).includes(token));
      const queued = await prisma.emailOutbox.findFirst({
        where: { recipientEmail: account.email, kind: 'PASSWORD_RESET' },
      });
      assert.ok(queued);
      assert.ok(!JSON.stringify(queued).includes(token));

      const newPassword = 'Nueva clave para ' + role + ' 2026';
      const reset = await post('/reset-password', { token, password: newPassword });
      assert.equal(reset.status, 200);
      const result = await reset.json() as { message: string };
      assert.ok(result.message.includes('actualizada'));
      assert.equal(reset.headers.get('set-cookie'), null);
      const passwordHash = (await prisma.user.findUniqueOrThrow({
        where: { id: account.id }, select: { passwordHash: true },
      })).passwordHash;
      assert.notEqual(passwordHash, oldHash);
      assert.equal(await bcrypt.compare(newPassword, passwordHash), true);
      assert.equal(await bcrypt.compare(originalPassword, passwordHash), false);
      assert.equal(await prisma.authSession.count({ where: { userId: account.id, revokedAt: null } }), 0);
      assert.equal(await prisma.authSession.count({ where: { userId: account.id, revokedAt: { not: null } } }), 2);
      assert.equal((await post('/reset-password', { token, password: newPassword })).status, 400);
      for (const oldToken of [access.accessToken, secondAccess.accessToken]) {
        const oldAccess = await fetch(api.baseUrl + '/api/auth/me', {
          headers: { Authorization: 'Bearer ' + oldToken },
        });
        assert.equal(oldAccess.status, 401);
      }
      for (const oldCookie of [cookie, secondCookie]) {
        assert.equal((await post('/refresh', {}, oldCookie)).status, 401);
      }
      assert.equal((await post('/login', { email: account.email, password: originalPassword })).status, 401);
      assert.equal((await post('/login', { email: account.email, password: newPassword })).status, 200);

      assert.equal((await post('/forgot-password', { email: account.email })).status, 202);
      assert.equal(await prisma.emailOutbox.count({
        where: { recipientEmail: account.email, kind: 'PASSWORD_RESET' },
      }), 1);
    }
  });

  it('solo permite un restablecimiento ante dos solicitudes simultáneas', async () => {
    const account = await createAccount('CANDIDATE');
    assert.equal((await post('/forgot-password', { email: account.email })).status, 202);
    const queued = await prisma.emailOutbox.findFirst({
      where: { recipientEmail: account.email, kind: 'PASSWORD_RESET' },
    });
    assert.ok(queued);
    const payload = decryptEmailPayload(queued);
    assert.equal(payload.kind, 'PASSWORD_RESET');
    if (payload.kind !== 'PASSWORD_RESET') return;
    const results = await Promise.all([
      post('/reset-password', { token: payload.token, password: 'Primera clave segura 2026' }),
      post('/reset-password', { token: payload.token, password: 'Segunda clave segura 2026' }),
    ]);
    assert.deepEqual(results.map((response) => response.status).sort(), [200, 400]);
    assert.equal(await prisma.emailOutbox.count({
      where: { recipientEmail: account.email, kind: 'PASSWORD_CHANGED' },
    }), 1);
  });
  it('descarta enlaces vencidos antes de SMTP y los rechaza en la API', async () => {
    const account = await createAccount('CANDIDATE');
    assert.equal((await post('/forgot-password', { email: account.email })).status, 202);
    const queued = await prisma.emailOutbox.findFirst({
      where: { recipientEmail: account.email, kind: 'PASSWORD_RESET' },
    });
    assert.ok(queued);
    const payload = decryptEmailPayload(queued);
    assert.equal(payload.kind, 'PASSWORD_RESET');
    if (payload.kind !== 'PASSWORD_RESET') return;
    await prisma.passwordResetToken.updateMany({
      where: { userId: account.id }, data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const sender = new FakeSender();
    await processEmailOutboxBatch(sender);
    assert.equal(sender.messages.some((message) => message.to === account.email), false);
    assert.equal((await post('/reset-password', {
      token: payload.token, password: 'Nueva clave segura 2026',
    })).status, 400);
  });

  it('reintenta tras un fallo SMTP y procesa el mismo mensaje después de reiniciar el trabajador', async () => {
    const account = await createAccount('CANDIDATE');
    assert.equal((await post('/forgot-password', { email: account.email })).status, 202);
    const failedSender = new FakeSender();
    failedSender.failRecipient = account.email;
    const logs: string[] = [];
    const previousError = console.error;
    console.error = (...values: unknown[]): void => { logs.push(values.map(String).join(' ')); };
    try {
      await processEmailOutboxBatch(failedSender);
    } finally {
      console.error = previousError;
    }
    const queued = await prisma.emailOutbox.findFirst({
      where: { recipientEmail: account.email, kind: 'PASSWORD_RESET' },
    });
    assert.ok(queued);
    const pending = decryptEmailPayload(queued);
    assert.equal(pending.kind, 'PASSWORD_RESET');
    if (pending.kind === 'PASSWORD_RESET') {
      assert.ok(!JSON.stringify(queued).includes(pending.token));
      assert.ok(!logs.join(' ').includes(pending.token));
    }
    assert.ok(logs.some((line) => line.includes('No se pudo entregar')));
    assert.equal(queued.attempts, 1);
    assert.equal(queued.sentAt, null);
    assert.ok(queued.nextAttemptAt > new Date());
    await prisma.emailOutbox.update({
      where: { id: queued.id }, data: { nextAttemptAt: new Date(Date.now() - 1000) },
    });
    const restartedSender = new FakeSender();
    await processEmailOutboxBatch(restartedSender);
    assert.equal(restartedSender.messages.filter((message) => message.to === account.email).length, 1);
    const delivered = await prisma.emailOutbox.findUnique({ where: { id: queued.id } });
    assert.ok(delivered?.sentAt);
    assert.equal(delivered.attempts, 2);
  });
});
