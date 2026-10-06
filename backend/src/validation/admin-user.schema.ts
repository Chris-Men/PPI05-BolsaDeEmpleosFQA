import { z } from 'zod';
import { registerCandidateSchema } from './auth.schema.js';
import { entityIdSchema, paginationShape } from './common.schema.js';

/** Only these roles can be assigned through the management interface. */
const assignableRole = z.enum(['CANDIDATE', 'ADMINISTRATOR'], {
  errorMap: () => ({ message: 'Selecciona Candidato o Administrador.' }),
});

/** Reuses public identity/password constraints without allowing session or lifecycle fields. */
export const createUserSchema = registerCandidateSchema.extend({ role: assignableRole });

/** Partial profile/role update; passwords, state, deletion and permissions are forbidden. */
export const updateUserSchema = registerCandidateSchema
  .pick({ fullName: true, email: true }).extend({ role: assignableRole }).partial()
  .strict('La solicitud contiene campos no permitidos.')
  .refine((value) => Object.keys(value).length > 0, 'Incluye al menos un campo para actualizar.');

/** Bounded pagination and explicit supported filters. */
export const listUsersSchema = z.object({
  deleted: z.enum(['true', 'false']).default('false'),
  search: z.string().trim().max(255, 'La búsqueda es demasiado larga.').optional(),
  role: z.enum(['CANDIDATE', 'ADMINISTRATOR', 'SUPER_ADMIN'],
    { errorMap: () => ({ message: 'El filtro de rol no es válido.' }) }).optional(),
  status: z.enum(['ACTIVE', 'DISABLED'],
    { errorMap: () => ({ message: 'El filtro de estado no es válido.' }) }).optional(),
  ...paginationShape,
}).strict('La consulta contiene filtros no permitidos.');

/** Validates a PostgreSQL integer identity before querying. */
export const userIdSchema = entityIdSchema;

/** Validated create payload. */
export type CreateUserDTO = z.infer<typeof createUserSchema>;
/** Validated patch payload. */
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
/** Normalized pagination and filters. */
export type ListUsersQuery = z.infer<typeof listUsersSchema>;
