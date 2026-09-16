import type { LoginRequest } from '../types/auth';

/** Mirrors the public credential constraints without changing the password. */
export function getLoginValidationError(values: LoginRequest): string | null {
  const email = values.email.trim();
  if (!email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Ingresa un correo electrónico válido.';
  }
  if (!values.password) return 'La contraseña es obligatoria.';
  if (new TextEncoder().encode(values.password).length > 72) {
    return 'La contraseña no puede superar los 72 bytes en UTF-8.';
  }
  return null;
}
