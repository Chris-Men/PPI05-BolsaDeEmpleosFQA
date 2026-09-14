import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { registerCandidateSchema } from '../../src/validation/auth.schema.js';

const validInput = {
  fullName: 'Ana Rivera',
  email: 'ana@example.test',
  password: 'Una clave segura 2026',
};

describe('Validación del registro', () => {
  it('normaliza nombre y correo sin modificar la contraseña', () => {
    const password = '  Clave con espacios  ';
    assert.deepEqual(
      registerCandidateSchema.parse({
        fullName: '  Ana Rivera  ',
        email: '  ANA@EXAMPLE.TEST  ',
        password,
      }),
      { fullName: 'Ana Rivera', email: 'ana@example.test', password },
    );
  });

  for (const field of ['fullName', 'email', 'password'] as const) {
    it(`rechaza el campo obligatorio ausente: ${field}`, () => {
      const { [field]: omitted, ...input } = validInput;
      assert.ok(omitted);
      assert.equal(registerCandidateSchema.safeParse(input).success, false);
    });

    it(`rechaza tipos incorrectos: ${field}`, () => {
      assert.equal(
        registerCandidateSchema.safeParse({ ...validInput, [field]: 123 }).success,
        false,
      );
    });
  }

  const invalidCases = [
    { label: 'nombre vacío', input: { ...validInput, fullName: '   ' } },
    { label: 'nombre de un carácter', input: { ...validInput, fullName: 'A' } },
    { label: 'nombre superior a 150 caracteres', input: { ...validInput, fullName: 'a'.repeat(151) } },
    { label: 'correo inválido', input: { ...validInput, email: 'sin-arroba' } },
    { label: 'nombre simple superior a la columna', input: { ...validInput, fullName: 'a'.repeat(101) } },
    { label: 'nombre compuesto superior a la columna', input: { ...validInput, fullName: 'a'.repeat(101) + ' Rivera' } },
    { label: 'apellido superior a la columna', input: { ...validInput, fullName: 'Ana ' + 'b'.repeat(101) } },
    { label: 'correo superior a la columna', input: { ...validInput, email: 'a'.repeat(64) + '@' + ['b'.repeat(63), 'c'.repeat(63), 'd'.repeat(63)].join('.') } },
    { label: 'contraseña de 11 caracteres', input: { ...validInput, password: 'a'.repeat(11) } },
    { label: 'contraseña superior a 72 bytes', input: { ...validInput, password: 'a'.repeat(73) } },
    { label: 'contraseña Unicode superior a 72 bytes', input: { ...validInput, password: 'é'.repeat(37) } },
    { label: 'menos de 12 caracteres Unicode', input: { ...validInput, password: '😀'.repeat(6) } },
    { label: 'cuerpo nulo', input: null },
    { label: 'cuerpo de tipo arreglo', input: [] },
  ];

  for (const { label, input } of invalidCases) {
    it(`rechaza ${label}`, () => {
      assert.equal(registerCandidateSchema.safeParse(input).success, false);
    });
  }

  for (const password of ['a'.repeat(12), 'a'.repeat(72), 'é'.repeat(36), '😀'.repeat(18)]) {
    it(`acepta los límites válidos de ${Buffer.byteLength(password, 'utf8')} bytes`, () => {
      assert.equal(registerCandidateSchema.parse({ ...validInput, password }).password, password);
    });
  }

  for (const field of ['role', 'roleId', 'status', 'statusId', 'profile', 'passwordHash']) {
    it(`rechaza asignación de campos ajenos al contrato: ${field}`, () => {
      const result = registerCandidateSchema.safeParse({
        ...validInput,
        [field]: 'ADMINISTRATOR',
      });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.error.issues.every((issue) => !issue.message.includes('ADMINISTRATOR')));
      }
    });
  }
});
