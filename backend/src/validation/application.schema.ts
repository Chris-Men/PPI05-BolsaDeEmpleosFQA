import { z } from 'zod';
import { paginationShape } from './common.schema.js';
import { opportunityKeySchema, closingDateSchema } from './opportunity.schema.js';
import { OPPORTUNITY_KINDS } from '../constants/opportunity.constants.js';
/** Partial draft fields allow blanks but enforce the profile's existing length limits. */
export const applicationDataSchema = z.object({
  personal: z.object({
    firstName: z.string().max(100), lastName: z.string().max(100), phone: z.string().max(30),
    department: z.string().max(100), municipality: z.string().max(100),
    profession: z.string().max(150), educationLevel: z.string().max(100),
  }).strict(),
  experience: z.object({
    lastRole: z.string().max(100), lastOrg: z.string().max(150), skills: z.string().max(5000),
    motivation: z.string().max(5000),
  }).strict(),
}).strict();
/** Final submission checks are separate from incomplete autosave validation. */
export const finalApplicationDataSchema = applicationDataSchema.superRefine((value, context) => {
  for (const field of ['firstName', 'lastName', 'phone'] as const) {
    if (!value.personal[field].trim()) context.addIssue({ code: 'custom', path: ['personal', field], message: 'Completa este campo.' });
  }
  if (!value.experience.motivation.trim()) context.addIssue({ code: 'custom', path: ['experience', 'motivation'], message: 'Escribe tu motivación.' });
});
export const createDraftSchema = z.object({ opportunityKey: opportunityKeySchema }).strict();
export const updateDraftSchema = z.object({
  version: z.number().int().positive(), currentStep: z.number().int().min(1).max(4),
  data: applicationDataSchema, resumeId: z.number().int().positive().nullable(),
}).strict();
export const submitApplicationSchema = z.object({ draftId: z.string().uuid(), version: z.number().int().positive() }).strict();
export const applicationDecisionSchema = z.object({
  version: z.number().int().positive(),
  status: z.enum(['IN_REVIEW', 'SELECTED', 'REJECTED']),
  reason: z.string().trim().max(2000).optional(),
}).strict();
export const applicationWithdrawSchema = z.object({ version: z.number().int().positive() }).strict();
export const applicationFiltersSchema = z.object({
  ...paginationShape, kind: z.enum(OPPORTUNITY_KINDS).optional(),
  status: z.enum(['PENDING','IN_REVIEW','SELECTED','REJECTED','WITHDRAWN']).optional(),
  opportunityKey: opportunityKeySchema.optional(), search: z.string().trim().max(150).optional(),
  organizationId: z.coerce.number().int().positive().optional(),
  candidateId: z.coerce.number().int().positive().optional(),
  from: closingDateSchema.optional(), to: closingDateSchema.optional(),
}).strict().refine(value => !value.from || !value.to || value.from <= value.to, 'El intervalo de fechas no es válido.');
export const notificationFiltersSchema = z.object({ ...paginationShape, unread: z.enum(['true','false']).optional() }).strict();
export type ApplicationData = z.infer<typeof applicationDataSchema>;
export type ApplicationFilters = z.infer<typeof applicationFiltersSchema>;
export type UpdateDraft = z.infer<typeof updateDraftSchema>;
export type ApplicationDecision = z.infer<typeof applicationDecisionSchema>;
