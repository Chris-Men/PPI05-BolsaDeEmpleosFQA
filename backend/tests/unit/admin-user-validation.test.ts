import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createUserSchema, updateUserSchema, listUsersSchema, userIdSchema } from '../../src/validation/admin-user.schema.js';

const valid = { fullName: ' Ana Rivera ', email: ' ANA@EXAMPLE.TEST ', password: '  Clave segura 2026  ', role: 'CANDIDATE' };
describe('Contratos de gestión de usuarios', () => {
  it('reutiliza normalización y contraseña literal y admite ambos roles editables', () => {
    for (const role of ['CANDIDATE', 'ADMINISTRATOR']) {
      const body = createUserSchema.parse({ ...valid, role });
      assert.equal(body.fullName, 'Ana Rivera');
      assert.equal(body.email, 'ana@example.test');
      assert.equal(body.password, valid.password);
      assert.equal(body.role, role);
    }
  });
  it('rechaza escalamiento y campos fuera de alcance en creación y edición', () => {
    for (const extra of [{ role: 'SUPER_ADMIN' }, { role: 'Editor' }, { status: 'DISABLED' },
      { statusId: 2 }, { deletedAt: null }, { deleted_at: new Date().toISOString() },
      { permissions: ['users.update'] }, { userRoles: [] }, { passwordHash: 'invalid' }]) {
      assert.equal(createUserSchema.safeParse({ ...valid, ...extra }).success, false);
      assert.equal(updateUserSchema.safeParse({ fullName: 'Ana Rivera', ...extra }).success, false);
    }
    assert.equal(updateUserSchema.safeParse({ password: valid.password }).success, false);
    assert.equal(updateUserSchema.safeParse({}).success, false);
    assert.deepEqual(updateUserSchema.parse({ email: ' ANA@EXAMPLE.TEST ' }), { email: 'ana@example.test' });
  });
  it('limita filtros, paginación e identificadores antes de consultar PostgreSQL', () => {
    assert.deepEqual(listUsersSchema.parse({}), { page: 1, pageSize: 20 });
    assert.equal(listUsersSchema.parse({ page: '2', pageSize: '100', status: 'DISABLED' }).page, 2);
    for (const input of [{ page: '0' }, { page: '-1' }, { page: '1.5' }, { page: 'abc' },
      { pageSize: '101' }, { role: 'EDITOR' }, { status: 'DELETED' }, { includeDeleted: 'true' },
      { search: ['a', 'b'] }]) assert.equal(listUsersSchema.safeParse(input).success, false);
    for (const id of ['0', '-1', '01', '1.5', '2147483648']) assert.equal(userIdSchema.safeParse(id).success, false);
  });
});
