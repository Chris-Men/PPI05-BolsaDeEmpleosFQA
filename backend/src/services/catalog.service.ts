import type { PrismaClient } from '@prisma/client';
import {
  ACTIVE_USER_STATUS_CODE,
  CANDIDATE_ROLE_CODE,
} from '../constants/auth.constants.js';

/** Creates or updates the initial account catalogs without duplicating records. */
export const seedAccountCatalogs = async (database: PrismaClient): Promise<void> => {
  const roles = [
    { code: CANDIDATE_ROLE_CODE, name: 'Candidato' },
    { code: 'ORGANIZATION', name: 'Organización' },
    { code: 'ADMINISTRATOR', name: 'Administrador' },
  ];

  await database.$transaction(async (transaction) => {
    for (const role of roles) {
      await transaction.role.upsert({
        where: { code: role.code },
        update: { name: role.name },
        create: role,
      });
    }

    await transaction.userStatus.upsert({
      where: { code: ACTIVE_USER_STATUS_CODE },
      update: { name: 'Activo' },
      create: { code: ACTIVE_USER_STATUS_CODE, name: 'Activo' },
    });
  });
};
