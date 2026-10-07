import type { ZodErrorMap } from 'zod';
/** Localized defaults for numeric references, enums, arrays and unknown fields in vacancy contracts. */
export const vacancyErrorMap: ZodErrorMap = (issue) => {
  if (issue.code === 'invalid_type') return { message: issue.received === 'undefined' ? 'El campo es obligatorio.' : 'El tipo de dato no es válido.' };
  if (issue.code === 'invalid_enum_value') return { message: 'Selecciona una opción válida.' };
  if (issue.code === 'unrecognized_keys') return { message: 'La solicitud incluye campos no permitidos.' };
  if (issue.code === 'too_small') return { message: `El valor mínimo permitido es ${issue.minimum}.` };
  if (issue.code === 'too_big') return { message: `El valor máximo permitido es ${issue.maximum}.` };
  if (issue.code === 'not_multiple_of') return { message: 'Usa un importe con un máximo de dos decimales.' };
  return { message: 'El valor no es válido.' };
};
