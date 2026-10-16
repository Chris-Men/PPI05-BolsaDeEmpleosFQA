import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { PERMISSIONS } from '../constants/authorization.constants.js';
import type { AccessContext } from '../types/authorization.types.js';
import type { SavedOpportunityQuery } from '../validation/saved-opportunity.schema.js';
import { AppError } from '../utils/app-error.js';
import { assertCandidateAccess } from './profile.service.js';
import { readApplicationOpportunity } from './opportunity.service.js';
import { isOpportunityAvailable, opportunityStatusCode } from './opportunity-visibility.js';

/** Bookmarks expose summary metadata only, even when the opportunity is no longer public. */
const summarySelect = {
  id: true, title: true, archivedAt: true, publishedAt: true, expiresAt: true,
  organizations: { select: { id: true, name: true, organizationStatuses: { select: { name: true } } } },
  jobCategories: { select: { id: true, name: true, isActive: true } },
  locations: { select: { department: true, municipality: true } },
};
const jobSelect = { ...summarySelect, kind: true, jobStatuses: { select: { name: true } } } satisfies Prisma.JobsSelect;
const volunteerSelect = { ...summarySelect, volunteerStatuses: { select: { name: true } } } satisfies Prisma.VolunteerOpportunitiesSelect;
type SummaryRow = Prisma.JobsGetPayload<{ select: typeof jobSelect }> | Prisma.VolunteerOpportunitiesGetPayload<{ select: typeof volunteerSelect }>;

/** Internal status and organization eligibility are projected into safe display fields. */
const summary = (row: SummaryRow, savedAt: Date | null, now: Date) => ({
  key: ('kind' in row ? 'job-' : 'volunteer-') + row.id,
  kind: 'kind' in row ? row.kind : 'VOLUNTEER' as const,
  title: row.title,
  organization: row.organizations ? { id: row.organizations.id, name: row.organizations.name } : null,
  category: row.jobCategories ? { id: row.jobCategories.id, name: row.jobCategories.name } : null,
  department: row.locations?.department ?? null, municipality: row.locations?.municipality ?? null,
  status: opportunityStatusCode('jobStatuses' in row ? row.jobStatuses.name : row.volunteerStatuses.name),
  savedAt: savedAt?.toISOString() ?? null, available: isOpportunityAvailable(row, now),
});

