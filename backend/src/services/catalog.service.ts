import { ORGANIZATION_STATUS_NAMES } from '../constants/organization.constants.js';
import { USER_STATUS_NAMES } from '../constants/user.constants.js';
import type { PrismaClient } from '@prisma/client';
import {
  PERMISSIONS, ROLE_NAMES, ROLE_PERMISSIONS, type RoleCode,
} from '../constants/authorization.constants.js';

/** Synchronizes canonical role grants atomically, retaining catalog identifiers. */
export const seedAccountCatalogs = async (database: PrismaClient): Promise<void> => {
  await database.$transaction(async (transaction) => {
    for (const name of Object.values(PERMISSIONS)) {
      await transaction.permissions.upsert({ where: { name }, update: {}, create: { name } });
    }

    for (const code of Object.keys(ROLE_NAMES) as RoleCode[]) {
      const name = ROLE_NAMES[code];
      const role = await transaction.role.upsert({
        where: { name }, update: {}, create: { name },
      });
      const permissions = await transaction.permissions.findMany({
        where: { name: { in: [...ROLE_PERMISSIONS[code]] } }, select: { id: true },
      });
      // Canonical roles must not retain obsolete or accidentally elevated grants.
      await transaction.rolePermissions.deleteMany({
        where: { roleId: role.id, permissionId: { notIn: permissions.map(({ id }) => id) } },
      });
      await transaction.rolePermissions.createMany({
        data: permissions.map(({ id }) => ({ roleId: role.id, permissionId: id })),
        skipDuplicates: true,
      });
    }

    // Retires only the login role and cascading grants, never users or organizations.
    await transaction.role.deleteMany({ where: { name: 'Organización' } });

    for (const name of Object.values(USER_STATUS_NAMES)) {
      await transaction.userStatus.upsert({ where: { name }, update: { name }, create: { name } });
    }
  });
};

/** Adds organization states without replacing identifiers or historical records. */
export const seedOrganizationCatalogs = async (database: PrismaClient): Promise<void> => {
  await database.$transaction(async (transaction) => {
    for (const name of Object.values(ORGANIZATION_STATUS_NAMES)) {
      await transaction.organizationStatuses.upsert({ where: { name }, update: {}, create: { name } });
    }
  });
};
