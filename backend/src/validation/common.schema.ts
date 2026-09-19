import { z } from 'zod';

/** Builds a text field with localized missing/type validation messages. */
export const requiredText = (label: string): z.ZodString => z.string({
  required_error: 'El campo ' + label + ' es obligatorio.',
  invalid_type_error: 'El campo ' + label + ' debe ser texto.',
});

/** Shared contact-address validation; uniqueness belongs to each resource's service. */
export const emailSchema = requiredText('correo').trim().toLowerCase()
  .max(255, 'El correo electrónico no puede superar los 255 caracteres.')
  .email('El correo electrónico no es válido.');

/** Validates a PostgreSQL integer identity before querying. */
export const entityIdSchema = z.string().regex(/^[1-9]\d*$/, 'El identificador no es válido.')
  .transform(Number).refine((value) => value <= 2_147_483_647, 'El identificador no es válido.');

/** Bounded pagination shared by administrative listings. */
export const paginationShape = {
  page: z.coerce.number({ invalid_type_error: 'La página debe ser un número.' }).int('La página debe ser un entero.').min(1, 'La página mínima es 1.')
    .max(1_000_000, 'La página es demasiado grande.').default(1),
  pageSize: z.coerce.number({ invalid_type_error: 'El tamaño debe ser un número.' }).int('El tamaño debe ser un entero.').min(1, 'El tamaño mínimo es 1.')
    .max(100, 'El máximo por página es 100.').default(20),
};
