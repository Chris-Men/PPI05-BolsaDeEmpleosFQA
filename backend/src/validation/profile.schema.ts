import { z } from 'zod';
import { requiredText } from './common.schema.js';

/** Nullable optional text; empty strings clear optional profile fields. */
const optionalText = (maximum: number) => requiredText('perfil').trim().max(maximum, 'El texto supera la longitud permitida.')
  .transform((value) => value || null).nullable().optional();
const name = requiredText('nombres').trim().min(1, 'Ingresa tu nombre.').max(100, 'Máximo 100 caracteres.');
const date = requiredText('fecha').regex(/^\d{4}-\d{2}-\d{2}$/, 'Ingresa una fecha válida.').refine((value) => {
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Ingresa una fecha válida.');
const dateFields = { startDate: date, endDate: date.nullable() };
/** ISO date strings sort chronologically after calendar validation. */
const validPeriod = (value: { startDate: string; endDate: string | null }) => !value.endDate || value.endDate >= value.startDate;

/** Professional history supports current positions with no end date. */
export const workExperienceSchema = z.object({
  companyName: requiredText('empresa').trim().min(1, 'Ingresa la empresa.').max(150, 'Máximo 150 caracteres.'),
  position: requiredText('cargo').trim().min(1, 'Ingresa el cargo.').max(100, 'Máximo 100 caracteres.'),
  description: optionalText(5000), ...dateFields,
}).strict('Hay campos de experiencia no permitidos.').refine(validPeriod, { path: ['endDate'], message: 'La fecha final no puede preceder a la inicial.' });

/** Education history reuses the existing relational model. */
export const educationSchema = z.object({
  institution: requiredText('institución').trim().min(1, 'Ingresa la institución.').max(150, 'Máximo 150 caracteres.'),
  degree: requiredText('título').trim().min(1, 'Ingresa el título o carrera.').max(150, 'Máximo 150 caracteres.'), ...dateFields,
}).strict('Hay campos de educación no permitidos.').refine(validPeriod, { path: ['endDate'], message: 'La fecha final no puede preceder a la inicial.' });

/** Strict partial profile update; omitted collections are preserved, empty ones are cleared. */
export const updateProfileSchema = z.object({
  firstName: name.optional(), lastName: requiredText('apellidos').trim().max(100, 'Máximo 100 caracteres.').optional(),
  phone: optionalText(30), department: optionalText(100), municipality: optionalText(100),
  profession: optionalText(150), educationLevel: optionalText(100), professionalSummary: optionalText(5000),
  workExperiences: z.array(workExperienceSchema, { invalid_type_error: 'Envía una lista de experiencias.' }).max(50, 'Máximo 50 experiencias.').optional(),
  educations: z.array(educationSchema, { invalid_type_error: 'Envía una lista de estudios.' }).max(50, 'Máximo 50 estudios.').optional(),
  skills: z.array(requiredText('habilidad').trim().min(1, 'Ingresa una habilidad.').max(100, 'Máximo 100 caracteres.'),
    { invalid_type_error: 'Envía una lista de habilidades.' }).max(50, 'Máximo 50 habilidades.').optional(),
}).strict('Hay campos de perfil no permitidos.').refine((value) => Object.keys(value).length > 0, 'Envía al menos un campo para actualizar.');

/** Inferred input contracts avoid duplicating validation definitions. */
export type UpdateProfileDTO = z.infer<typeof updateProfileSchema>;
