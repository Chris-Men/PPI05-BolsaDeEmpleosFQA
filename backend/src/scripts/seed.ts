import { PrismaClient } from '@prisma/client';
import { seedAccountCatalogs, seedOrganizationCatalogs } from '../services/catalog.service.js';

/** Seeds the required account and organization catalogs and always releases database connections. */
export const seedDatabase = async (): Promise<void> => {
  const database = new PrismaClient();

  try {
    await seedAccountCatalogs(database);
    await seedOrganizationCatalogs(database);
    console.info('Catálogos de usuarios y organizaciones preparados correctamente.');
  } catch {
    // Prisma errors may contain connection details; never print the raw error.
    console.error('No se pudieron preparar los catálogos de usuarios y organizaciones.');
    process.exitCode = 1;
  } finally {
    await database.$disconnect();
  }
};

void seedDatabase();