/** Stable application states; database catalog labels remain in Spanish. */
export const APPLICATION_STATUS_NAMES = {
  PENDING: 'Pendiente', IN_REVIEW: 'En revisión', SELECTED: 'Seleccionada', REJECTED: 'Rechazada', WITHDRAWN: 'Retirada',
} as const;
export type ApplicationStatus = keyof typeof APPLICATION_STATUS_NAMES;
/** Unknown historical states remain visible without inventing a decision. */
export const applicationStatusFor = (name: string): ApplicationStatus | 'UNKNOWN' =>
  (Object.keys(APPLICATION_STATUS_NAMES) as ApplicationStatus[]).find(key => APPLICATION_STATUS_NAMES[key] === name) ?? 'UNKNOWN';
