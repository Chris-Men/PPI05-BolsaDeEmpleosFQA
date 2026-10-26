import type { ApplicationData } from '../types/application';
import type { CandidateCatalogs, CandidateProfileData, ProfileUpdate } from '../types/profile';
import { municipalitiesOf } from './elSalvadorLocations';
import { siteToday } from './statisticsDates';
import { phoneDigits } from './phone';

/** Personal fields share labels, bounds and validation across both candidate editors. */
export const PERSONAL_LABELS = {
  firstName: 'Nombres', lastName: 'Apellidos', phone: 'Teléfono', birthDate: 'Fecha de nacimiento', sex: 'Sexo',
  department: 'Departamento', municipality: 'Municipio', profession: 'Profesión', educationLevel: 'Nivel educativo',
} as const;
export type PersonalField = keyof typeof PERSONAL_LABELS;
export type PersonalValues = Record<PersonalField, string | null>;
export type FieldErrors = Record<string, string>;
export const PERSONAL_LIMITS: Record<PersonalField, number> = {
  firstName: 100, lastName: 100, phone: 30, birthDate: 10, sex: 30, department: 100, municipality: 100, profession: 150, educationLevel: 100,
};

/** Date-only strings are validated without browser timezone conversion. */
export const isCalendarDate = (value: string): boolean => {
  const parsed = new Date(value + 'T00:00:00Z');
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) > 0 && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
/** Sixteen completed years are calculated against the Salvadoran calendar. */
export const latestBirthDate = (now = new Date()): string => {
  const today = siteToday(now);
  return String(Number(today.slice(0, 4)) - 16).padStart(4, '0') + today.slice(4);
};
/** Only recognized local numbers are normalized; invalid edits remain visible for correction. */
export const normalizeCandidatePhone = (value: string): string => {
  return phoneDigits(value) ?? value.trim();
};

