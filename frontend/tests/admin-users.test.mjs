import './helpers/typescript.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const { getUsers, createUser, updateUser } = await import('../src/services/adminUserService.ts');
const { configureAuthentication } = await import('../src/services/api.ts');
const { canManageUsers, getCreatableUserRoles, buildUserUpdate } = await import('../src/utils/userManagement.ts');
const { getAccountIdentityValidationError } = await import('../src/validation/register.ts');

test('abrir Usuarios requiere un rol administrativo y el permiso de lectura correspondiente', () => {
  assert.equal(canManageUsers(null), false);
  assert.equal(canManageUsers({ roles: ['ADMINISTRATOR'], permissions: ['candidates.read'] }), true);
  assert.equal(canManageUsers({ roles: ['CANDIDATE'], permissions: ['candidates.read'] }), false);
  assert.equal(canManageUsers({ roles: ['SUPER_ADMIN', 'ADMINISTRATOR'], permissions: ['candidates.read'] }), false);
  assert.equal(canManageUsers({ roles: ['ADMINISTRATOR'], permissions: ['users.read'] }), false);
  assert.equal(canManageUsers({ roles: ['CANDIDATE'], permissions: ['users.read'] }), false);
  assert.equal(canManageUsers({ roles: ['SUPER_ADMIN'], permissions: [] }), false);
  assert.equal(canManageUsers({ roles: ['SUPER_ADMIN'], permissions: ['users.read'] }), true);
});
test('Administrador solo puede crear candidatos aunque reciba un permiso privilegiado', () => {
  const permissions = ['candidates.create', 'administrators.create'];
  assert.deepEqual(getCreatableUserRoles({ roles: ['ADMINISTRATOR'], permissions }), ['CANDIDATE']);
  assert.deepEqual(getCreatableUserRoles({ roles: ['SUPER_ADMIN'], permissions }), ['CANDIDATE', 'ADMINISTRATOR']);
  assert.deepEqual(getCreatableUserRoles({ roles: ['CANDIDATE'], permissions }), []);
  assert.deepEqual(getCreatableUserRoles({ roles: ['ADMINISTRATOR'], permissions: [] }), []);
  assert.deepEqual(getCreatableUserRoles(null), []);
});

test('editar conserva roles múltiples salvo selección explícita y excluye contraseña', () => {
  const user = { id: 1, fullName: 'Ana Rivera', email: 'ana@example.test', roles: ['CANDIDATE', 'ADMINISTRATOR'], status: 'ACTIVE', createdAt: null };
  const form = { fullName: 'Ana Rivera Nueva', email: ' ANA@EXAMPLE.TEST ', role: '', password: 'never-sent' };
  assert.deepEqual(buildUserUpdate(user, form), { fullName: 'Ana Rivera Nueva' });
  assert.deepEqual(buildUserUpdate(user, { ...form, role: 'CANDIDATE' }), { fullName: 'Ana Rivera Nueva', role: 'CANDIDATE' });
  assert.deepEqual(buildUserUpdate(user, { ...form, fullName: 'Ana Rivera' }), {});
});
test('la validación compartida de identidad funciona sin pedir contraseña al editar', () => {
  assert.equal(getAccountIdentityValidationError('Ana Rivera', 'ana@example.test'), null);
  assert.ok(getAccountIdentityValidationError('', 'ana@example.test'));
  assert.ok(getAccountIdentityValidationError('Ana Rivera', 'invalid'));
});
test('servicios envían filtros y mutaciones autenticadas sin reemplazar la sesión', async (context) => {
  configureAuthentication({ getToken: () => 'test-access', refresh: async () => { throw new Error('No debe renovar.'); }, invalidate: () => {} });
  const calls = [];
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.headers.get('Authorization'), 'Bearer test-access');
    assert.equal(options.headers.get('X-FQA-Request'), '1');
    return new Response(JSON.stringify({ items: [], total: 0, page: 2, pageSize: 20 }), { status: 200 });
  });
  const page = await getUsers({ search: ' Ana & Rivera ', role: 'CANDIDATE', status: 'DISABLED', page: 2, pageSize: 20 });
  assert.equal(page.page, 2);
  const query = new URL(calls[0].url, 'http://localhost').searchParams;
  assert.equal(query.get('search'), 'Ana & Rivera'); assert.equal(query.get('status'), 'DISABLED');
  await createUser({ fullName: 'Ana Rivera', email: 'ana@example.test', password: 'test-fixture', role: 'CANDIDATE' });
  assert.equal(calls[1].options.method, 'POST'); assert.equal(calls[1].url, '/api/admin/users');
  await updateUser(7, { role: 'ADMINISTRATOR' });
  assert.equal(calls[2].options.method, 'PATCH'); assert.equal(calls[2].url, '/api/admin/users/7');
  assert.deepEqual(JSON.parse(calls[2].options.body), { role: 'ADMINISTRATOR' });
});
