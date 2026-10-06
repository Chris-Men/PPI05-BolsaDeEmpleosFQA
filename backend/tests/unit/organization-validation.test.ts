import '../helpers/unit-environment.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  changeOrganizationStatusSchema, createOrganizationSchema, listOrganizationsSchema, updateOrganizationSchema,
} from '../../src/validation/organization.schema.js';
import { entityIdSchema } from '../../src/validation/common.schema.js';
import { PERMISSIONS, ROLE_PERMISSIONS } from '../../src/constants/authorization.constants.js';
import {
  assertOrganizationAccess, changeOrganizationStatus, createOrganization, getOrganization,
  listOrganizations, updateOrganization,
} from '../../src/services/organization.service.js';
import type { AccessContext } from '../../src/types/authorization.types.js';
import { AppError } from '../../src/utils/app-error.js';

describe('Validación y política de organizaciones', () => {
  it('normaliza datos de contacto y distingue campos omitidos de null', () => {
    assert.deepEqual(createOrganizationSchema.parse({ name: '  Organización  ', email: ' INFO@EXAMPLE.TEST ', description: '  Detalle  ' }),
      { name: 'Organización', email: 'info@example.test', description: 'Detalle' });
    assert.deepEqual(createOrganizationSchema.parse({ name: 'AB' }), { name: 'AB' });
    assert.deepEqual(updateOrganizationSchema.parse({ description: '  ', email: null }), { description: null, email: null });
    assert.deepEqual(updateOrganizationSchema.parse({ name: 'Nuevo' }), { name: 'Nuevo' });
    assert.equal(createOrganizationSchema.safeParse({ name: 'N'.repeat(150), description: 'D'.repeat(5000) }).success, true);
  });

  it('rechaza datos inválidos y asignación de campos internos o de cuentas', () => {
    for (const body of [undefined, null, [], {}, { name: ' ' }, { name: 'A' }, { name: 'N'.repeat(151) },
      { name: 'AB', email: '' }, { name: 'AB', email: 'invalido' }, { name: 'AB', email: 'a'.repeat(250) + '@test.test' },
      { name: 'AB', description: 'D'.repeat(5001) }, { name: 'AB', email: 1 }]) {
      assert.equal(createOrganizationSchema.safeParse(body).success, false);
    }
    for (const extra of [{ status: 'INACTIVE' }, { statusId: 1 }, { id: 1 }, { userId: 1 },
      { organizationUsers: [] }, { password: 'secreto' }, { createdAt: '2026-01-01' }, { deletedAt: null }]) {
      assert.equal(createOrganizationSchema.safeParse({ name: 'AB', ...extra }).success, false);
      assert.equal(updateOrganizationSchema.safeParse({ name: 'AB', ...extra }).success, false);
    }
    assert.equal(updateOrganizationSchema.safeParse({}).success, false);
    assert.equal(updateOrganizationSchema.safeParse({ name: undefined }).success, false);
    assert.equal(updateOrganizationSchema.safeParse({ name: null }).success, false);
  });

  it('valida estados, IDs y paginación acotada sin aceptar filtros desconocidos', () => {
    assert.deepEqual(listOrganizationsSchema.parse({}), { page: 1, pageSize: 20 });
    assert.deepEqual(listOrganizationsSchema.parse({ search: ' Texto ', status: 'INACTIVE', page: '2', pageSize: '100' }),
      { search: 'Texto', status: 'INACTIVE', page: 2, pageSize: 100 });
    for (const query of [{ page: '0' }, { page: '1.5' }, { page: '1000001' }, { pageSize: '101' },
      { pageSize: '0' }, { status: 'DISABLED' }, { deleted: 'false' }, { search: 'a'.repeat(256) }]) {
      assert.equal(listOrganizationsSchema.safeParse(query).success, false);
    }
    for (const status of ['ACTIVE', 'INACTIVE']) assert.equal(changeOrganizationStatusSchema.safeParse({ status }).success, true);
    for (const body of [{}, { status: 'Activo' }, { status: null }, { status: 'ACTIVE', name: 'AB' }]) {
      assert.equal(changeOrganizationStatusSchema.safeParse(body).success, false);
    }
    for (const id of ['0', '-1', '1.5', 'abc', '01', '2147483648']) assert.equal(entityIdSchema.safeParse(id).success, false);
    assert.equal(entityIdSchema.parse('2147483647'), 2147483647);
  });

  it('exige rol administrativo y permiso incluso al invocar directamente los services', async () => {
    const grants = [PERMISSIONS.ORGANIZATION_CREATE, PERMISSIONS.ORGANIZATION_READ,
      PERMISSIONS.ORGANIZATION_UPDATE, PERMISSIONS.ORGANIZATION_STATUS_UPDATE];
    for (const role of ['ADMINISTRATOR', 'SUPER_ADMIN'] as const) {
      const actor: AccessContext = { userId: 1, roles: [role], permissions: [...ROLE_PERMISSIONS[role]] };
      for (const grant of grants) assert.doesNotThrow(() => assertOrganizationAccess(actor, grant));
    }
    const forbidden = (error: unknown): boolean => error instanceof AppError && error.statusCode === 403;
    for (const actor of [
      { userId: 1, roles: ['CANDIDATE'], permissions: grants },
      { userId: 1, roles: ['ADMINISTRATOR'], permissions: [] },
      { userId: 1, roles: ['SUPER_ADMIN'], permissions: [] },
    ] satisfies AccessContext[]) {
      await assert.rejects(createOrganization({ name: 'AB' }, actor), forbidden);
      await assert.rejects(listOrganizations({ page: 1, pageSize: 20 }, actor), forbidden);
      await assert.rejects(getOrganization(1, actor), forbidden);
      await assert.rejects(updateOrganization(1, { name: 'CD' }, actor), forbidden);
      await assert.rejects(changeOrganizationStatus(1, 'INACTIVE', actor), forbidden);
    }
  });
});
