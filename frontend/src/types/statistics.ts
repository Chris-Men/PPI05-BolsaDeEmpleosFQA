import type { Opportunity, OpportunityKind } from './opportunity';
import type { ApplicationStatus } from './application';

/** Inclusive calendar range in the site's timezone. */
export interface StatisticsRange { from: string; to: string }
/** Every number is an unpaginated server aggregate. */
export interface AdministrativeStatistics {
  range: StatisticsRange & { timeZone: string };
  publishedOpportunities: number; organizations: number; applications: number; applicants: number;
  byKind: Array<{ kind: OpportunityKind; count: number }>;
  states: Array<{ status: ApplicationStatus; count: number }>;
  activeOpportunities: number; applicationsPerOpportunity: number; selectionRate: number;
}
/** Safe recent summaries contain counts rather than candidate identities. */
export interface DashboardStatistics {
  opportunities: number; organizations: number; applications: number; withResume: number; applicants: number;
  recentOpportunities: Array<{ key: string; title: string; organization: string; kind: OpportunityKind; status: Opportunity['status']; createdAt: string | null; candidates: number }>;
}
