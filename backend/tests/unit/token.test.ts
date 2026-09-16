import '../helpers/unit-environment.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';
import { tokenService } from '../../src/services/token.service.js';
import { AppError } from '../../src/utils/app-error.js';

const sessionId = randomUUID();
describe('JWT de sesión', () => {
  it('firma HS256 durante una hora sin datos privados y devuelve identidad y sesión', () => {
    const token = tokenService.createAccessToken('123', 'CANDIDATE', sessionId);
    const claims = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    assert.ok(typeof claims === 'object');
    assert.equal(claims.exp! - claims.iat!, 3600);
    assert.deepEqual(Object.keys(claims).sort(), ['exp', 'iat', 'role', 'sid', 'sub']);
    assert.deepEqual(tokenService.verifyAccessToken(token), { userId: 123, sessionId });
    assert.throws(() => jwt.verify(token, env.JWT_SECRET, { clockTimestamp: claims.exp }), jwt.TokenExpiredError);
  });

  it('permite reducir la vigencia hasta el vencimiento de sesión', () => {
    const claims = jwt.decode(tokenService.createAccessToken('123', 'CANDIDATE', sessionId, 10));
    assert.ok(claims && typeof claims === 'object');
    assert.equal(claims.exp! - claims.iat!, 10);
  });

  it('rechaza tokens antiguos, vencidos, firmas, algoritmos e identidades inválidas', () => {
    const sign = (payload: object, subject = '123', expiresIn = 60): string =>
      jwt.sign(payload, env.JWT_SECRET, { subject, expiresIn });
    for (const token of [
      'malformed', sign({}), sign({ sid: 'invalid' }), sign({ sid: sessionId }, '123', -1),
      jwt.sign({ sid: sessionId }, env.JWT_SECRET, { subject: '123' }),
      jwt.sign({ sid: sessionId }, env.JWT_SECRET, { expiresIn: 60 }),
      jwt.sign({ sid: sessionId }, 'another-key', { subject: '123', expiresIn: 60 }),
      jwt.sign({ sid: sessionId }, env.JWT_SECRET, { subject: '123', expiresIn: 60, algorithm: 'HS384' }),
      ...['0', '-1', '1.5', '01', 'candidate-id', '2147483648', '9007199254740992'].map((sub) =>
        sign({ sid: sessionId }, sub)),
    ]) assert.throws(() => tokenService.verifyAccessToken(token),
      (error: unknown) => error instanceof AppError && error.statusCode === 401);
  });
});
