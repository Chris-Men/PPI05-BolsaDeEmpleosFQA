/** Public discriminators never depend on catalog numeric identities. */
export const OPPORTUNITY_KINDS = ['EMPLOYMENT', 'VOLUNTEER', 'SOCIAL_HOURS', 'INTERNSHIP'] as const;
/** Persisted lifecycle labels shared by both opportunity tables. */
export const OPPORTUNITY_STATUS_NAMES = { DRAFT: 'Borrador', OPEN: 'Publicada', CLOSED: 'Cerrada', ARCHIVED: 'Archivada' } as const;
/** Supported opportunity discriminator. */
export type OpportunityType = typeof OPPORTUNITY_KINDS[number];
/** Stable lifecycle code exposed by the API. */
export type OpportunityStatus = keyof typeof OPPORTUNITY_STATUS_NAMES;
