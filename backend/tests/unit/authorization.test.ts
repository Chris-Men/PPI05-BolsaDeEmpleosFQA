import '../helpers/unit-environment.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PERMISSIONS, ROLE_PERMISSIONS, SUPER_ADMIN_PERMISSIONS, type RoleCode,
} from '../../src/constants/authorization.constants.js';
import {
  assertCanCreateAccount, assertCanDeleteAdministrator, assertOwnPermission,
  assertPermission, hasPermission,
} from '../../src/services/authorization.service.js';
import type { AccessContext, OwnPermissionCode } from '../../src/types/authorization.types.js';
import { AppError } from '../../src/utils/app-error.js';

/** Constructs a trusted identity for isolated policy assertions. */
const accessFor = (role: RoleCode, userId = 1): AccessContext => ({
  userId, roles: [role], permissions: [...ROLE_PERMISSIONS[role]],
});

/** Requires a localized forbidden error rather than any incidental exception. */
const denied = (operation: () => void): void => {
  assert.throws(operation, (error: unknown) =>
    error instanceof AppError && error.statusCode === 403 && Boolean(error.message));
};

describe('Políticas de roles y propiedad', () => {
  it('el candidato solo puede operar sobre su perfil y sus postulaciones', () => {
    const candidate = accessFor('CANDIDATE');
    const ownOperations: OwnPermissionCode[] = [
      PERMISSIONS.PROFILE_READ_OWN, PERMISSIONS.PROFILE_UPDATE_OWN,
      PERMISSIONS.PROFILE_RESUME_UPLOAD_OWN, PERMISSIONS.APPLICATION_CREATE_OWN,
      PERMISSIONS.APPLICATION_READ_OWN, PERMISSIONS.APPLICATION_RESUME_UPLOAD_OWN,
    ];
    for (const permission of ownOperations) {
      assert.doesNotThrow(() => assertOwnPermission(candidate, permission, 1));
      denied(() => assertOwnPermission(candidate, permission, 2));
    }
    for (const permission of [
      PERMISSIONS.CANDIDATE_CREATE, PERMISSIONS.CANDIDATE_READ,
      PERMISSIONS.OPPORTUNITY_CREATE, PERMISSIONS.APPLICATION_SELECT,
      PERMISSIONS.PROFILE_RESUME_READ_ANY, PERMISSIONS.APPLICATION_RESUME_READ_ANY,
      PERMISSIONS.ORGANIZATION_CREATE, PERMISSIONS.ORGANIZATION_READ,
      PERMISSIONS.ORGANIZATION_UPDATE, PERMISSIONS.ORGANIZATION_STATUS_UPDATE, ...SUPER_ADMIN_PERMISSIONS,
    ]) denied(() => assertPermission(candidate, permission));
  });

  it('ser propietario no sustituye un permiso revocado', () => {
    const candidate = accessFor('CANDIDATE');
    candidate.permissions = [];
    denied(() => assertOwnPermission(candidate, PERMISSIONS.PROFILE_UPDATE_OWN, 1));
  });

  it('admin y Super Admin pueden crear candidatos y gestionar selección, CV y organizaciones', () => {
    for (const role of ['ADMINISTRATOR', 'SUPER_ADMIN'] as const) {
      const access = accessFor(role);
      assert.doesNotThrow(() => assertCanCreateAccount(access, 'CANDIDATE'));
      for (const permission of [
        PERMISSIONS.CANDIDATE_READ, PERMISSIONS.OPPORTUNITY_CREATE,
        PERMISSIONS.APPLICATION_READ_ANY, PERMISSIONS.APPLICATION_SELECT,
        PERMISSIONS.PROFILE_RESUME_READ_ANY, PERMISSIONS.APPLICATION_RESUME_READ_ANY,
        PERMISSIONS.ORGANIZATION_CREATE, PERMISSIONS.ORGANIZATION_READ,
        PERMISSIONS.ORGANIZATION_UPDATE, PERMISSIONS.ORGANIZATION_STATUS_UPDATE,
      ]) assert.doesNotThrow(() => assertPermission(access, permission));
    }
    denied(() => assertCanCreateAccount(accessFor('CANDIDATE'), 'CANDIDATE'));
  });

  it('solo Super Admin puede crear administradores y nadie crea Super Admin por esta política', () => {
    denied(() => assertCanCreateAccount(accessFor('CANDIDATE'), 'ADMINISTRATOR'));
    denied(() => assertCanCreateAccount(accessFor('ADMINISTRATOR'), 'ADMINISTRATOR'));
    assert.doesNotThrow(() => assertCanCreateAccount(accessFor('SUPER_ADMIN'), 'ADMINISTRATOR'));
    for (const role of ['CANDIDATE', 'ADMINISTRATOR', 'SUPER_ADMIN'] as const) {
      denied(() => assertCanCreateAccount(accessFor(role), 'SUPER_ADMIN'));
    }
  });

  it('protege cuentas Super Admin, candidatos y la propia cuenta frente a eliminación', () => {
    const superAdmin = accessFor('SUPER_ADMIN');
    const administrator = { userId: 2, roles: ['ADMINISTRATOR'] as const };
    assert.doesNotThrow(() => assertCanDeleteAdministrator(superAdmin, administrator));
    denied(() => assertCanDeleteAdministrator(accessFor('ADMINISTRATOR'), administrator));
    for (const target of [
      { userId: 1, roles: ['ADMINISTRATOR'] as const },
      { userId: 2, roles: ['CANDIDATE'] as const },
      { userId: 2, roles: ['SUPER_ADMIN'] as const },
      { userId: 2, roles: ['ADMINISTRATOR', 'SUPER_ADMIN'] as const },
      { userId: 2, roles: [] },
    ]) denied(() => assertCanDeleteAdministrator(superAdmin, target));
  });

  it('backup y restore requieren Super Admin y el permiso específico vigente', () => {
    for (const permission of [PERMISSIONS.DATABASE_BACKUP, PERMISSIONS.DATABASE_RESTORE]) {
      assert.doesNotThrow(() => assertPermission(accessFor('SUPER_ADMIN'), permission));
      denied(() => assertPermission(accessFor('ADMINISTRATOR'), permission));
      const withoutGrant = accessFor('SUPER_ADMIN');
      withoutGrant.permissions = withoutGrant.permissions.filter((grant) => grant !== permission);
      assert.equal(hasPermission(withoutGrant, permission), false);
    }
  });

  it('un permiso sensible mal asignado no convierte un administrador en Super Admin', () => {
    const administrator = accessFor('ADMINISTRATOR');
    administrator.permissions.push(...SUPER_ADMIN_PERMISSIONS);
    for (const permission of SUPER_ADMIN_PERMISSIONS) {
      denied(() => assertPermission(administrator, permission));
    }
  });
});
