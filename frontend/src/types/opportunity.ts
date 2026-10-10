/** Four user-facing opportunity types share one API contract. */
export type OpportunityKind = 'EMPLOYMENT' | 'VOLUNTEER' | 'SOCIAL_HOURS' | 'INTERNSHIP';
/** Catalog identities are numeric references, never hardcoded labels. */
export interface CatalogItem { id: number; name: string }
/** Safe vacancy response contains no candidate or document information. */
export interface Opportunity {
  key: string; id: number; kind: OpportunityKind; title: string; slug: string; description: string;
  organizationId: number | null; organization: (CatalogItem & { description: string | null }) | null;
  categoryId: number | null; category: CatalogItem | null; department: string | null; municipality: string | null;
  modality: 'ON_SITE' | 'REMOTE' | 'HYBRID'; salaryMin: number | null; salaryMax: number | null;
  employmentTypeId: number | null; employmentType: string | null; experienceLevelId: number | null; experienceLevel: string | null;
  slots: number | null; socialHours: number | null; duration: string | null; contact: string | null;
  requirements: string[]; responsibilities: string[]; benefits: string[];
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'ARCHIVED' | 'UNKNOWN'; createdAt: string | null;
  publishedAt: string | null; expiresAt: string | null; archivedAt: string | null;
}
/** Explicit writable values keep metadata and identities out of mutation bodies. */
export interface OpportunityInput {
  title: string; description?: string; organizationId?: number | null; categoryId?: number | null;
  department?: string | null; municipality?: string | null; modality?: Opportunity['modality'];
  employmentTypeId?: number | null; experienceLevelId?: number | null; salaryMin?: number | null; salaryMax?: number | null;
  slots?: number | null; socialHours?: number | null; duration?: string | null; contact?: string | null;
  requirements?: string[]; responsibilities?: string[]; benefits?: string[]; expiresAt?: string | null;
}
/** Server pagination response. */
export interface Page<T> { items: T[]; total: number; page: number; pageSize: number }
/** Server-side vacancy filtering. */
export interface OpportunityFilters { page?: number; pageSize?: number; search?: string; kind?: OpportunityKind; categoryId?: number; organizationId?: number; status?: Opportunity['status']; location?: string; modality?: Opportunity['modality']; salaryMax?: number }
/** Unfiltered public homepage counters, without identities or account details. */
export interface PublicOpportunityStatistics { activeOpportunities: number; organizations: number; candidates: number; impactAxes: number }
/** Category metadata and actual administrative usage. */
export interface Category extends CatalogItem { slug: string; description: string | null; parentId: number | null; isActive: boolean; opportunityCount: number; childCount: number }
/** Writable category values. */
export interface CategoryInput { name: string; description?: string | null; parentId?: number | null; isActive?: boolean }
/** Vacancy editor dictionaries. */
export interface OpportunityCatalogs { categories: Array<CatalogItem & { parentId: number | null; slug: string; description: string | null }>; organizations: CatalogItem[]; employmentTypes: CatalogItem[]; experienceLevels: CatalogItem[] }
/** Spanish labels shared by admin and public presentations. */
export const KIND_LABELS: Record<OpportunityKind, string> = { EMPLOYMENT: 'Empleo', VOLUNTEER: 'Voluntariado', SOCIAL_HOURS: 'Horas sociales', INTERNSHIP: 'Práctica profesional' };
/** Lifecycle labels include unsupported historical records without misclassifying them. */
export const STATUS_LABELS: Record<Opportunity['status'], string> = { DRAFT: 'Borrador', OPEN: 'Publicada', CLOSED: 'Cerrada', ARCHIVED: 'Archivada', UNKNOWN: 'Estado anterior' };
