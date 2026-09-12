import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { requireTestDatabaseUrl } from '../../scripts/test-database.js';

describe('Aislamiento de la base de pruebas', () => {
  it('exige una URL explícita y un nombre terminado en _test', () => {
    assert.throws(() => requireTestDatabaseUrl(undefined, undefined));
    assert.throws(() => requireTestDatabaseUrl('invalid-url', undefined));
    assert.throws(() => requireTestDatabaseUrl('https://localhost/fqa_test', undefined));
    assert.throws(() => requireTestDatabaseUrl('postgresql://localhost/fqa_empleos', undefined));
  });

  it('rechaza la base de desarrollo aunque se use otro alias de host', () => {
    assert.throws(() => requireTestDatabaseUrl(
      'postgresql://localhost/fqa_test',
      'postgresql://postgres/fqa_test',
    ));
  });

  it('acepta una base dedicada sin recurrir a DATABASE_URL', () => {
    const target = 'postgresql://localhost/fqa_registration_test?schema=public';
    assert.equal(
      requireTestDatabaseUrl(target, 'postgresql://localhost/fqa_empleos'),
      target,
    );
  });
});
