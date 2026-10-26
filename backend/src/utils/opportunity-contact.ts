import { emailSchema } from '../validation/common.schema.js';
import { localPhoneDigits } from './local-phone.js';

/** Separate channels preserve nulls and only recognize an unambiguous historical contact. */
export interface OpportunityContact { contactEmail: string | null; contactPhone: string | null }
/** Legacy free text stays intact; recognizable single-channel values can prefill the new editor. */
export const opportunityContact = (row: { contact: string | null; contactEmail: string | null; contactPhone: string | null }): OpportunityContact => {
  if (row.contactEmail !== null || row.contactPhone !== null) return { contactEmail: row.contactEmail, contactPhone: row.contactPhone };
  const legacy = row.contact?.trim() ?? '';
  const email = emailSchema.safeParse(legacy);
  return { contactEmail: email.success ? email.data : null, contactPhone: localPhoneDigits(legacy) };
};
