import { createHash } from 'node:crypto';
import nodemailer from 'nodemailer';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { USER_STATUS_NAMES } from '../constants/user.constants.js';
import { decryptEmailPayload, renderEmail } from './email.service.js';

/** Narrow sender contract allows deterministic tests without an SMTP server. */
export interface MailSender {
  sendMail(message: { from: string; to: string; subject: string; text: string }): Promise<unknown>;
}

/** Creates one reusable SMTP connection pool for the API process. */
export const createSmtpSender = (): MailSender => {
  if (!env.SMTP_HOST) throw new Error('Falta SMTP_HOST.');
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    requireTLS: env.NODE_ENV === 'production' && !env.SMTP_SECURE,
    ...(env.SMTP_USER && env.SMTP_PASS ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } } : {}),
    pool: true,
    maxConnections: 2,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
};

/** Verifies that a queued link still matches the account's current, unused reset token. */
const resetLinkIsCurrent = async (token: string): Promise<boolean> => {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      expiresAt: true, usedAt: true,
      user: { select: { deletedAt: true, status: { select: { name: true } } } },
    },
  });
  return Boolean(record && !record.usedAt && record.expiresAt > new Date() &&
    !record.user.deletedAt && record.user.status.name === USER_STATUS_NAMES.ACTIVE);
};

/** Claims due rows with a lease; SMTP delivery is at least once after a process crash. */
export const processEmailOutboxBatch = async (sender: MailSender, limit = 10): Promise<number> => {
  const now = new Date();
  const due = await prisma.emailOutbox.findMany({
    where: {
      sentAt: null, discardedAt: null, nextAttemptAt: { lte: now },
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
    },
    orderBy: { nextAttemptAt: 'asc' }, take: limit,
  });
  let processed = 0;
  for (const message of due) {
    const lockedUntil = new Date(Date.now() + 60_000);
    const claim = await prisma.emailOutbox.updateMany({
      where: {
        id: message.id, sentAt: null, discardedAt: null, nextAttemptAt: { lte: new Date() },
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: new Date() } }],
      },
      data: { lockedUntil, attempts: { increment: 1 } },
    });
    if (!claim.count) continue;
    processed += 1;

    let payload;
    try {
      payload = decryptEmailPayload(message);
    } catch {
      await prisma.emailOutbox.update({
        where: { id: message.id }, data: { discardedAt: new Date(), lockedUntil: null },
      });
      console.error('Se descartó un correo pendiente inválido.');
      continue;
    }

    if (payload.kind === 'PASSWORD_RESET' && !await resetLinkIsCurrent(payload.token)) {
      await prisma.emailOutbox.update({
        where: { id: message.id }, data: { discardedAt: new Date(), lockedUntil: null },
      });
      continue;
    }

    try {
      const rendered = renderEmail(payload, env.RESET_PASSWORD_URL ?? 'http://localhost:5173/reset-password');
      await sender.sendMail({
        from: env.SMTP_FROM ?? 'no-reply@fqa.local',
        to: message.recipientEmail,
        ...rendered,
      });
      await prisma.emailOutbox.update({
        where: { id: message.id }, data: { sentAt: new Date(), lockedUntil: null },
      });
    } catch {
      const attempts = message.attempts + 1;
      const exhausted = attempts >= 8;
      await prisma.emailOutbox.update({
        where: { id: message.id },
        data: {
          lockedUntil: null,
          ...(exhausted ? { discardedAt: new Date() } : {
            nextAttemptAt: new Date(Date.now() + Math.min(30_000 * 2 ** (attempts - 1), 3_600_000)),
          }),
        },
      });
      console.error('No se pudo entregar un correo pendiente.');
    }
  }
  return processed;
};

/** Removes completed messages after thirty days without touching pending delivery. */
export const purgeCompletedEmailOutbox = async (): Promise<void> => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60_000);
  await prisma.emailOutbox.deleteMany({
    where: { OR: [{ sentAt: { lt: cutoff } }, { discardedAt: { lt: cutoff } }] },
  });
};
/** Runs the PostgreSQL outbox worker inside the existing backend process. */
export const startEmailWorker = (sender: MailSender = createSmtpSender()): NodeJS.Timeout => {
  let running = false;
  let lastCleanup = 0;
  const poll = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      await processEmailOutboxBatch(sender);
      if (Date.now() - lastCleanup >= 24 * 60 * 60_000) {
        await purgeCompletedEmailOutbox();
        lastCleanup = Date.now();
      }
    } catch {
      console.error('No se pudo procesar la cola de correo.');
    } finally {
      running = false;
    }
  };
  void poll();
  return setInterval(() => { void poll(); }, 5_000);
};
