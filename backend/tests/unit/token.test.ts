import '../helpers/unit-environment.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';
import { tokenService } from '../../src/services/token.service.js';

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
