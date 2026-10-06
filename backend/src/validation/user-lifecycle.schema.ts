import { z } from 'zod';

/** Destructive requests require explicit acknowledgement and reject unrelated fields. */
export const deleteAccountSchema = z.object({
  confirmDeletion: z.literal(true, { errorMap: () => ({ message: 'Confirma la eliminación de la cuenta.' }) }),
}).strict('La solicitud contiene campos no permitidos.');

/** Status changes cannot restore a deleted account or assign any other fields. */
export const changeUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'DISABLED'], { errorMap: () => ({ message: 'El estado no es válido.' }) }),
}).strict('La solicitud contiene campos no permitidos.');

/** Restoration never accepts an alternate email, role or password. */
export const restoreAccountSchema = z.object({}).strict('La solicitud contiene campos no permitidos.');
