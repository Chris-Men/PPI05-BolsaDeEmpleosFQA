import './helpers/typescript.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const { sessionStore } = await import('../src/services/sessionStore.ts');
const { apiRequest } = await import('../src/services/api.ts');

const fixture = (token = 'access-one') => ({
  userId: 1, user: { id: 1, fullName: 'Ana Rivera', email: 'ana@example.test', role: 'CANDIDATE',
    status: 'ACTIVE', createdAt: '2026-09-16T00:00:00Z' },
  roles: ['CANDIDATE'], permissions: ['profiles.read.own'], accessToken: token,
  tokenType: 'Bearer', expiresIn: 3600, sessionExpiresAt: '2026-10-16T00:00:00Z',
});
const json = (body, status = 200) => new Response(JSON.stringify(body), { status,
  headers: { 'Content-Type': 'application/json' } });

test('gestión de sesión: restauración, coordinación, errores y cierre', async (context) => {
  let queue = Promise.resolve();
  let locksSupported = true;
  context.mock.getter(globalThis, 'navigator', () => ({
    locks: locksSupported ? { request: (_name, operation) => {
      const next = queue.then(operation); queue = next.catch(() => undefined); return next;
    } } : undefined,
  }));
  let refreshCount = 0;
  context.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(options.credentials, 'include');
    assert.equal(options.headers.get('X-FQA-Request'), '1');
    refreshCount += 1;
    return json(fixture());
  });
  await Promise.all([sessionStore.bootstrap(), sessionStore.bootstrap()]);
  assert.equal(refreshCount, 1);
  assert.equal(sessionStore.getSnapshot().status, 'authenticated');

  // Two authenticated requests encountering 401 share one renewal.
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/refresh')) { refreshCount += 1; return json(fixture('access-two')); }
    calls += 1;
    return options.headers.get('Authorization') === 'Bearer access-two'
      ? json({ ok: true }) : json({ message: 'Sesión vencida.' }, 401);
  };
  const replies = await Promise.all([
    apiRequest('/private', { authenticated: true }), apiRequest('/private', { authenticated: true }),
  ]);
  assert.deepEqual(replies, [{ ok: true }, { ok: true }]);
  assert.equal(refreshCount, 2); assert.equal(calls, 4);

  globalThis.fetch = async () => json({ message: 'Sin permiso.' }, 403);
  await assert.rejects(apiRequest('/private', { authenticated: true }), { status: 403 });
  assert.equal(refreshCount, 2);
  assert.equal(sessionStore.getSnapshot().status, 'authenticated');

  globalThis.fetch = async () => { throw new TypeError('network offline'); };
  await assert.rejects(sessionStore.logout());
  assert.equal(sessionStore.getSnapshot().status, 'authenticated');

  globalThis.fetch = async () => new Response(null, { status: 204 });
  await sessionStore.logout();
  assert.equal(sessionStore.getSnapshot().session, null);

  // Registration immediately authenticates the returned identity.
  globalThis.fetch = async () => json(fixture('registered'));
  await sessionStore.register({ fullName: 'Ana Rivera', email: 'ana@example.test', password: 'test-only' });
  assert.equal(sessionStore.getSnapshot().session.accessToken, 'registered');

  // Network restoration failure is recoverable, without an infinite retry.
  globalThis.fetch = async () => { throw new TypeError('network offline'); };
  await sessionStore.retry();
  assert.equal(sessionStore.getSnapshot().status, 'error');
  globalThis.fetch = async () => json(fixture('recovered'));
  await sessionStore.retry();
  assert.equal(sessionStore.getSnapshot().status, 'authenticated');

  // A late 401 from an older token must not cause a second rotation.
  let releaseSlow;
  const slowGate = new Promise((resolve) => { releaseSlow = resolve; });
  let rotations = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/refresh')) { rotations += 1; return json(fixture('latest')); }
    if (options.headers.get('Authorization') === 'Bearer latest') return json({ ok: true });
    if (url.endsWith('/slow')) await slowGate;
    return json({ message: 'Expirada.' }, 401);
  };
  const slow = apiRequest('/slow', { authenticated: true });
  await apiRequest('/fast', { authenticated: true });
  releaseSlow();
  await slow;
  assert.equal(rotations, 1);

  // A delayed /me response cannot restore identity after logout.
  let releaseMe;
  let startedMe;
  const meStarted = new Promise((resolve) => { startedMe = resolve; });
  const meGate = new Promise((resolve) => { releaseMe = resolve; });
  globalThis.fetch = async (url) => {
    if (url.endsWith('/me')) { startedMe(); await meGate; return json(fixture('latest')); }
    return new Response(null, { status: 204 });
  };
  const validation = sessionStore.validate();
  await meStarted;
  await sessionStore.logout();
  releaseMe();
  await validation;
  assert.equal(sessionStore.getSnapshot().status, 'anonymous');
  globalThis.fetch = async () => json(fixture('final-session'));
  await sessionStore.login({ email: 'ana@example.test', password: 'test-only' });

  let invalidCalls = 0;
  globalThis.fetch = async () => { invalidCalls += 1; return json({ message: 'Sesión revocada.' }, 401); };
  await assert.rejects(apiRequest('/private', { authenticated: true }), { status: 401 });
  assert.equal(invalidCalls, 2);
  assert.equal(sessionStore.getSnapshot().status, 'anonymous');
  locksSupported = false;
  await sessionStore.retry();
  assert.equal(sessionStore.getSnapshot().status, 'error');
  assert.match(sessionStore.getSnapshot().error, /navegador actualizado/);
});
