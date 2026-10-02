import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { env } from '../config/env.js';
import type { ApplicationEmailInput, EmailPayload, RenderedEmail } from '../types/email.types.js';

const opportunityTypeSchema = z.enum(['EMPLEO', 'VOLUNTARIADO', 'HORAS_SOCIALES', 'PRACTICA']);
const applicationFields = {
  candidateName: z.string().max(150),
  opportunityTitle: z.string().max(150),
  opportunityType: opportunityTypeSchema,
  referenceNumber: z.string().max(64).optional(),
};
const payloadSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('PASSWORD_RESET'), token: z.string().regex(/^[0-9a-f]{64}$/) }).strict(),
  z.object({ kind: z.literal('PASSWORD_CHANGED') }).strict(),
  z.object({ kind: z.literal('APPLICATION_SUBMITTED'), ...applicationFields }).strict(),
  z.object({
    kind: z.literal('APPLICATION_DECIDED'), ...applicationFields,
    decision: z.enum(['APPROVED', 'REJECTED']),
  }).strict(),
]);

/** Decodes the separately configured 256-bit key without logging it. */
const configuredKey = (): Buffer => {
  if (!env.MAIL_OUTBOX_KEY) throw new Error('Falta la clave de la cola de correo.');
  return Buffer.from(env.MAIL_OUTBOX_KEY, 'hex');
};

/** Encrypts an outbox payload and binds it to its immutable event key. */
export const encryptEmailPayload = (
  payload: EmailPayload, eventKey: string, key: Buffer = configuredKey(),
): { encryptedPayload: string; iv: string; authTag: string } => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(eventKey, 'utf8'));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return {
    encryptedPayload: encrypted.toString('base64url'),
    iv: iv.toString('base64url'),
    authTag: cipher.getAuthTag().toString('base64url'),
  };
};

/** Decrypts and validates a message before rendering or sending it. */
export const decryptEmailPayload = (
  value: { encryptedPayload: string; iv: string; authTag: string; eventKey: string },
  key: Buffer = configuredKey(),
): EmailPayload => {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv, 'base64url'));
  decipher.setAAD(Buffer.from(value.eventKey, 'utf8'));
  decipher.setAuthTag(Buffer.from(value.authTag, 'base64url'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(value.encryptedPayload, 'base64url')), decipher.final(),
  ]).toString('utf8');
  return payloadSchema.parse(JSON.parse(plaintext));
};

/** Inserts one encrypted message in the caller's database transaction. */
export const enqueueEmail = async (
  database: Prisma.TransactionClient, eventKey: string, recipientEmail: string, payload: EmailPayload,
): Promise<void> => {
  const encrypted = encryptEmailPayload(payload, eventKey);
  await database.emailOutbox.createMany({
    data: [{ eventKey, recipientEmail, kind: payload.kind, ...encrypted }],
    skipDuplicates: true,
  });
};

/** Prepares a candidate confirmation when a future application transaction succeeds. */
export const enqueueApplicationConfirmation = (
  database: Prisma.TransactionClient, input: ApplicationEmailInput,
): Promise<void> => enqueueEmail(database, input.eventKey, input.recipientEmail, {
  kind: 'APPLICATION_SUBMITTED',
  candidateName: input.candidateName,
  opportunityTitle: input.opportunityTitle,
  opportunityType: input.opportunityType,
  ...(input.referenceNumber ? { referenceNumber: input.referenceNumber } : {}),
});

/** Prepares a candidate decision when a future application state transition succeeds. */
export const enqueueApplicationDecision = (
  database: Prisma.TransactionClient, input: ApplicationEmailInput,
  decision: 'APPROVED' | 'REJECTED',
): Promise<void> => enqueueEmail(database, input.eventKey, input.recipientEmail, {
  kind: 'APPLICATION_DECIDED',
  candidateName: input.candidateName,
  opportunityTitle: input.opportunityTitle,
  opportunityType: input.opportunityType,
  decision,
  ...(input.referenceNumber ? { referenceNumber: input.referenceNumber } : {}),
});

const opportunityName = {
  EMPLEO: 'oferta de empleo',
  VOLUNTARIADO: 'oportunidad de voluntariado',
  HORAS_SOCIALES: 'oportunidad de horas sociales',
  PRACTICA: 'oportunidad de prácticas',
} as const;

/** Renders Spanish text without interpolating untrusted data into SMTP headers. */
export const renderEmail = (payload: EmailPayload, resetPasswordUrl: string): RenderedEmail => {
  if (payload.kind === 'PASSWORD_RESET') {
    const url = new URL(resetPasswordUrl);
    url.searchParams.set('token', payload.token);
    return {
      subject: 'Recupera tu contraseña | FQA Empleos',
      text: [
        'Recibimos una solicitud para restablecer tu contraseña de FQA Empleos.',
        'Abre este enlace durante los próximos 30 minutos:',
        url.toString(),
        'Si no solicitaste este cambio, ignora este correo.',
      ].join('\n\n'),
    };
  }
  if (payload.kind === 'PASSWORD_CHANGED') {
    return {
      subject: 'Tu contraseña fue actualizada | FQA Empleos',
      text: 'La contraseña de tu cuenta de FQA Empleos fue actualizada. Si no fuiste tú, contacta al equipo administrador.',
    };
  }
  const opening = payload.candidateName.trim() ? 'Hola, ' + payload.candidateName.trim() + ':' : 'Hola:';
  const reference = payload.referenceNumber ? '\nReferencia: ' + payload.referenceNumber : '';
  const target = 'la ' + opportunityName[payload.opportunityType] + ' "' + payload.opportunityTitle + '"';
  if (payload.kind === 'APPLICATION_SUBMITTED') {
    return {
      subject: 'Postulación recibida | FQA Empleos',
      text: opening + '\n\nRecibimos tu postulación a ' + target + '.' + reference +
        '\n\nTe notificaremos cuando haya una decisión.',
    };
  }
  return {
    subject: 'Resultado de tu postulación | FQA Empleos',
    text: opening + '\n\nTu postulación a ' + target + ' fue ' +
      (payload.decision === 'APPROVED' ? 'aprobada.' : 'rechazada.') + reference,
  };
};
