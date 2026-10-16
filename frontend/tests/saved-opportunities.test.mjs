import './helpers/typescript.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const { configureAuthentication, ApiError } = await import('../src/services/api.ts');
const service = await import('../src/services/savedOpportunityService.ts');
const intent = await import('../src/utils/savedIntent.ts');

test('guardados usa claves completas, páginas propias y no envía la identidad en HTTP', async context => {
  const calls = [];
  configureAuthentication({ getToken: () => 'fixture-token', getUserId: () => 12, refresh: async () => {}, invalidate: () => {} });
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return ['PUT','DELETE'].includes(options.method) ? new Response(null, { status: 204 }) : Response.json({ keys: ['job-1','volunteer-1'], total: 2 });
  });
  await service.getSavedOpportunityKeys(12);
  await service.listSavedOpportunities(12, 2);
  await service.changeSavedOpportunity('job-1', true, 12);
  await service.changeSavedOpportunity('volunteer-1', true, 12);
  await service.changeSavedOpportunity('job-1', false, 12);
  assert.deepEqual(calls.map(call => call.url), ['/api/saved-opportunities/keys','/api/saved-opportunities?page=2&pageSize=10','/api/saved-opportunities/job-1','/api/saved-opportunities/volunteer-1','/api/saved-opportunities/job-1']);
  assert.deepEqual(calls.slice(2).map(call => call.options.method), ['PUT','PUT','DELETE']);
  assert.ok(calls.every(call => call.options.body === undefined && call.options.headers.get('Authorization') === 'Bearer fixture-token' && !call.url.includes('userId') && !('expectedUserId' in call.options)));
});

test('renueva guardados con la misma cuenta, pero no reintenta ni devuelve respuestas de otra identidad', async context => {
  let userId = 12, token = 'old', requests = 0, refreshes = 0, invalidations = 0;
  configureAuthentication({ getToken: () => token, getUserId: () => userId, refresh: async () => { token = 'renewed'; refreshes++; }, invalidate: () => { invalidations++; } });
  context.mock.method(globalThis, 'fetch', async (_url, options) => {
    requests++;
    if (requests === 1) return Response.json({ message: 'Sesión vencida' }, { status: 401 });
    assert.equal(options.headers.get('Authorization'), 'Bearer renewed'); return new Response(null, { status: 204 });
  });
  await service.changeSavedOpportunity('job-1', true, 12);
  assert.equal(requests, 2); assert.equal(refreshes, 1);
  context.mock.method(globalThis, 'fetch', async () => { requests++; userId = 13; token = 'other-account'; return Response.json({ message: 'Sesión anterior' }, { status: 401 }); });
  await assert.rejects(service.changeSavedOpportunity('job-2', true, 12), error => error instanceof ApiError && error.status === 409);
  assert.equal(requests, 3); assert.equal(refreshes, 1); assert.equal(invalidations, 0);
  await assert.rejects(service.changeSavedOpportunity('job-3', true, 12)); assert.equal(requests, 3);
  userId = 12;
  context.mock.method(globalThis, 'fetch', async () => { userId = 13; return Response.json({ keys: ['job-1'], total: 1 }); });
  await assert.rejects(service.getSavedOpportunityKeys(12), error => error instanceof ApiError && error.status === 409);
  userId = 12;
  context.mock.method(globalThis, 'fetch', async () => ({
    status: 200, ok: true, json: async () => { userId = 13; return { keys: ['job-1'], total: 1 }; },
  }));
  await assert.rejects(service.getSavedOpportunityKeys(12), error => error instanceof ApiError && error.status === 409);
});

test('un fallo de red o permiso mantiene la operación reintentable y la cancelación no envía HTTP', async context => {
  let requests = 0;
  configureAuthentication({ getToken: () => 'fixture-token', getUserId: () => 12, refresh: async () => {}, invalidate: () => {} });
  context.mock.method(globalThis, 'fetch', async () => { requests++; throw new TypeError('Sin red'); });
  await assert.rejects(service.changeSavedOpportunity('job-1', true, 12), error => error instanceof ApiError && error.status === 0);
  context.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'Permiso revocado' }, { status: 403 }));
  await assert.rejects(service.changeSavedOpportunity('job-1', true, 12), error => error.status === 403);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(service.changeSavedOpportunity('job-1', true, 12, controller.signal)); assert.equal(requests, 1);
});

test('la intención anónima conserva solo la clave de vacante y se puede cancelar', context => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  let url = new URL('http://localhost/?postular=job-2&postulacion=8');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    location: { get href() { return url.href; }, get search() { return url.search; } },
    history: { replaceState(_state, _title, next) { url = new URL(next); } },
  }});
  context.after(() => { if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window; });
  intent.setSavedIntent('volunteer-2');
  assert.equal(intent.getSavedIntent(), 'volunteer-2');
  assert.deepEqual([...url.searchParams.entries()], [['guardar','volunteer-2']]);
  intent.clearSavedIntent(); assert.equal(intent.getSavedIntent(), null);
  for (const value of ['job-0','job-2147483648','../job-1','invalid','volunteer--1']) { url.searchParams.set('guardar', value); assert.equal(intent.getSavedIntent(), null); }
});
