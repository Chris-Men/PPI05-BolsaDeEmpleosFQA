import { z } from 'zod';
import { registerCandidateSchema } from './auth.schema.js';

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
  search: z.string().trim().max(255, 'La búsqueda es demasiado larga.').optional(),
  role: z.enum(['CANDIDATE', 'ADMINISTRATOR', 'SUPER_ADMIN'],
    { errorMap: () => ({ message: 'El filtro de rol no es válido.' }) }).optional(),
  status: z.enum(['ACTIVE', 'DISABLED'],
    { errorMap: () => ({ message: 'El filtro de estado no es válido.' }) }).optional(),
  page: z.coerce.number().int('La página debe ser un entero.').min(1, 'La página mínima es 1.')
    .max(1_000_000, 'La página es demasiado grande.').default(1),
  pageSize: z.coerce.number().int('El tamaño debe ser un entero.').min(1, 'El tamaño mínimo es 1.')
    .max(100, 'El máximo por página es 100.').default(20),
}).strict('La consulta contiene filtros no permitidos.');

/** Validates a PostgreSQL integer identity before querying. */
export const userIdSchema = z.string().regex(/^[1-9]\d*$/, 'El identificador no es válido.')
  .transform(Number).refine((value) => value <= 2_147_483_647, 'El identificador no es válido.');

/** Validated create payload. */
export type CreateUserDTO = z.infer<typeof createUserSchema>;
/** Validated patch payload. */
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
/** Normalized pagination and filters. */
export type ListUsersQuery = z.infer<typeof listUsersSchema>;
