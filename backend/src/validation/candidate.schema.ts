import { z } from 'zod';
import { EDUCATION_LEVELS, LOCATION_ZONES, SEX_VALUES, municipalitiesOf } from '../constants/candidate-catalogs.constants.js';
import { requiredText } from './common.schema.js';
import { localPhoneDigits } from '../utils/local-phone.js';

/** Normalizes presentation spaces without changing a candidate's spelling. */
export const candidateNameSchema = requiredText('nombre').trim().transform(value => value.replace(/\s+/g, ' '))
  .pipe(z.string().min(1, 'Completa este campo.').max(100, 'Máximo 100 caracteres.')
    .regex(/^[\p{L}\p{M} .’'-]+$/u, 'Usa letras, espacios, apóstrofes, puntos o guiones.')
    .refine(value => /\p{L}/u.test(value), 'Ingresa al menos una letra.'));

/** Local phone inputs accept presentation separators and an optional country prefix. */
export const candidatePhoneSchema = requiredText('teléfono').trim().max(30, 'Máximo 30 caracteres.')
  .refine(value => localPhoneDigits(value) !== null, 'Ingresa un teléfono de ocho dígitos con prefijo +503.')
  .transform(value => localPhoneDigits(value)!);

/** Round-trip validation rejects impossible calendar dates, including leap-day overflow. */
export const calendarDateSchema = requiredText('fecha').regex(/^\d{4}-\d{2}-\d{2}$/, 'Ingresa una fecha válida.')
  .refine(value => {
    const parsed = new Date(value + 'T00:00:00Z');
    return Number(value.slice(0, 4)) > 0 && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Ingresa una fecha válida.');

/** Calendar comparison uses the site's timezone rather than the server's midnight. */
export const isAtLeastSixteen = (value: string, now = new Date()): boolean => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const cutoff = String(Number(today.slice(0, 4)) - 16).padStart(4, '0') + today.slice(4);
  return value <= cutoff;
};
export const birthDateSchema = calendarDateSchema.refine(value => isAtLeastSixteen(value), 'Debes tener al menos 16 años cumplidos.');
export const sexSchema = z.enum(SEX_VALUES, { errorMap: () => ({ message: 'Selecciona una opción de sexo.' }) });
export const educationLevelSchema = z.enum(EDUCATION_LEVELS, { errorMap: () => ({ message: 'Selecciona un nivel educativo válido.' }) });
export const departmentSchema = requiredText('departamento').trim().refine(value =>
  LOCATION_ZONES.some(zone => zone.departments.some(item => item.name === value)), 'Selecciona un departamento válido.');

/** A department may be pending a municipality in a profile, but mismatched pairs never persist. */
export const validateCandidateLocation = (value: { department?: string | null; municipality?: string | null }, context: z.RefinementCtx): void => {
  if (value.municipality && (!value.department || !municipalitiesOf(value.department).includes(value.municipality))) {
    context.addIssue({ code: 'custom', path: ['municipality'], message: 'Selecciona un municipio del departamento elegido.' });
  }
};
