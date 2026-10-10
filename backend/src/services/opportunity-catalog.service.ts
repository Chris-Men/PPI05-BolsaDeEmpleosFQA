import type { PrismaClient } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { OPPORTUNITY_STATUS_NAMES } from '../constants/opportunity.constants.js';
import { ORGANIZATION_STATUS_NAMES } from '../constants/organization.constants.js';
import { publicCategories } from './category.service.js';

/** Idempotently seeds only lifecycle, contract and experience catalogs, without example vacancies. */
export const seedOpportunityCatalogs = async (database: PrismaClient): Promise<void> => {
  for (const name of Object.values(OPPORTUNITY_STATUS_NAMES)) {
    await database.jobStatuses.upsert({ where: { name }, update: {}, create: { name } });
    await database.volunteerStatuses.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of ['Tiempo completo', 'Medio tiempo', 'Contrato', 'Temporal']) {
    await database.employmentTypes.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of ['Sin experiencia', 'Junior', 'Intermedio', 'Senior']) {
    await database.experienceLevels.upsert({ where: { name }, update: {}, create: { name } });
  }
};
/** Only active organization names and select catalogs are needed by the vacancy editor. */
export const opportunityCatalogs = async () => {
  const [categories, organizations, employmentTypes, experienceLevels] = await Promise.all([
    publicCategories(),
    prisma.organizations.findMany({ where: { organizationStatuses: { name: ORGANIZATION_STATUS_NAMES.ACTIVE } }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.employmentTypes.findMany({ select: { id: true, name: true }, orderBy: { id: 'asc' } }),
    prisma.experienceLevels.findMany({ select: { id: true, name: true }, orderBy: { id: 'asc' } }),
  ]);
  return { categories, organizations, employmentTypes, experienceLevels };
};
