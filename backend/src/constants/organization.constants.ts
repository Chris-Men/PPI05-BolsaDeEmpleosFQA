/** Persisted organization states, independent of account lifecycle states. */
export const ORGANIZATION_STATUS_NAMES = { ACTIVE: 'Activo', INACTIVE: 'Inactivo' } as const;

/** Stable organization lifecycle codes exposed by the API. */
export type OrganizationStatusCode = keyof typeof ORGANIZATION_STATUS_NAMES;
