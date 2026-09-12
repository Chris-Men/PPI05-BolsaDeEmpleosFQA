import { z } from 'zod';

/** Builds a required text field with localized missing/type validation messages. */
const requiredText = (label: string): z.ZodString =>
  z.string({
    required_error: `El campo ${label} es obligatorio.`,
    invalid_type_error: `El campo ${label} debe ser texto.`,
  });

/** Strict public registration contract; privilege fields are never accepted. */
export const registerCandidateSchema = z
  .object(
    {
      fullName: requiredText('nombre completo')
        .trim()
        .min(2, 'El nombre completo debe tener al menos 2 caracteres.')
        .max(150, 'El nombre completo no puede superar los 150 caracteres.'),
      email: requiredText('correo')
        .trim()
        .toLowerCase()
        .email('El correo electrónico no es válido.'),
      password: requiredText('contraseña')
        .refine(
          (value) => Array.from(value).length >= 12,
          'La contraseña debe tener al menos 12 caracteres.',
        )
        .refine(
          (value) => Buffer.byteLength(value, 'utf8') <= 72,
          'La contraseña no puede superar los 72 bytes en UTF-8.',
        ),
    },
    {
      required_error: 'El cuerpo de la solicitud es obligatorio.',
      invalid_type_error: 'El cuerpo de la solicitud debe ser un objeto JSON.',
    },
  )
  .strict('La solicitud contiene campos no permitidos.');

/** Input inferred from the validated registration contract. */
export type RegisterCandidateDTO = z.infer<typeof registerCandidateSchema>;
