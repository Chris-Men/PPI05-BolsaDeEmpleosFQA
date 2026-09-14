import '../helpers/unit-environment.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';
import { tokenService } from '../../src/services/token.service.js';
import { AppError } from '../../src/utils/app-error.js';

describe('JWT de registro', () => {
  it('firma con HS256, identidad y rol, con vigencia de una hora', () => {
    const token = tokenService.createAccessToken('candidate-id', 'CANDIDATE');
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });

    assert.ok(typeof payload === 'object');
    assert.equal(payload.sub, 'candidate-id');
    assert.equal(payload.role, 'CANDIDATE');
    assert.equal(typeof payload.iat, 'number');
    assert.equal(typeof payload.exp, 'number');
    assert.equal(payload.exp! - payload.iat!, 3600);
    assert.deepEqual(Object.keys(payload).sort(), ['exp', 'iat', 'role', 'sub']);

    assert.throws(
      () => jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
        clockTimestamp: payload.exp,
      }),
      jwt.TokenExpiredError,
    );
    assert.throws(
      () => jwt.verify(token, 'incorrect-test-signing-key', { algorithms: ['HS256'] }),
      jwt.JsonWebTokenError,
    );
    assert.throws(
      () => jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS384'] }),
      jwt.JsonWebTokenError,
    );
  });
});

describe('Verificación de acceso', () => {
  it('devuelve la identidad numérica sin usar el claim de rol como autorización', () => {
    assert.equal(tokenService.verifyAccessToken(tokenService.createAccessToken('123', 'SUPER_ADMIN')), 123);
  });

  it('rechaza firmas, algoritmos, vencimientos y sujetos inválidos', () => {
    const valid = tokenService.createAccessToken('123', 'CANDIDATE');
    const parts = valid.split('.');
    const invalidTokens = [
      'malformed',
      parts[0] + '.' + parts[1] + '.invalid-signature',
      jwt.sign({}, 'another-signing-key', { subject: '123', expiresIn: 60 }),
      jwt.sign({}, env.JWT_SECRET, { subject: '123', expiresIn: 60, algorithm: 'HS384' }),
      jwt.sign({}, env.JWT_SECRET, { subject: '123', expiresIn: -1 }),
      jwt.sign({}, env.JWT_SECRET, { subject: '123' }),
      jwt.sign({}, env.JWT_SECRET, { expiresIn: 60 }),
      ...['0', '-1', '1.5', '01', 'candidate-id', '2147483648', '9007199254740992'].map(
        (subject) => jwt.sign({}, env.JWT_SECRET, { subject, expiresIn: 60 }),
      ),
    ];
    for (const token of invalidTokens) {
      assert.throws(() => tokenService.verifyAccessToken(token), (error: unknown) =>
        error instanceof AppError && error.statusCode === 401);
    }
  });
});
