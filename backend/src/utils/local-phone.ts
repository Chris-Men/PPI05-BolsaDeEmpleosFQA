/** Accepts Salvadoran presentation without stripping unexpected text or country codes. */
export const localPhoneDigits = (value: string): string | null => {
  const compact = value.trim().replace(/[\s-]/g, '');
  if (/^\d{8}$/.test(compact)) return compact;
  if (/^(?:\+503|503)\d{8}$/.test(compact)) return compact.replace(/^\+?503/, '');
  return null;
};
