import { getNewPasswordValidationError } from './register';

/** Shared field-level email rule includes the API length bound and optional empty values. */
export const emailError = (value: string, required = true): string => {
  const email = value.trim();
  if (!email && !required) return '';
  return !email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Ingresa un correo electrónico válido de hasta 255 caracteres.' : '';
};
/** Required names use their existing account/organization limits. */
export const textError = (value: string, minimum: number, maximum: number): string => value.trim().length < minimum
  ? `Ingresa al menos ${minimum} caracteres.` : value.trim().length > maximum ? `Máximo ${maximum} caracteres.` : '';
/** Empty password confirmation is deferred until that field is touched or submitted. */
export const passwordErrors = (password: string, confirmation?: string): Record<string, string> => ({
  password: getNewPasswordValidationError(password, password) ?? '',
  ...(confirmation === undefined ? {} : { confirmation: password !== confirmation ? 'Las contraseñas no coinciden.' : !confirmation ? 'Confirma tu contraseña.' : '' }),
});
/** Filters successful field checks so callers can test the resulting map directly. */
export const fieldErrors = (values: Record<string, string>): Record<string, string> => Object.fromEntries(Object.entries(values).filter(([, value]) => value));
