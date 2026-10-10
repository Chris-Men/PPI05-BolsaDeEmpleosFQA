import { PrismaClient } from '@prisma/client';
import { seedAccountCatalogs, seedOrganizationCatalogs } from '../services/catalog.service.js';
import { seedOpportunityCatalogs } from '../services/opportunity-catalog.service.js';

/** Seeds account, organization and vacancy catalogs and always releases database connections. */
export const seedDatabase = async (): Promise<void> => {
  const database = new PrismaClient();

  try {
    await seedAccountCatalogs(database);
    await seedOrganizationCatalogs(database);
    await seedOpportunityCatalogs(database);
    console.info('Catálogos de usuarios, organizaciones y vacantes preparados correctamente.');
  } catch {
    // Prisma errors may contain connection details; never print the raw error.
    console.error('No se pudieron preparar los catálogos de usuarios, organizaciones y vacantes.');
    process.exitCode = 1;
  } finally {
    await database.$disconnect();
  }
};

void seedDatabase();
