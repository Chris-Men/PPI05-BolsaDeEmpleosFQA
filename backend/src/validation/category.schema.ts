import { z } from 'zod';
import { vacancyErrorMap } from './vacancy-error-map.js';
import { paginationShape, requiredText } from './common.schema.js';
/** Explicit category payload; slugs and usage counts belong to the backend. */
export const createCategorySchema = z.object({
  name: requiredText('nombre').trim().min(2, 'Mínimo 2 caracteres.').max(100, 'Máximo 100 caracteres.')
    .refine((value) => /[\p{L}\p{N}]/u.test(value), 'El nombre debe contener letras o números.'),
  description: z.string({ errorMap: vacancyErrorMap }).trim().max(1000, 'Máximo 1000 caracteres.').nullable().optional(),
  parentId: z.number({ errorMap: vacancyErrorMap }).int().positive().max(2_147_483_647).nullable().optional(),
  isActive: z.boolean({ errorMap: vacancyErrorMap }).optional(),
}, { errorMap: vacancyErrorMap }).strict('La solicitud incluye campos no permitidos.');
/** Omitted values are preserved, including hierarchy and availability. */
export const updateCategorySchema = createCategorySchema.partial().refine((value) => Object.keys(value).length > 0, 'Debes enviar al menos un campo.');
/** Public callers receive only active categories; admin state filters are explicit. */
export const listCategoriesSchema = z.object({
  ...paginationShape, search: z.string({ errorMap: vacancyErrorMap }).trim().max(100).optional(),
  state: z.enum(['ACTIVE', 'INACTIVE'], { errorMap: vacancyErrorMap }).optional(),
}, { errorMap: vacancyErrorMap }).strict('La solicitud incluye campos no permitidos.');
/** Inferred category transport contracts. */
export type CreateCategoryDTO = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDTO = z.infer<typeof updateCategorySchema>;
export type CategoryQuery = z.infer<typeof listCategoriesSchema>;
