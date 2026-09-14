import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { prisma } from '../../src/config/prisma.js';
import { seedAccountCatalogs } from '../../src/services/catalog.service.js';
import { tokenService } from '../../src/services/token.service.js';
import type { RegistrationResponse } from '../../src/types/auth.types.js';
import { startTestServer, stopTestServer, type TestServer } from '../helpers/http.js';

const runId = randomUUID();
const emails = new Set<string>();
const password = '  Clave de prueba 2026  ';

/** Records only this test run's addresses for narrowly scoped cleanup. */
const emailFor = (label: string): string => {
  const email = `${runId}-${label}@example.test`;
  emails.add(email);
  return email;
};

describe('Registro contra PostgreSQL', () => {
  let api: TestServer;
  let connected = false;

  before(async () => {
    assert.equal(process.env.NODE_ENV, 'test');
    assert.ok(process.env.TEST_DATABASE_URL);
    assert.ok(
      process.env.DATABASE_URL === process.env.TEST_DATABASE_URL,
      'Las pruebas deben usar exclusivamente TEST_DATABASE_URL.',
    );
    await prisma.$connect();
    connected = true;
    api = await startTestServer(createApp());
  });

  after(async () => {
    try {
      if (api) await stopTestServer(api.server);
      // No resets or global deletes: cascading profiles belong to this run only.
      if (connected) {
        await prisma.user.deleteMany({ where: { email: { in: [...emails] } } });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  /** Exercises the public HTTP contract using an actual ephemeral listener. */
  const register = (body: unknown): Promise<Response> =>
    fetch(`${api.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('la carga repetida de catálogos conserva los mismos identificadores', async () => {
    const beforeRoles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
    const beforeStatuses = await prisma.userStatus.findMany({ orderBy: { name: 'asc' } });
    await seedAccountCatalogs(prisma);
    await seedAccountCatalogs(prisma);
    assert.deepEqual(await prisma.role.findMany({ orderBy: { name: 'asc' } }), beforeRoles);
    assert.deepEqual(await prisma.userStatus.findMany({ orderBy: { name: 'asc' } }), beforeStatuses);
    assert.deepEqual(beforeRoles.map((role) => role.name), [
      'Administrador', 'Candidato', 'Super Admin',
    ]);
    assert.deepEqual(beforeStatuses.map((status) => status.name), ['Activo']);
  });

  it('crea cuenta y perfil normalizados, hash bcrypt y JWT válido', async () => {
    const email = emailFor('success');
    const response = await register({
      fullName: '  Ana Rivera  ',
      email: `  ${email.toUpperCase()}  `,
      password,
    });
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json() as RegistrationResponse;
    assert.deepEqual(Object.keys(body).sort(), ['accessToken', 'expiresIn', 'tokenType', 'user']);
    assert.deepEqual(Object.keys(body.user).sort(), [
      'createdAt', 'email', 'fullName', 'id', 'role', 'status',
    ]);
    assert.equal(body.user.fullName, 'Ana Rivera');
    assert.equal(body.user.email, email);
    assert.equal(body.user.role, 'CANDIDATE');
    assert.equal(body.user.status, 'ACTIVE');
    assert.equal(body.tokenType, 'Bearer');
    assert.equal(body.expiresIn, 3600);

    const account = await prisma.user.findUniqueOrThrow({
      where: { id: body.user.id },
      include: { profile: true, status: true, userRoles: { include: { roles: true } } },
    });
    assert.equal(`${account.profile?.firstName} ${account.profile?.lastName}`, 'Ana Rivera');
    assert.equal(account.userRoles[0]?.roles.name, 'Candidato');
    assert.equal(account.status.name, 'Activo');
    assert.equal(account.createdAt?.toISOString(), body.user.createdAt);
    assert.notEqual(account.passwordHash, password);
    assert.equal(bcrypt.getRounds(account.passwordHash), 12);
    assert.equal(await bcrypt.compare(password, account.passwordHash), true);
    assert.equal(await bcrypt.compare(password.trim(), account.passwordHash), false);
    assert.equal(await bcrypt.compare('Una contraseña incorrecta', account.passwordHash), false);

    const claims = jwt.verify(body.accessToken, env.JWT_SECRET, { algorithms: ['HS256'] });
    assert.ok(typeof claims === 'object');
    assert.equal(claims.sub, String(account.id));
    assert.equal(claims.role, 'CANDIDATE');
    assert.equal(claims.exp! - claims.iat!, 3600);
    assert.deepEqual(Object.keys(claims).sort(), ['exp', 'iat', 'role', 'sub']);
    assert.throws(
      () => jwt.verify(body.accessToken, env.JWT_SECRET, {
        algorithms: ['HS256'], clockTimestamp: claims.exp,
      }),
      jwt.TokenExpiredError,
    );
  });

  it('rechaza correos repetidos aunque cambien mayúsculas y espacios', async () => {
    const email = emailFor('duplicate');
    assert.equal((await register({ fullName: 'Ana Rivera', email, password })).status, 201);
    for (const repeatedEmail of [email, ` ${email.toUpperCase()} `]) {
      const response = await register({ fullName: 'Otra Persona', email: repeatedEmail, password });
      assert.equal(response.status, 409);
      assert.deepEqual(await response.json(), {
        message: 'Ya existe una cuenta con este correo electrónico.',
      });
    }
    assert.equal(await prisma.user.count({ where: { email } }), 1);
    assert.equal(await prisma.userProfile.count({ where: { user: { email } } }), 1);
  });

  it('dos solicitudes simultáneas producen una cuenta y un conflicto', async () => {
    const email = emailFor('concurrent');
    const responses = await Promise.all([
      register({ fullName: 'Ana Rivera', email, password }),
      register({ fullName: 'Ana Rivera', email: email.toUpperCase(), password }),
    ]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
    await Promise.all(responses.map((response) => response.arrayBuffer()));
    assert.equal(await prisma.user.count({ where: { email } }), 1);
    assert.equal(await prisma.userProfile.count({ where: { user: { email } } }), 1);
  });

  it('revierte cuenta y perfil si falla la firma y permite reintentar', async (context) => {
    const email = emailFor('rollback');
    const profileCount = await prisma.userProfile.count();
    const log = context.mock.method(console, 'error', () => undefined);
    const signer = context.mock.method(tokenService, 'createAccessToken', () => {
      throw new Error('JWT_SECRET=private-test-fixture');
    });

    try {
      const response = await register({ fullName: 'Ana Rivera', email, password });
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        message: 'Ocurrió un error interno en el servidor.',
      });
      assert.equal(await prisma.user.count({ where: { email } }), 0);
      assert.equal(await prisma.userProfile.count(), profileCount);
      assert.equal(log.mock.callCount(), 1);
      assert.deepEqual(log.mock.calls[0].arguments, [
        'Ocurrió un error interno al procesar la solicitud.',
      ]);
    } finally {
      signer.mock.restore();
    }

    assert.equal((await register({ fullName: 'Ana Rivera', email, password })).status, 201);
  });

  it('rechaza privilegios y datos inválidos sin persistir registros', async () => {
    const email = emailFor('invalid');
    for (const extra of [
      { role: 'ADMINISTRATOR' }, { roleId: 'unknown-role' },
      { status: 'ACTIVE' }, { statusId: 'unknown-status' },
      { password: 'short' }, { password: 'é'.repeat(37) },
      { fullName: ' ' }, { email: 'invalid-email' },
    ]) {
      const response = await register({ fullName: 'Ana Rivera', email, password, ...extra });
      assert.equal(response.status, 400);
      await response.arrayBuffer();
    }
    assert.equal(await prisma.user.count({ where: { email } }), 0);
  });

  it('la API de salud sigue disponible después del registro', async () => {
    const response = await fetch(`${api.baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });
});
