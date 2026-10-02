import '../helpers/unit-environment.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decryptEmailPayload, encryptEmailPayload, renderEmail } from '../../src/services/email.service.js';
import type { EmailPayload, OpportunityType } from '../../src/types/email.types.js';

const key = Buffer.alloc(32, 7);
const resetUrl = 'http://localhost:5173/reset-password';

/** Exercises encrypted storage without requiring a database or SMTP server. */
describe('Correo cifrado y plantillas', () => {
  it('cifra el enlace y detecta manipulación del contenido o evento', () => {
    const payload: EmailPayload = { kind: 'PASSWORD_RESET', token: 'a'.repeat(64) };
    const encrypted = encryptEmailPayload(payload, 'reset:test', key);
    assert.ok(!JSON.stringify(encrypted).includes(payload.token));
    assert.deepEqual(decryptEmailPayload({ ...encrypted, eventKey: 'reset:test' }, key), payload);
    assert.throws(() => decryptEmailPayload({ ...encrypted, eventKey: 'reset:other' }, key));
    assert.throws(() => decryptEmailPayload({ ...encrypted, eventKey: 'reset:test' }, Buffer.alloc(32, 8)));
  });

  it('construye el enlace desde una URL configurada y mantiene el token fuera del asunto', () => {
    const payload: EmailPayload = { kind: 'PASSWORD_RESET', token: 'b'.repeat(64) };
    const rendered = renderEmail(payload, resetUrl);
    assert.equal(rendered.subject.includes(payload.token), false);
    assert.ok(rendered.text.includes('token=' + payload.token));
    assert.ok(rendered.text.includes('30 minutos'));
  });

  for (const opportunityType of ['EMPLEO', 'VOLUNTARIADO', 'HORAS_SOCIALES', 'PRACTICA'] as OpportunityType[]) {
    it('prepara la confirmación de ' + opportunityType, () => {
      const rendered = renderEmail({
        kind: 'APPLICATION_SUBMITTED', candidateName: 'Ana',
        opportunityTitle: 'Oportunidad de prueba', opportunityType, referenceNumber: 'FQA-1',
      }, resetUrl);
      assert.ok(rendered.text.includes('Ana'));
      assert.ok(rendered.text.includes('FQA-1'));
      assert.ok(rendered.text.includes('Oportunidad de prueba'));
    });
  }

  for (const opportunityType of ['EMPLEO', 'VOLUNTARIADO', 'HORAS_SOCIALES', 'PRACTICA'] as OpportunityType[]) {
    it('distingue decisiones de ' + opportunityType, () => {
      const base = { candidateName: 'Ana', opportunityTitle: 'Oferta', opportunityType };
      assert.ok(renderEmail({ kind: 'APPLICATION_DECIDED', ...base, decision: 'APPROVED' }, resetUrl)
        .text.includes('aprobada'));
      assert.ok(renderEmail({ kind: 'APPLICATION_DECIDED', ...base, decision: 'REJECTED' }, resetUrl)
        .text.includes('rechazada'));
    });
  }
});
