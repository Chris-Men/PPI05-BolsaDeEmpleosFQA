import assert from 'node:assert/strict';
import test from 'node:test';
import { getLoginValidationError } from '../src/validation/login.ts';

test('login acepta claves históricas y no modifica espacios', () => {
  const input = { email: ' ANA@example.test ', password: ' x ' };
  assert.equal(getLoginValidationError(input), null);
  assert.equal(input.password, ' x ');
});
test('login rechaza campos vacíos, correo inválido y excesos UTF-8', () => {
  for (const input of [
    { email: 'invalid', password: 'abc' }, { email: 'a@example.test', password: '' },
    { email: 'a@example.test', password: 'é'.repeat(37) },
  ]) assert.ok(getLoginValidationError(input));
});
