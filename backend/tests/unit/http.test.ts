import '../helpers/unit-environment.js';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import express from 'express';
import { createApp } from '../../src/app.js';
import { errorHandler } from '../../src/middleware/error.middleware.js';
import { startTestServer, stopTestServer, type TestServer } from '../helpers/http.js';

describe('Contrato HTTP sin acceso a PostgreSQL', () => {
  let api: TestServer;

  before(async () => { api = await startTestServer(createApp()); });
  after(async () => { if (api) await stopTestServer(api.server); });

  it('conserva la comprobación de salud', async () => {
    const response = await fetch(`${api.baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });

  it('rechaza JSON mal formado con un mensaje seguro en español', async () => {
    const response = await fetch(`${api.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"password":"sensitive-fixture",',
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      message: 'El cuerpo de la solicitud debe ser JSON válido.',
    });
  });

  it('rechaza campos de privilegios antes de consultar la base', async () => {
    const response = await fetch(`${api.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Ana Rivera',
        email: 'ana@example.test',
        password: 'Clave de prueba 2026',
        role: 'ADMINISTRATOR',
        status: 'ACTIVE',
      }),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      message: 'Los datos de registro no son válidos.',
      errors: [{ field: '', message: 'La solicitud contiene campos no permitidos.' }],
    });
  });

  it('devuelve errores por campo sin incluir los valores recibidos', async () => {
    const response = await fetch(`${api.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'A', email: 'invalid-email', password: 'secret' }),
    });
    assert.equal(response.status, 400);
    const text = await response.text();
    assert.ok(text.includes('fullName'));
    assert.ok(text.includes('email'));
    assert.ok(text.includes('password'));
    assert.ok(!text.includes('invalid-email'));
    assert.ok(!text.includes('secret'));
  });

  it('rechaza cuerpos excesivos sin revelar el contenido', async () => {
    const response = await fetch(`${api.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'x'.repeat(110_000) }),
    });
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), {
      message: 'El cuerpo de la solicitud es demasiado grande.',
    });
  });

  it('omite secretos tanto en la respuesta 500 como en los registros', async (context) => {
    const log = context.mock.method(console, 'error', () => undefined);
    const app = express();
    app.get('/failure', () => {
      throw new Error('password=sensitive-fixture token=private-fixture');
    });
    app.use(errorHandler);
    const failingApi = await startTestServer(app);

    try {
      const response = await fetch(`${failingApi.baseUrl}/failure`);
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        message: 'Ocurrió un error interno en el servidor.',
      });
      assert.equal(log.mock.callCount(), 1);
      assert.deepEqual(log.mock.calls[0].arguments, [
        'Ocurrió un error interno al procesar la solicitud.',
      ]);
    } finally {
      await stopTestServer(failingApi.server);
    }
  });
});
