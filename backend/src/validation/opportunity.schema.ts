import { z } from 'zod';
import { vacancyErrorMap } from './vacancy-error-map.js';
import { OPPORTUNITY_KINDS } from '../constants/opportunity.constants.js';
import { paginationShape, requiredText } from './common.schema.js';

/** Numeric references are allowlisted separately from immutable identities. */
const reference = z.number({ errorMap: vacancyErrorMap }).int().positive().max(2_147_483_647).nullable().optional();
/** Optional bounded text; empty strings clear the stored value. */
const optionalText = (length: number) => z.string({ errorMap: vacancyErrorMap }).trim().max(length, `No puede superar ${length} caracteres.`).nullable().optional();
/** Calendar dates require an exact, valid YYYY-MM-DD rather than JavaScript normalization. */
export const closingDateSchema = z.string({ errorMap: vacancyErrorMap }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa una fecha válida.')
  .refine((value) => Number(value.slice(0, 4)) >= 1 && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, 'La fecha no es válida.');
/** Lines are structured, bounded strings; no markup is interpreted. */
const lines = z.array(z.string({ errorMap: vacancyErrorMap }).trim().min(1, 'La línea no puede estar vacía.').max(1000, 'Máximo 1000 caracteres por línea.'), { errorMap: vacancyErrorMap }).max(50, 'Máximo 50 líneas.').optional();
/** Writable fields shared by all four types. */
const fields = {
  title: requiredText('título').trim().min(3, 'El título debe tener al menos 3 caracteres.').max(150, 'Máximo 150 caracteres.'),
  description: z.string({ errorMap: vacancyErrorMap }).trim().max(20_000, 'Máximo 20000 caracteres.').optional(),
  organizationId: reference, categoryId: reference, employmentTypeId: reference, experienceLevelId: reference,
  department: optionalText(100), municipality: optionalText(100),
  modality: z.enum(['ON_SITE', 'REMOTE', 'HYBRID'], { errorMap: vacancyErrorMap }).optional(),
  salaryMin: z.number({ errorMap: vacancyErrorMap }).finite().min(0).max(1_000_000).multipleOf(0.01).nullable().optional(),
  salaryMax: z.number({ errorMap: vacancyErrorMap }).finite().min(0).max(1_000_000).multipleOf(0.01).nullable().optional(),
  slots: z.number({ errorMap: vacancyErrorMap }).int().min(1).max(1_000_000).nullable().optional(),
  socialHours: z.number({ errorMap: vacancyErrorMap }).int().min(1).max(10_000).nullable().optional(),
  duration: optionalText(120), contact: optionalText(255), requirements: lines, responsibilities: lines, benefits: lines,
  expiresAt: closingDateSchema.nullable().optional(),
};
/** Rejects a reversed salary range when both values are present. */
const validSalary = (value: { salaryMin?: number | null; salaryMax?: number | null }) =>
  value.salaryMin == null || value.salaryMax == null || value.salaryMin <= value.salaryMax;
/** Draft creation needs only a title and an explicit type. */
export const createOpportunitySchema = z.object({ ...fields, kind: z.enum(OPPORTUNITY_KINDS, { errorMap: vacancyErrorMap }) }, { errorMap: vacancyErrorMap }).strict('La solicitud incluye campos no permitidos.')
  .refine(validSalary, { path: ['salaryMax'], message: 'El salario máximo debe ser mayor o igual al mínimo.' });
/** Editing cannot change a table discriminator or lifecycle directly. */
export const updateOpportunitySchema = z.object(fields, { errorMap: vacancyErrorMap }).partial().strict('La solicitud incluye campos no permitidos.')
  .refine((value) => Object.keys(value).length > 0, 'Debes enviar al menos un campo.')
  .refine(validSalary, { path: ['salaryMax'], message: 'El salario máximo debe ser mayor o igual al mínimo.' });
/** Status changes have their own grant and publication validation. */
export const opportunityStatusSchema = z.object({ status: z.enum(['OPEN', 'CLOSED'], { errorMap: vacancyErrorMap }) }, { errorMap: vacancyErrorMap }).strict('La solicitud incluye campos no permitidos.');
/** A table prefix prevents collisions between volunteer and job numeric identities. */
export const opportunityKeySchema = z.string({ errorMap: vacancyErrorMap }).regex(/^(job|volunteer)-[1-9]\d*$/, 'La vacante no es válida.')
  .refine((value) => Number(value.split('-')[1]) <= 2_147_483_647, 'La vacante no es válida.');
/** Filters and bounded merge pagination are applied by the database. */
export const listOpportunitiesSchema = z.object({
  ...paginationShape,
  search: z.string({ errorMap: vacancyErrorMap }).trim().max(150).optional(), kind: z.enum(OPPORTUNITY_KINDS, { errorMap: vacancyErrorMap }).optional(),
  categoryId: z.coerce.number({ errorMap: vacancyErrorMap }).int().positive().max(2_147_483_647).optional(),
  organizationId: z.coerce.number({ errorMap: vacancyErrorMap }).int().positive().max(2_147_483_647).optional(),
  status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED'], { errorMap: vacancyErrorMap }).optional(),
  location: z.string({ errorMap: vacancyErrorMap }).trim().max(100).optional(),
  modality: z.enum(['ON_SITE', 'REMOTE', 'HYBRID'], { errorMap: vacancyErrorMap }).optional(),
  salaryMax: z.coerce.number({ errorMap: vacancyErrorMap }).min(0).max(1_000_000).optional(),
}, { errorMap: vacancyErrorMap }).strict('La solicitud incluye campos no permitidos.').refine((value) => value.page * value.pageSize <= 10_000, 'Refina los filtros para consultar más de 10000 resultados.');
/** Inferred DTOs keep controllers and services aligned. */
export type CreateOpportunityDTO = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunityDTO = z.infer<typeof updateOpportunitySchema>;
export type OpportunityQuery = z.infer<typeof listOpportunitiesSchema>;
