import type { Prisma } from '@prisma/client';
import { ROLE_NAMES } from '../constants/authorization.constants.js';
import { USER_STATUS_NAMES } from '../constants/user.constants.js';
import { CANDIDATE_CATALOGS, EDUCATION_LEVELS, LOCATION_ZONES } from '../constants/candidate-catalogs.constants.js';
import { ageDistribution, catalogDistribution, statisticsReferenceDate } from '../utils/statistics-distribution.js';
import type { statisticsDateBounds } from '../validation/statistics.schema.js';

/** This population is shared with Usuarios registrados, including candidates who never applied. */
export const ACTIVE_CANDIDATE_FILTER: Prisma.UserWhereInput = {
  deletedAt: null, status: { name: USER_STATUS_NAMES.ACTIVE },
  userRoles: { some: { roles: { name: ROLE_NAMES.CANDIDATE } }, every: { roles: { name: ROLE_NAMES.CANDIDATE } } },
};

/** Independent cumulative profile distributions are aggregated in PostgreSQL without reading user identities. */
export const candidateDemographics = async (database: Prisma.TransactionClient, total: number, now: Date) => {
  const where = { user: ACTIVE_CANDIDATE_FILTER };
  const [ages, sexes, educations, departments] = await Promise.all([
    database.userProfile.groupBy({ by: ['birthDate'], where, _count: true }),
    database.userProfile.groupBy({ by: ['sex'], where, _count: true }),
    database.userProfile.groupBy({ by: ['educationLevel'], where, _count: true }),
    database.userProfile.groupBy({ by: ['department'], where, _count: true }),
  ]);
  const asOfDate = statisticsReferenceDate(now);
  return { totalCandidates: total, asOfDate, timeZone: 'America/El_Salvador',
    byAge: ageDistribution(ages.map(row => ({ value: row.birthDate?.toISOString().slice(0, 10) ?? null, count: row._count })), total, asOfDate),
    bySex: catalogDistribution(sexes.map(row => ({ value: row.sex, count: row._count })), total,
      CANDIDATE_CATALOGS.sexes.map(choice => ({ key: choice.value, label: choice.label }))),
    byEducationLevel: catalogDistribution(educations.map(row => ({ value: row.educationLevel, count: row._count })), total,
      EDUCATION_LEVELS.map(value => ({ key: value, label: value })), true),
    byDepartment: catalogDistribution(departments.map(row => ({ value: row.department, count: row._count })), total,
      LOCATION_ZONES.flatMap(zone => zone.departments).map(item => ({ key: item.name, label: item.name })), true),
  };
};

/** Each category compares two independently dated cohorts; attempts on previously published opportunities still count. */
export const categoryStatistics = async (database: Prisma.TransactionClient, bounds: ReturnType<typeof statisticsDateBounds>) => {
  const [jobs, volunteers, attempts] = await Promise.all([
    database.jobs.groupBy({ by: ['categoryId'], where: { publishedAt: bounds }, _count: true }),
    database.volunteerOpportunities.groupBy({ by: ['categoryId'], where: { publishedAt: bounds }, _count: true }),
    database.applications.groupBy({ by: ['jobId', 'volunteerRegistrationId'], where: { createdAt: bounds }, _count: true }),
  ]);
  const jobIds = [...new Set(attempts.flatMap(row => row.jobId === null ? [] : [row.jobId]))];
  const registrationIds = [...new Set(attempts.flatMap(row => row.volunteerRegistrationId === null ? [] : [row.volunteerRegistrationId]))];
  const [jobCategories, registrations] = await Promise.all([
    database.jobs.findMany({ where: { id: { in: jobIds } }, select: { id: true, categoryId: true } }),
    database.volunteerRegistrations.findMany({ where: { id: { in: registrationIds } }, select: { id: true, volunteerOpportunities: { select: { categoryId: true } } } }),
  ]);
  const jobsById = new Map(jobCategories.map(row => [row.id, row.categoryId]));
  const registrationsById = new Map(registrations.map(row => [row.id, row.volunteerOpportunities.categoryId]));
  const counts = new Map<number | null, { publishedOpportunities: number; applications: number }>();
  /** Both aggregate sources use the same nullable key, including historical unclassified records. */
  const category = (id: number | null) => {
    let row = counts.get(id);
    if (!row) { row = { publishedOpportunities: 0, applications: 0 }; counts.set(id, row); }
    return row;
  };
  for (const row of [...jobs, ...volunteers]) category(row.categoryId).publishedOpportunities += row._count;
  for (const row of attempts) {
    const id = row.jobId !== null ? jobsById.get(row.jobId) : row.volunteerRegistrationId !== null ? registrationsById.get(row.volunteerRegistrationId) : null;
    category(id ?? null).applications += row._count;
  }
  const catalog = await database.jobCategories.findMany({ where: { id: { in: [...counts.keys()].filter((id): id is number => id !== null) } }, select: { id: true, name: true } });
  const names = new Map(catalog.map(row => [row.id, row.name]));
  return [...counts].map(([categoryId, row]) => ({ categoryId, name: categoryId === null ? 'Sin categoría' : names.get(categoryId) ?? 'Sin categoría', ...row }))
    .filter(row => row.publishedOpportunities || row.applications)
    .sort((a, b) => b.applications - a.applications || b.publishedOpportunities - a.publishedOpportunities || a.name.localeCompare(b.name, 'es') || (a.categoryId ?? 0) - (b.categoryId ?? 0));
};
