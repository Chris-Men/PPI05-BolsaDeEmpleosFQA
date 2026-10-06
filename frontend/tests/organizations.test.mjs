import './helpers/typescript.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const { configureAuthentication, ApiError } = await import('../src/services/api.ts');
const { getOrganizations, getOrganization, createOrganization, updateOrganization, changeOrganizationStatus } = await import('../src/services/organizationService.ts');
const { canManageOrganizations } = await import('../src/utils/organizationManagement.ts');

test('organizaciones exige rol administrativo y permiso para cada operación', () => {
  assert.equal(canManageOrganizations(null), false);
  assert.equal(canManageOrganizations({ roles: ['CANDIDATE'], permissions: ['organizations.read'] }), false);
  assert.equal(canManageOrganizations({ roles: ['ADMINISTRATOR'], permissions: [] }), false);
  assert.equal(canManageOrganizations({ roles: ['SUPER_ADMIN'], permissions: ['organizations.read'] }), true);
  assert.equal(canManageOrganizations({ roles: ['ADMINISTRATOR'], permissions: ['organizations.read'] }, 'organizations.create'), false);
});

test('organizaciones usa paginación, detalle y mutaciones reales con estado separado', async (context) => {
  const calls = [];
  configureAuthentication({ getToken: () => 'fixture', refresh: async () => {}, invalidate: () => {} });
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.headers.get('Authorization'), 'Bearer fixture');
    return options.method === 'PATCH' && url.endsWith('/status') ? new Response(null, { status: 204 }) : Response.json({});
  });
  await getOrganizations({ search: '  Fundación & educación ', status: 'ACTIVE', page: 2, pageSize: 20 });
  const query = new URL(calls[0].url, 'http://localhost').searchParams;
  assert.equal(query.get('search'), 'Fundación & educación');
  assert.equal(query.get('page'), '2');
  assert.equal(query.get('status'), 'ACTIVE');
  await getOrganization(12);
  const input = { name: 'Fundación', description: null, email: null };
  await createOrganization(input);
  await updateOrganization(12, input);
  await changeOrganizationStatus(12, 'INACTIVE');
  assert.equal(calls[1].url, '/api/admin/organizations/12');
  assert.deepEqual(JSON.parse(calls[2].options.body), input);
  assert.equal(calls[3].options.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[4].options.body), { status: 'INACTIVE' });
});

test('organizaciones conserva los conflictos de nombre y errores recuperables', async (context) => {
  configureAuthentication({ getToken: () => 'fixture', refresh: async () => {}, invalidate: () => {} });
  context.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'El nombre ya está en uso.' }, { status: 409 }));
  await assert.rejects(createOrganization({ name: 'Duplicada', email: null, description: null }), (error) => error instanceof ApiError && error.status === 409);
  context.mock.method(globalThis, 'fetch', async () => { throw new Error('offline'); });
  await assert.rejects(getOrganizations({ search: '', status: '', page: 1, pageSize: 20 }), /conectar con el servidor/);
});
