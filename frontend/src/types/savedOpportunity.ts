import type { CatalogItem, Opportunity, OpportunityKind, Page } from './opportunity';

/** Safe bookmark summary remains visible even when its vacancy is no longer public. */
export interface SavedOpportunity {
  key: string; kind: OpportunityKind; title: string;
  organization: CatalogItem | null; category: CatalogItem | null;
  department: string | null; municipality: string | null;
  status: Opportunity['status']; savedAt: string | null; available: boolean;
}
/** Complete account-scoped identity set powers all visible buttons and the server total. */
export interface SavedOpportunityKeys { keys: string[]; total: number }
export type SavedOpportunityPage = Page<SavedOpportunity>;
