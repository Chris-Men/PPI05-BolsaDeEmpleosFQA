import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { PERMISSIONS, ROLE_NAMES } from '../constants/authorization.constants.js';
import { OPPORTUNITY_KINDS, OPPORTUNITY_STATUS_NAMES } from '../constants/opportunity.constants.js';
import { APPLICATION_STATUS_NAMES, applicationStatusFor } from '../constants/application.constants.js';
import { USER_STATUS_NAMES } from '../constants/user.constants.js';
import type { AccessContext } from '../types/authorization.types.js';
import { statisticsDateBounds, type StatisticsRange } from '../validation/statistics.schema.js';
import { assertVacancyAccess } from './vacancy-policy.service.js';
import { opportunityStatusCode, publicOpportunityWhere } from './opportunity-visibility.js';

/** Aggregates submitted attempts, including legacy documents and withdrawn attempts. */
const applicationMetrics = async (database: Prisma.TransactionClient, where: Prisma.ApplicationsWhereInput = {}) => {
  const [groups, candidates, documents, jobs, volunteers] = await Promise.all([
    database.applications.groupBy({ by: ['statusId'], where, _count: true }),
    database.applications.groupBy({ by: ['userId'], where }),
    database.applications.count({ where: { AND: [where, { OR: [{ resumeId: { not: null } }, { applicationFiles: { some: { files: { fileType: 'RESUME' } } } }] }] } }),
    database.applications.groupBy({ by: ['jobId'], where: { AND: [where, { jobId: { not: null } }] } }),
    database.volunteerRegistrations.groupBy({ by: ['volunteerOpportunityId'], where: { applications: { some: where } } }),
  ]);
  const catalog = await database.applicationStatuses.findMany({ select: { id: true, name: true } });
  const states = new Map<string, number>(Object.keys(APPLICATION_STATUS_NAMES).map(status => [status, 0]));
  for (const group of groups) {
    const status = applicationStatusFor(catalog.find(item => item.id === group.statusId)?.name ?? '');
    states.set(status, (states.get(status) ?? 0) + group._count);
  }
  const total = groups.reduce((sum, group) => sum + group._count, 0);
  return { total, candidates: candidates.length, withResume: documents, opportunityCount: jobs.length + volunteers.length,
    states: [...states].map(([status, count]) => ({ status, count })) };
};

/** Current public availability is independent of the selected historical range. */
const activeCount = async (database: Prisma.TransactionClient) => {
  const visible = publicOpportunityWhere(new Date());
  const [jobs, volunteers] = await Promise.all([
    database.jobs.count({ where: { ...visible, jobStatuses: { name: OPPORTUNITY_STATUS_NAMES.OPEN } } }),
    database.volunteerOpportunities.count({ where: { ...visible, volunteerStatuses: { name: OPPORTUNITY_STATUS_NAMES.OPEN } } }),
  ]);
  return jobs + volunteers;
};

/** Counts active, non-deleted candidate accounts and their lifetime selections once per person. */
const userMetrics = async (database: Prisma.TransactionClient, bounds: ReturnType<typeof statisticsDateBounds>) => {
  const candidate: Prisma.UserWhereInput = { deletedAt: null, userRoles: { some: { roles: { name: ROLE_NAMES.CANDIDATE } } } };
  const registered: Prisma.UserWhereInput = { ...candidate, status: { name: USER_STATUS_NAMES.ACTIVE },
    userRoles: { some: { roles: { name: ROLE_NAMES.CANDIDATE } }, every: { roles: { name: ROLE_NAMES.CANDIDATE } } } };
  const selectedStatus = await database.applicationStatuses.findUnique({ where: { name: APPLICATION_STATUS_NAMES.SELECTED }, select: { id: true } });
  const [total, candidates, selected, newCandidates, withResume] = await Promise.all([
    database.user.count({ where: registered }),
    database.user.count({ where: candidate }),
    selectedStatus ? database.user.count({ where: { ...registered, applications: { some: { OR: [
      { statusId: selectedStatus.id },
      { applicationStatusHistory: { some: { newStatusId: selectedStatus.id } } },
    ] } } } }) : Promise.resolve(0),
    database.user.count({ where: { ...candidate, createdAt: bounds } }),
    database.user.count({ where: { ...candidate, profile: { resumeFileId: { not: null } } } }),
  ]);
  return { total, candidates, selected, selectionRate: total ? selected * 100 / total : 0, newCandidates, withResume };
};

