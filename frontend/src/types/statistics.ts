import type { Opportunity, OpportunityKind } from './opportunity';
import type { ApplicationStatus } from './application';

/** Inclusive calendar range in the site's timezone. */
export interface StatisticsRange { from: string; to: string }
/** Every distribution includes unknown values in its population denominator. */
export interface DistributionRow { key: string; label: string; count: number }
/** Publication and application counts use independent dates within the same applied range. */
export interface CategoryStatistics { categoryId: number | null; name: string; publishedOpportunities: number; applications: number }
/** Current active candidate roster, independently of the queried activity period. */
export interface CandidateDemographics {
  totalCandidates: number; asOfDate: string; timeZone: string;
  byAge: DistributionRow[]; bySex: DistributionRow[]; byEducationLevel: DistributionRow[]; byDepartment: DistributionRow[];
}
/** Every number is an unpaginated server aggregate. */
export interface AdministrativeStatistics {
  range: StatisticsRange & { timeZone: string; firstActivityDate: string };
  publishedOpportunities: number; organizations: number; applications: number; applicants: number;
  byKind: Array<{ kind: OpportunityKind; count: number }>;
  states: Array<{ status: ApplicationStatus; count: number }>;
  activeOpportunities: number; applicationsPerOpportunity: number; selectionRate: number;
  opportunitiesWithApplications: number; pendingApplications: number;
  byCategory: CategoryStatistics[]; demographics: CandidateDemographics;
  /** Total and lifetime selections count active, non-deleted candidates with no administrative roles. */
  users: { total: number; candidates: number; selected: number; selectionRate: number; newCandidates: number; withResume: number };
}
/** Safe recent summaries contain counts rather than candidate identities. */
export interface DashboardStatistics {
  opportunities: number; organizations: number; applications: number; withResume: number; applicants: number;
  recentOpportunities: Array<{ key: string; title: string; organization: string; kind: OpportunityKind; status: Opportunity['status']; createdAt: string | null; candidates: number }>;
}
