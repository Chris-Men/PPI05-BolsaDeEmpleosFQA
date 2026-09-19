import { z } from 'zod';
import { emailSchema, paginationShape, requiredText } from './common.schema.js';

/** Only canonical organization states can be supplied through this API. */
const statusSchema = z.enum(['ACTIVE', 'INACTIVE'], {
  errorMap: () => ({ message: 'El estado de la organización no es válido.' }),
});

/** Writable contact fields; creation always chooses the active state in the service. */
export const createOrganizationSchema = z.object({
  name: requiredText('nombre').trim().min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(150, 'El nombre no puede superar los 150 caracteres.'),
  description: requiredText('descripción').trim()
    .max(5_000, 'La descripción no puede superar los 5000 caracteres.')
    .transform((value) => value || null).nullable().optional(),
  email: emailSchema.nullable().optional(),
}, {
  required_error: 'El cuerpo de la solicitud es obligatorio.',
  invalid_type_error: 'El cuerpo de la solicitud debe ser un objeto JSON.',
}).strict('La solicitud contiene campos no permitidos.');

/** Omitted fields stay unchanged; explicit null clears optional contact data. */
export const updateOrganizationSchema = createOrganizationSchema.partial()
  .refine((value) => Object.values(value).some((field) => field !== undefined),
    'Incluye al menos un campo para actualizar.');

/** State transitions remain separate from general editing. */
export const changeOrganizationStatusSchema = z.object({ status: statusSchema }, {
  required_error: 'El cuerpo de la solicitud es obligatorio.',
  invalid_type_error: 'El cuerpo de la solicitud debe ser un objeto JSON.',
})
  .strict('La solicitud contiene campos no permitidos.');

/** Administrative listing includes both states unless the caller filters explicitly. */
export const listOrganizationsSchema = z.object({
  search: requiredText('búsqueda').trim().max(255, 'La búsqueda es demasiado larga.').optional(),
  status: statusSchema.optional(),
  ...paginationShape,
}).strict('La consulta contiene filtros no permitidos.');

/** Validated organization creation payload. */
export type CreateOrganizationDTO = z.infer<typeof createOrganizationSchema>;
/** Validated partial organization update. */
export type UpdateOrganizationDTO = z.infer<typeof updateOrganizationSchema>;
/** Validated organization state transition. */
export type ChangeOrganizationStatusDTO = z.infer<typeof changeOrganizationStatusSchema>;
/** Normalized listing filters and pagination. */
export type ListOrganizationsQuery = z.infer<typeof listOrganizationsSchema>;
