/** Name fields stored by the existing profile schema. */
export interface ProfileName {
  firstName: string;
  lastName: string;
}

/** Preserves the fullName contract, using the final word as surname when present. */
export const splitProfileName = (fullName: string): ProfileName => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  const lastName = parts.pop() ?? '';
  return { firstName: parts.join(' '), lastName };
};
