import type { OpportunityInput, OpportunityKind } from '../types/opportunity';
import { isCalendarDate } from './candidateValidation';
import { siteToday } from './statisticsDates';
import { emailError } from '../validation/fields';
import { phoneDigits } from './phone';

export type OpportunityValues = Record<keyof OpportunityInput, string>;
/** Editors accept incomplete numeric tokens, never signs, exponents or excess decimal places. */
export const isNumericEdit = (value: string, money: boolean): boolean => money ? /^\d*(?:\.\d{0,2})?$/.test(value) : /^\d*$/.test(value);
/** Date inputs translate ISO instants back to the Salvadoran closing day. */
export const closingDay = (value?: string | null): string => value && Number.isFinite(Date.parse(value)) ? siteToday(new Date(value)) : '';
/** Mirrors bounded API fields while retaining the distinction between drafts and publication. */
export const validateOpportunityValues = (values: OpportunityValues, kind: OpportunityKind, required: Array<keyof OpportunityInput>, strict: boolean, now = new Date()): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (values.title.trim().length < 3) errors.title = 'El título debe tener al menos 3 caracteres.';
  if (strict) for (const field of required) if (!values[field].trim()) errors[field] = 'Este campo es obligatorio.';
  for (const [field, limit] of Object.entries({ title: 150, description: 20000, contactEmail: 255, contactPhone: 30, duration: 120, department: 100, municipality: 100 })) {
    if (values[field as keyof OpportunityInput].trim().length > limit) errors[field] = `Máximo ${limit} caracteres.`;
  }
  if (!values.contactEmail.trim() && !values.contactPhone.trim()) {
    errors.contactEmail = errors.contactPhone = 'Completa al menos el correo o el teléfono de contacto.';
  } else {
    const email = emailError(values.contactEmail, false);
    if (email) errors.contactEmail = email;
    if (values.contactPhone && !phoneDigits(values.contactPhone)) errors.contactPhone = 'Ingresa ocho dígitos con prefijo +503.';
  }
  if (strict && values.description.trim().length < 20) errors.description = 'Para publicar, escribe al menos 20 caracteres de descripción.';
  for (const field of ['slots', 'socialHours', ...(kind === 'EMPLOYMENT' ? ['salaryMin', 'salaryMax'] : [])] as Array<keyof OpportunityInput>) {
    const value = values[field]; if (value === '') continue;
    const money = field.startsWith('salary'); const limit = field === 'socialHours' ? 10000 : 1000000;
    if (!isNumericEdit(value, money) || !Number.isFinite(Number(value)) || Number(value) <= 0 || Number(value) > limit || (!money && !Number.isSafeInteger(Number(value)))) {
      errors[field] = money ? 'Ingresa un salario mayor que cero, hasta 1000000 USD y con máximo dos decimales.' : `Ingresa un entero entre 1 y ${limit}.`;
    }
  }
  if (kind === 'EMPLOYMENT' && values.salaryMin !== '' && values.salaryMax !== '' && Number(values.salaryMax) < Number(values.salaryMin)) errors.salaryMax = 'El salario máximo no puede ser menor que el mínimo.';
  if (values.expiresAt && (!isCalendarDate(values.expiresAt) || values.expiresAt < siteToday(now))) errors.expiresAt = 'Selecciona una fecha de cierre válida desde hoy.';
  for (const field of ['requirements', 'responsibilities', 'benefits'] as const) {
    const lines = values[field].split('\n').map(value => value.trim()).filter(Boolean);
    if (lines.length > 50 || lines.some(line => line.length > 1000)) errors[field] = 'Máximo 50 líneas y 1000 caracteres por línea.';
  }
  if (Boolean(values.department) !== Boolean(values.municipality)) errors[values.department ? 'municipality' : 'department'] = 'Completa departamento y municipio, o deja ambos vacíos para el borrador.';
  return errors;
};
