import '../helpers/unit-environment.js';
import assert from 'node:assert/strict';
import { before, after, it } from 'node:test';
import express from 'express';
import { env } from '../../src/config/env.js';
import { startTestServer, stopTestServer, type TestServer } from '../helpers/http.js';

// Each node:test file runs in its own process; production cookie settings are isolated.
env.NODE_ENV = 'production';
let api: TestServer;
before(async () => {
  const { sendSession, clearSessionCookie } = await import('../../src/middleware/session-cookie.middleware.js');
  const app = express();
  app.get('/cookie', (_request, response) => {
    sendSession(response, {
      refreshToken: 'test-opaque-cookie', body: {
        userId: 1, roles: ['CANDIDATE'], permissions: [], accessToken: 'test-access',
        tokenType: 'Bearer', expiresIn: 3600, sessionExpiresAt: new Date(Date.now() + 86400000).toISOString(),
        user: { id: 1, email: 'fixture@example.test', fullName: 'Fixture', role: 'CANDIDATE',
          status: 'ACTIVE', createdAt: '' },
      },
    });
  });
  app.post('/clear', (_request, response) => { clearSessionCookie(response); response.status(204).end(); });
  api = await startTestServer(app);
});
after(async () => { if (api) await stopTestServer(api.server); });

it('emite cookie Secure/HttpOnly en producción sin exponer refresh en JSON', async () => {
  const response = await fetch(api.baseUrl + '/cookie');
  const cookie = response.headers.get('set-cookie')!;
  assert.match(cookie, /; Secure/); assert.match(cookie, /; HttpOnly/);
  assert.match(cookie, /SameSite=Lax/); assert.match(cookie, /Path=\/api\/auth/);
  assert.ok(!(await response.text()).includes('test-opaque-cookie'));
  const cleared = await fetch(api.baseUrl + '/clear', { method: 'POST' });
  assert.equal(cleared.status, 204);
  assert.match(cleared.headers.get('set-cookie')!, /; Secure/);
  assert.match(cleared.headers.get('set-cookie')!, /1970/);
});