/** Optional profile fields and required submission fields use identical content rules. */
export const validatePersonal = (values: PersonalValues, catalogs: CandidateCatalogs | null, required: boolean, now = new Date()): FieldErrors => {
  const errors: FieldErrors = {};
  for (const field of Object.keys(PERSONAL_LABELS) as PersonalField[]) {
    const rawValue = values[field]?.trim() ?? '';
    const value = field === 'firstName' || field === 'lastName' ? rawValue.replace(/\s+/g, ' ') : rawValue;
    if (!value) {
      if (field === 'firstName' || (required && field !== 'profession')) errors[field] = 'Completa este campo.';
      continue;
    }
    if (value.length > PERSONAL_LIMITS[field]) { errors[field] = `Máximo ${PERSONAL_LIMITS[field]} caracteres.`; continue; }
    if (field === 'firstName' || field === 'lastName') {
      if (!/^[\p{L}\p{M} .’'-]+$/u.test(value) || !/\p{L}/u.test(value)) errors[field] = 'Usa letras, espacios, apóstrofes, puntos o guiones.';
    } else if (field === 'phone' && !/^\d{8}$/.test(normalizeCandidatePhone(value))) errors[field] = 'Ingresa un teléfono de ocho dígitos; puedes usar +503.';
    else if (field === 'birthDate') {
      if (!isCalendarDate(value)) errors[field] = 'Ingresa una fecha válida.';
      else if (value > latestBirthDate(now)) errors[field] = 'Debes tener al menos 16 años cumplidos.';
    } else if (['sex', 'department', 'municipality', 'educationLevel'].includes(field)) {
      if (!catalogs) { errors[field] = 'Espera a que carguen las opciones o reintenta.'; continue; }
      if (field === 'sex' && !catalogs.sexes.some(item => item.value === values[field])) errors[field] = 'Selecciona una opción de sexo.';
      if (field === 'department' && !catalogs.locationZones.some(zone => zone.departments.some(item => item.name === values[field]))) errors[field] = 'Selecciona un departamento válido.';
      if (field === 'municipality' && !municipalitiesOf(values.department ?? '', catalogs.locationZones).includes(values[field] ?? '')) errors[field] = 'Selecciona un municipio del departamento elegido.';
      if (field === 'educationLevel' && !catalogs.educationLevels.includes(values[field] ?? '')) errors[field] = 'Selecciona un nivel educativo válido.';
    }
  }
  return errors;
};

/** Computes a partial PATCH so untouched historical values are not resubmitted or revalidated. */
export const changedProfileFields = (before: CandidateProfileData, after: CandidateProfileData): ProfileUpdate => {
  const entries = Object.entries(after).filter(([key, value]) => key !== 'email' && JSON.stringify(value) !== JSON.stringify(before[key as keyof CandidateProfileData]));
  return Object.fromEntries(entries.map(([key, value]) => {
    if (typeof value === 'string') {
      if (key === 'firstName' || key === 'lastName') value = value.trim().replace(/\s+/g, ' ');
      else if (key === 'phone') value = normalizeCandidatePhone(value) || null;
      else value = value.trim() || null;
    }
    return [key, value];
  })) as ProfileUpdate;
};

/** Validates only changed profile fields, plus dependent location and submitted history entries. */
export const validateProfileChanges = (before: CandidateProfileData, after: CandidateProfileData, catalogs: CandidateCatalogs | null): FieldErrors => {
  const patch = changedProfileFields(before, after);
  const personal = validatePersonal(after, catalogs, false);
  const errors: FieldErrors = Object.fromEntries(Object.entries(personal).filter(([key]) => Object.hasOwn(patch, key) || (key === 'municipality' && Object.hasOwn(patch, 'department'))));
  if (patch.professionalSummary && patch.professionalSummary.trim().length > 5000) errors.professionalSummary = 'Máximo 5000 caracteres.';
  for (const collection of ['workExperiences', 'educations'] as const) {
    const items = patch[collection]; if (!items) continue;
    if (items.length > 50) errors[collection] = 'Máximo 50 registros.';
    items.forEach((item, index) => {
      const fields = collection === 'workExperiences' ? { companyName: 150, position: 100 } : { institution: 150, degree: 150 };
      for (const [key, maximum] of Object.entries(fields)) {
        const value = String(item[key as keyof typeof item] ?? '').trim();
        if (!value) errors[`${collection}.${index}.${key}`] = 'Completa este campo.';
        else if (value.length > maximum) errors[`${collection}.${index}.${key}`] = `Máximo ${maximum} caracteres.`;
      }
      for (const field of ['startDate', 'endDate'] as const) {
        const value = item[field];
        if ((field === 'startDate' || value) && !isCalendarDate(value ?? '')) errors[`${collection}.${index}.${field}`] = 'Ingresa una fecha válida.';
      }
      if (item.endDate && isCalendarDate(item.startDate) && isCalendarDate(item.endDate) && item.endDate < item.startDate) errors[`${collection}.${index}.endDate`] = 'La fecha final no puede preceder a la inicial.';
      if ('description' in item && item.description && item.description.trim().length > 5000) errors[`${collection}.${index}.description`] = 'Máximo 5000 caracteres.';
    });
  }
  if (patch.skills) {
    if (patch.skills.length > 50) errors.skills = 'Máximo 50 habilidades.';
    patch.skills.forEach((value, index) => {
      if (!value.trim() || value.trim().length > 100) errors[`skills.${index}`] = 'Cada habilidad debe tener entre 1 y 100 caracteres.';
    });
  }
  return errors;
};

/** Step validation is stricter than autosave and can also validate the whole form before sending. */
export const validateApplicationFields = (data: ApplicationData, catalogs: CandidateCatalogs | null, step: number, resumeId: number | null, resumeRequired: boolean): FieldErrors => {
  const errors: FieldErrors = {};
  if (step === 1 || step === 4) for (const [key, message] of Object.entries(validatePersonal(data.personal, catalogs, true))) errors['personal.' + key] = message;
  if (step === 2 || step === 4) {
    for (const [key, maximum] of Object.entries({ lastRole: 100, lastOrg: 150, skills: 5000, motivation: 5000 })) {
      if (data.experience[key as keyof ApplicationData['experience']].length > maximum) errors['experience.' + key] = `Máximo ${maximum} caracteres.`;
    }
    if (!data.experience.motivation.trim()) errors['experience.motivation'] = 'Escribe tu motivación.';
  }
  if ((step === 3 || step === 4) && resumeRequired && !resumeId) errors.resumeId = 'Esta vacante requiere un CV.';
  return errors;
};

/** Waits for React to render field messages before focusing their first editable control. */
export const focusFirstInvalid = (container: HTMLElement | null): void => {
  requestAnimationFrame(() => container?.querySelector<HTMLElement>('[aria-invalid="true"]:not(:disabled)')?.focus());
};
/** Date-only display avoids shifting birthdays to the previous day in negative UTC offsets. */
export const formatBirthDate = (value: string | null): string => value && isCalendarDate(value)
  ? value.slice(8, 10) + '/' + value.slice(5, 7) + '/' + value.slice(0, 4) : value || 'Sin especificar';
/** Presentation labels also support immutable application details viewed by administrators. */
export const formatSex = (value: string | null): string => {
  const labels: Record<string, string> = { FEMALE: 'Femenino', MALE: 'Masculino', UNDISCLOSED: 'Prefiero no indicar' };
  return value ? labels[value] ?? value : 'Sin especificar';
};
