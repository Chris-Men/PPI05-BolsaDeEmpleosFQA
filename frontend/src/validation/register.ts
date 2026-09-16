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
  if (Array.from(values.password).length < 12) {
    return 'La contraseña debe tener al menos 12 caracteres.';
  }
  if (new TextEncoder().encode(values.password).length > 72) {
    return 'La contraseña no puede superar los 72 bytes en UTF-8.';
  }
  if (values.password !== values.confirmPassword) {
    return 'Las contraseñas no coinciden.';
  }
  return null;
}