/** Finds the beginning of dated activity across both vacancy sources, applications and candidate registrations. */
const firstActivityDate = async (database: Prisma.TransactionClient): Promise<string> => {
  const [jobs, volunteers, applications, candidates] = await Promise.all([
    database.jobs.aggregate({ _min: { publishedAt: true } }),
    database.volunteerOpportunities.aggregate({ _min: { publishedAt: true } }),
    database.applications.aggregate({ _min: { createdAt: true } }),
    database.user.aggregate({ _min: { createdAt: true }, where: { deletedAt: null, userRoles: { some: { roles: { name: ROLE_NAMES.CANDIDATE } } } } }),
  ]);
  const dates = [jobs._min.publishedAt, volunteers._min.publishedAt, applications._min.createdAt, candidates._min.createdAt]
    .filter((value): value is Date => value !== null).map(value => value.getTime());
  const first = new Date(Math.min(Date.now(), ...dates));
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit' }).format(first);
};

/** One consistent snapshot supplies every metric, never a limited listing page. */
export const getStatistics = async (range: StatisticsRange, actor: AccessContext) => {
  assertVacancyAccess(actor, PERMISSIONS.STATISTICS_READ);
  return prisma.$transaction(async database => {
    const bounds = statisticsDateBounds(range);
    const [jobs, volunteers, organizations, applications, activeOpportunities, users, firstDate] = await Promise.all([
      database.jobs.groupBy({ by: ['kind'], where: { publishedAt: bounds }, _count: true }),
      database.volunteerOpportunities.count({ where: { publishedAt: bounds } }),
      database.organizations.count(), applicationMetrics(database, { createdAt: bounds }), activeCount(database),
      userMetrics(database, bounds),
      firstActivityDate(database),
    ]);
    const byKind = OPPORTUNITY_KINDS.map(kind => ({ kind, count: kind === 'VOLUNTEER' ? volunteers : jobs.find(row => row.kind === kind)?._count ?? 0 }));
    return { range: { ...range, timeZone: 'America/El_Salvador', firstActivityDate: firstDate }, publishedOpportunities: byKind.reduce((sum, row) => sum + row.count, 0),
      organizations, applications: applications.total, applicants: applications.candidates, byKind, states: applications.states, activeOpportunities,
      users, opportunitiesWithApplications: applications.opportunityCount,
      pendingApplications: applications.states.filter(row => row.status === 'PENDING' || row.status === 'IN_REVIEW').reduce((sum, row) => sum + row.count, 0),
      applicationsPerOpportunity: applications.opportunityCount ? applications.total / applications.opportunityCount : 0,
      selectionRate: applications.total ? (applications.states.find(row => row.status === 'SELECTED')?.count ?? 0) * 100 / applications.total : 0 };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
};

/** Cumulative dashboard totals include archived vacancies and all preserved attempts. */
export const getDashboardStatistics = async (actor: AccessContext) => {
  assertVacancyAccess(actor, PERMISSIONS.STATISTICS_READ);
  return prisma.$transaction(async database => {
    const common = { id: true, title: true, createdAt: true, archivedAt: true, organizations: { select: { name: true } } };
    const orderBy = [{ createdAt: { sort: 'desc' as const, nulls: 'last' as const } }, { id: 'desc' as const }];
    const [jobTotal, volunteerTotal, organizations, applications, jobs, volunteers] = await Promise.all([
      database.jobs.count(), database.volunteerOpportunities.count(), database.organizations.count(), applicationMetrics(database),
      database.jobs.findMany({ select: { ...common, kind: true, jobStatuses: { select: { name: true } } }, orderBy, take: 10 }),
      database.volunteerOpportunities.findMany({ select: { ...common, volunteerStatuses: { select: { name: true } } }, orderBy, take: 10 }),
    ]);
    const recent = [...jobs.map(row => ({ ...row, key: 'job-' + row.id, kind: row.kind, stateName: row.jobStatuses.name })),
      ...volunteers.map(row => ({ ...row, key: 'volunteer-' + row.id, kind: 'VOLUNTEER' as const, stateName: row.volunteerStatuses.name }))]
      .sort((a, b) => (b.createdAt?.toISOString() ?? '').localeCompare(a.createdAt?.toISOString() ?? '') || b.id - a.id || a.key.localeCompare(b.key)).slice(0, 10);
    const recentOpportunities = await Promise.all(recent.map(async row => ({
      key: row.key, title: row.title, organization: row.organizations?.name ?? 'Sin organización', kind: row.kind,
      status: row.archivedAt ? 'ARCHIVED' as const : opportunityStatusCode(row.stateName), createdAt: row.createdAt?.toISOString() ?? null,
      candidates: (await database.applications.groupBy({ by: ['userId'], where: row.key.startsWith('job-') ? { jobId: row.id } : { volunteerRegistrations: { volunteerOpportunityId: row.id } } })).length,
    })));
    return { opportunities: jobTotal + volunteerTotal, organizations, applications: applications.total,
      withResume: applications.withResume, applicants: applications.candidates, recentOpportunities };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
};
