import { z } from 'zod';
import { paginationShape, requiredText } from './common.schema.js';
import { opportunityKeySchema, closingDateSchema } from './opportunity.schema.js';
import { OPPORTUNITY_KINDS } from '../constants/opportunity.constants.js';
import { birthDateSchema, candidateNameSchema, candidatePhoneSchema, departmentSchema, educationLevelSchema, sexSchema, validateCandidateLocation } from './candidate.schema.js';
/** Autosave checks shape and bounded text without rejecting unfinished edits. */
const draftText = (label: string, maximum: number) => requiredText(label).max(maximum, `Máximo ${maximum} caracteres.`);
/** Partial draft fields allow blanks but enforce the profile's existing length limits. */
export const applicationDataSchema = z.object({
  personal: z.object({
    firstName: draftText('nombres', 100), lastName: draftText('apellidos', 100), phone: draftText('teléfono', 30),
    birthDate: draftText('fecha de nacimiento', 10).default(''), sex: draftText('sexo', 30).default(''),
    department: draftText('departamento', 100), municipality: draftText('municipio', 100),
    profession: draftText('profesión', 150), educationLevel: draftText('nivel educativo', 100),
  }).strict('Hay campos personales no permitidos.'),
  experience: z.object({
    lastRole: draftText('último cargo', 100), lastOrg: draftText('organización anterior', 150), skills: draftText('habilidades', 5000),
    motivation: draftText('motivación', 5000),
  }).strict('Hay campos de experiencia no permitidos.'),
}).strict('Hay campos de postulación no permitidos.');
/** Final submission checks are separate from incomplete autosave validation. */
export const finalApplicationDataSchema = applicationDataSchema.extend({
  personal: z.object({
    firstName: candidateNameSchema, lastName: candidateNameSchema, phone: candidatePhoneSchema,
    birthDate: birthDateSchema, sex: sexSchema, department: departmentSchema,
    municipality: draftText('municipio', 100).trim().min(1, 'Selecciona un municipio.'),
    profession: draftText('profesión', 150).trim(), educationLevel: educationLevelSchema,
  }).strict('Hay campos personales no permitidos.').superRefine(validateCandidateLocation),
  experience: applicationDataSchema.shape.experience.extend({ motivation: draftText('motivación', 5000).trim().min(1, 'Escribe tu motivación.') }),
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
