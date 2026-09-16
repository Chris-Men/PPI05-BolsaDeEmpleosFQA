import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import {
  isPermissionCode, PERMISSIONS, roleCodeFor, SUPER_ADMIN_PERMISSIONS,
  type PermissionCode, type RoleCode,
} from '../constants/authorization.constants.js';
import type { AccessContext, AccountRoleTarget, OwnPermissionCode } from '../types/authorization.types.js';
import { AppError } from '../utils/app-error.js';

/** Resolves authorization from persisted assignments; JWT role claims are not trusted. */
export const authorizationService = {
  /** Rejects deleted/inactive accounts and exposes no passwords or profile details. */
  async getAccessContext(userId: number, database: Prisma.TransactionClient = prisma): Promise<AccessContext> {
    const user = await database.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        deletedAt: true,
        status: { select: { name: true } },
        userRoles: {
          select: {
            roles: {
              select: {
                name: true,
                rolePermissions: { select: { permissions: { select: { name: true } } } },
              },
            },
          },
        },
      },
    });
    if (!user || user.deletedAt !== null || user.status.name !== 'Activo') {
      throw new AppError(401, 'La sesión no es válida. Inicia sesión nuevamente.');
    }

    const roles = new Set<RoleCode>();
    const permissions = new Set<PermissionCode>();
    for (const { roles: role } of user.userRoles) {
      const code = roleCodeFor(role.name);
      if (!code) continue;
      roles.add(code);
      for (const { permissions: permission } of role.rolePermissions) {
        if (isPermissionCode(permission.name)) permissions.add(permission.name);
      }
    }
    const access: AccessContext = {
      userId: user.id, roles: [...roles].sort(), permissions: [...permissions].sort(),
    };
    // Keep frontend metadata consistent with privileged-operation guards.
    access.permissions = access.permissions.filter((permission) => hasPermission(access, permission));
    return access;
  },
};

/** Checks a grant while enforcing the Super Admin boundary for sensitive operations. */
export const hasPermission = (access: AccessContext, permission: PermissionCode): boolean =>
  access.permissions.includes(permission) &&
  (!SUPER_ADMIN_PERMISSIONS.includes(permission) || access.roles.includes('SUPER_ADMIN'));

/** Denies missing grants by default, including for Super Admin without its DB grant. */
export const assertPermission = (access: AccessContext, permission: PermissionCode): void => {
  if (!hasPermission(access, permission)) {
    throw new AppError(403, 'No tienes permiso para realizar esta acción.');
  }
};

/** Checks both grant and ownership; ownerId must come from the stored resource. */
export const assertOwnPermission = (
  access: AccessContext, permission: OwnPermissionCode, ownerId: number,
): void => {
  assertPermission(access, permission);
  if (access.userId !== ownerId) {
    throw new AppError(403, 'Solo puedes realizar esta acción sobre tus propios datos.');
  }
};

/** Allows candidate creation by administrators and admin creation only by Super Admin. */
export const assertCanCreateAccount = (access: AccessContext, targetRole: RoleCode): void => {
  if (targetRole === 'CANDIDATE') {
    assertPermission(access, PERMISSIONS.CANDIDATE_CREATE);
  } else if (targetRole === 'ADMINISTRATOR') {
    assertPermission(access, PERMISSIONS.ADMINISTRATOR_CREATE);
  } else {
    throw new AppError(403, 'No se permite crear cuentas Super Admin desde esta operación.');
  }
};

/** Protects Super Admin, self and non-admin accounts; target must be read from the DB. */
export const assertCanDeleteAdministrator = (
  access: AccessContext, target: AccountRoleTarget,
): void => {
  assertPermission(access, PERMISSIONS.ADMINISTRATOR_DELETE);
  if (
    target.userId === access.userId ||
    !target.roles.includes('ADMINISTRATOR') ||
    target.roles.includes('SUPER_ADMIN')
  ) {
    throw new AppError(403, 'Solo se pueden eliminar cuentas de administradores.');
  }
};