/** Returns a complete account-specific identity set; counts never come from a visible page. */
export const savedOpportunityKeys = async (actor: AccessContext) => {
  assertCandidateAccess(actor, PERMISSIONS.SAVED_OPPORTUNITY_READ_OWN);
  return prisma.$transaction(async database => {
    const [jobs, volunteers] = await Promise.all([
      database.savedJobs.findMany({ where: { userId: actor.userId }, select: { jobId: true }, orderBy: { jobId: 'asc' } }),
      database.savedVolunteerOpportunities.findMany({ where: { userId: actor.userId }, select: { volunteerOpportunityId: true }, orderBy: { volunteerOpportunityId: 'asc' } }),
    ]);
    const keys = [...jobs.map(row => 'job-' + row.jobId), ...volunteers.map(row => 'volunteer-' + row.volunteerOpportunityId)];
    return { keys, total: keys.length };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
};

/** Ranks bounded identity prefixes and loads summary content just for the requested page. */
export const listSavedOpportunities = async (query: SavedOpportunityQuery, actor: AccessContext) => {
  assertCandidateAccess(actor, PERMISSIONS.SAVED_OPPORTUNITY_READ_OWN);
  return prisma.$transaction(async database => {
    const where = { userId: actor.userId };
    const prefix = query.page * query.pageSize;
    const orderBy = [{ createdAt: { sort: 'desc' as const, nulls: 'last' as const } }, { id: 'desc' as const }];
    const [jobs, volunteers, jobCount, volunteerCount] = await Promise.all([
      database.savedJobs.findMany({ where, select: { id: true, jobId: true, createdAt: true }, orderBy, take: prefix }),
      database.savedVolunteerOpportunities.findMany({ where, select: { id: true, volunteerOpportunityId: true, createdAt: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: prefix }),
      database.savedJobs.count({ where }), database.savedVolunteerOpportunities.count({ where }),
    ]);
    const ranked = [...jobs.map(row => ({ ...row, opportunityId: row.jobId, key: 'job-' + row.jobId, volunteer: false })),
      ...volunteers.map(row => ({ ...row, opportunityId: row.volunteerOpportunityId, key: 'volunteer-' + row.volunteerOpportunityId, volunteer: true }))]
      .sort((a, b) => (b.createdAt?.toISOString() ?? '').localeCompare(a.createdAt?.toISOString() ?? '') || b.id - a.id || a.key.localeCompare(b.key))
      .slice(prefix - query.pageSize, prefix);
    const [jobRows, volunteerRows] = await Promise.all([
      database.jobs.findMany({ where: { id: { in: ranked.filter(row => !row.volunteer).map(row => row.opportunityId) } }, select: jobSelect }),
      database.volunteerOpportunities.findMany({ where: { id: { in: ranked.filter(row => row.volunteer).map(row => row.opportunityId) } }, select: volunteerSelect }),
    ]);
    const byKey = new Map<string, SummaryRow>([...jobRows.map(row => ['job-' + row.id, row] as const), ...volunteerRows.map(row => ['volunteer-' + row.id, row] as const)]);
    const now = new Date();
    return { items: ranked.map(row => summary(byKey.get(row.key)!, row.createdAt, now)), total: jobCount + volunteerCount, page: query.page, pageSize: query.pageSize };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
};

/** Repeated PUTs retain the original timestamp, including retries after a vacancy closes. */
export const saveOpportunity = async (key: string, actor: AccessContext): Promise<void> => {
  assertCandidateAccess(actor, PERMISSIONS.SAVED_OPPORTUNITY_UPDATE_OWN);
  const id = Number(key.split('-')[1]);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await prisma.$transaction(async database => {
        const before = key.startsWith('job-')
          ? await database.savedJobs.findUnique({ where: { userId_jobId: { userId: actor.userId, jobId: id } }, select: { id: true } })
          : await database.savedVolunteerOpportunities.findUnique({ where: { userId_volunteerOpportunityId: { userId: actor.userId, volunteerOpportunityId: id } }, select: { id: true } });
        if (before) return;
        await readApplicationOpportunity(key, database, true);
        if (key.startsWith('job-')) await database.savedJobs.upsert({ where: { userId_jobId: { userId: actor.userId, jobId: id } }, update: {}, create: { userId: actor.userId, jobId: id } });
        else await database.savedVolunteerOpportunities.upsert({ where: { userId_volunteerOpportunityId: { userId: actor.userId, volunteerOpportunityId: id } }, update: {}, create: { userId: actor.userId, volunteerOpportunityId: id } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return;
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (['P2034', 'P2002'].includes(error.code) && attempt < 2) continue;
        if (['P2034', 'P2002', 'P2003'].includes(error.code)) throw new AppError(409, 'La vacante cambió durante el guardado. Inténtalo nuevamente.');
      }
      throw error;
    }
  }
};

/** DELETE affects only the session's candidate and remains valid for unavailable or missing records. */
export const removeSavedOpportunity = async (key: string, actor: AccessContext): Promise<void> => {
  assertCandidateAccess(actor, PERMISSIONS.SAVED_OPPORTUNITY_UPDATE_OWN);
  const id = Number(key.split('-')[1]);
  if (key.startsWith('job-')) await prisma.savedJobs.deleteMany({ where: { userId: actor.userId, jobId: id } });
  else await prisma.savedVolunteerOpportunities.deleteMany({ where: { userId: actor.userId, volunteerOpportunityId: id } });
};
