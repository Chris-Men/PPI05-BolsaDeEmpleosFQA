import { PrismaClient } from '@prisma/client';
import { seedAccountCatalogs } from '../src/services/catalog.service.js';

/** Seeds the required account catalogs and always releases database connections. */
const seed = async (): Promise<void> => {
  const database = new PrismaClient();

  try {
    await seedAccountCatalogs(database);
    console.info('Catálogos de usuarios preparados correctamente.');
  } catch {
    // Prisma errors may contain connection details; never print the raw error.
    console.error('No se pudieron preparar los catálogos de usuarios.');
    process.exitCode = 1;
  } finally {
    await database.$disconnect();
  }
};

void seed();
