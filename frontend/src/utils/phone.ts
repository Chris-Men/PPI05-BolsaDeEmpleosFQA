/** Recognizes full local numbers without dropping an unexpected country code or extra digits. */
export const phoneDigits = (value: string): string | null => {
  const compact = value.trim().replace(/[\s-]/g, '');
  if (/^\d{8}$/.test(compact)) return compact;
  return /^(?:\+503|503)\d{8}$/.test(compact) ? compact.replace(/^\+?503/, '') : null;
};
/** Formatting never silently changes an unrecognized historical value. */
export const formatPhone = (value: string): string => {
  const digits = phoneDigits(value);
  return digits ? '+503 ' + digits.slice(0, 4) + '-' + digits.slice(4) : value;
};
/** Partial local digits belong to the editor, while complete country prefixes may be pasted. */
export const phoneEdit = (value: string): string | null => {
  const full = phoneDigits(value);
  if (full) return full;
  const compact = value.replace(/[\s-]/g, '');
  const local = compact.startsWith('+503') ? compact.slice(4) : compact;
  return /^\d{0,8}$/.test(local) ? local : null;
};
