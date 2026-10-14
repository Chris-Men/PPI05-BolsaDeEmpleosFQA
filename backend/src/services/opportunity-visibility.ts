import { OPPORTUNITY_STATUS_NAMES, type OpportunityStatus } from '../constants/opportunity.constants.js';
import { ORGANIZATION_STATUS_NAMES } from '../constants/organization.constants.js';

/** Minimum projection needed for public eligibility, shared by listings, applications and bookmarks. */
interface OpportunityVisibility {
  archivedAt: Date | null;
  publishedAt: Date | null;
  expiresAt: Date | null;
  organizations: { organizationStatuses: { name: string } } | null;
  jobCategories: { isActive: boolean } | null;
  jobStatuses?: { name: string };
  volunteerStatuses?: { name: string };
}

/** Unknown historical labels never become published opportunities. */
export const opportunityStatusCode = (name: string): OpportunityStatus | 'UNKNOWN' =>
  (Object.keys(OPPORTUNITY_STATUS_NAMES) as OpportunityStatus[]).find(key => OPPORTUNITY_STATUS_NAMES[key] === name) ?? 'UNKNOWN';

/** Shared SQL predicates for both opportunity sources; callers add their source's OPEN state. */
export const publicOpportunityWhere = (now: Date) => ({
  archivedAt: null, publishedAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  organizations: { organizationStatuses: { name: ORGANIZATION_STATUS_NAMES.ACTIVE } },
  jobCategories: { isActive: true },
});

/** Evaluates the same eligibility for a previously selected record at one consistent instant. */
export const isOpportunityAvailable = (row: OpportunityVisibility, now = new Date()): boolean =>
  (row.jobStatuses?.name ?? row.volunteerStatuses?.name) === OPPORTUNITY_STATUS_NAMES.OPEN &&
  row.archivedAt === null && row.publishedAt !== null && row.publishedAt <= now &&
  (row.expiresAt === null || row.expiresAt > now) &&
  row.organizations?.organizationStatuses.name === ORGANIZATION_STATUS_NAMES.ACTIVE && row.jobCategories?.isActive === true;
