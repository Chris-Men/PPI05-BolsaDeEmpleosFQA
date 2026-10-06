import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loginSchema } from '../../src/validation/auth.schema.js';

describe('Validación de login', () => {
  it('normaliza correo pero conserva contraseña y acepta credenciales históricas cortas', () => {
    assert.deepEqual(loginSchema.parse({ email: ' ANA@EXAMPLE.TEST ', password: ' x ' }),
      { email: 'ana@example.test', password: ' x ' });
  });
  it('rechaza entradas inválidas, excesos UTF-8 y campos de privilegios', () => {
    for (const input of [null, [], {}, { email: 1, password: true },
      { email: 'invalid', password: 'x' }, { email: 'a@example.test', password: '' },
      { email: 'a@example.test', password: 'é'.repeat(37) },
      { email: 'a@example.test', password: 'x', role: 'SUPER_ADMIN' },
    ]) assert.equal(loginSchema.safeParse(input).success, false);
  });
});
