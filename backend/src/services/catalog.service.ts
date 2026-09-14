import type { PrismaClient } from '@prisma/client';
/** Creates or updates the initial account catalogs without duplicating records. */
export const seedAccountCatalogs = async (database: PrismaClient): Promise<void> => {
  const roles = [
    { name: 'Candidato' },
    { name: 'Organización' },
    { name: 'Administrador' },
  ];

  await database.$transaction(async (transaction) => {
    for (const role of roles) {
      await transaction.role.upsert({
        where: { name: role.name },
        update: { name: role.name },
        create: role,
      });
    }

    await transaction.userStatus.upsert({
      where: { name: 'Activo' },
      update: { name: 'Activo' },
      create: { name: 'Activo' },
    });
  });
};
