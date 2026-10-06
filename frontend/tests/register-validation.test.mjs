import assert from 'node:assert/strict';
import test from 'node:test';
import { getRegistrationValidationError } from '../src/validation/register.ts';

const validRegistration = {
  name: 'María López',
  email: 'maria@example.com',
  password: 'una-clave-segura-2026',
  confirmPassword: 'una-clave-segura-2026',
};

test('acepta un registro válido', () => {
  assert.equal(getRegistrationValidationError(validRegistration), null);
});

test('rechaza nombre y correo inválidos', () => {
  assert.equal(
    getRegistrationValidationError({ ...validRegistration, name: ' ' }),
    'Ingresa un nombre completo válido.',
  );
  assert.equal(
    getRegistrationValidationError({ ...validRegistration, email: 'correo-invalido' }),
    'El correo electrónico no es válido.',
  );
});

test('exige al menos 12 caracteres de contraseña', () => {
  assert.equal(
    getRegistrationValidationError({
      ...validRegistration,
      password: 'corta',
      confirmPassword: 'corta',
    }),
    'La contraseña debe tener al menos 12 caracteres.',
  );
});

test('limita la contraseña a 72 bytes UTF-8', () => {
  const oversizedPassword = '🔐'.repeat(19);
  assert.equal(
    getRegistrationValidationError({
      ...validRegistration,
      password: oversizedPassword,
      confirmPassword: oversizedPassword,
    }),
    'La contraseña no puede superar los 72 bytes en UTF-8.',
  );
});

test('rechaza contraseñas que no coinciden', () => {
  assert.equal(
    getRegistrationValidationError({
      ...validRegistration,
      confirmPassword: 'otra-clave-segura',
    }),
    'Las contraseñas no coinciden.',
  );
});
