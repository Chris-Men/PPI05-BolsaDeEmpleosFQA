/** Values validated before sending a public candidate registration request. */
export interface RegistrationFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/** Shared identity constraints for registration and administrative profile editing. */
export function getAccountIdentityValidationError(name: string, address: string): string | null {
  const fullName = name.trim();
  const email = address.trim();

  if (fullName.length < 2) return 'Ingresa un nombre completo válido.';
  if (fullName.length > 150) {
    return 'El nombre completo no puede superar los 150 caracteres.';
  }
  if (!email) return 'Ingresa tu correo electrónico.';
  if (email.length > 255) {
    return 'El correo electrónico no puede superar los 255 caracteres.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'El correo electrónico no es válido.';
  }
  return null;
}

/** Mirrors backend registration constraints and returns the first localized error. */
export function getRegistrationValidationError(values: RegistrationFormValues): string | null {
  const identityError = getAccountIdentityValidationError(values.name, values.email);
  if (identityError) return identityError;
  return getNewPasswordValidationError(values.password, values.confirmPassword);
}

/** Applies the shared new-password and confirmation rules to account forms. */
export function getNewPasswordValidationError(password: string, confirmation: string): string | null {
  if (Array.from(password).length < 12) {
    return 'La contraseña debe tener al menos 12 caracteres.';
  }
  if (new TextEncoder().encode(password).length > 72) {
    return 'La contraseña no puede superar los 72 bytes en UTF-8.';
  }
  if (password !== confirmation) {
    return 'Las contraseñas no coinciden.';
  }
  return null;
}
