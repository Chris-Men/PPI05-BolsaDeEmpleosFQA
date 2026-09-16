/** Persisted lifecycle labels; deletion is tracked independently by User.deletedAt. */
export const USER_STATUS_NAMES = { ACTIVE: 'Activo', DISABLED: 'Deshabilitado' } as const;

/** Supported lifecycle codes exposed by the management API. */
export type UserStatusCode = keyof typeof USER_STATUS_NAMES;
