import bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { PASSWORD_HASH_ROUNDS } from '../constants/auth.constants.js';
import { USER_STATUS_NAMES } from '../constants/user.constants.js';
import { ROLE_NAMES } from '../constants/authorization.constants.js';
import type { SessionResult } from '../types/auth.types.js';
import type { ForgotPasswordDTO, LoginDTO, RegisterCandidateDTO, ResetPasswordDTO } from '../validation/auth.schema.js';
import { AppError } from '../utils/app-error.js';
import { rethrowUserConflict } from '../utils/user-conflict.js';
import { splitProfileName } from '../utils/profile-name.js';
import { createSession } from './session.service.js';
import { enqueueEmail } from './email.service.js';

/** Valid bcrypt fallback equalizes credential checks for unknown accounts. */
const dummyHash = bcrypt.hash('non-account-random-placeholder', PASSWORD_HASH_ROUNDS);

/** Registers the account, profile and initial session in one transaction. */
export const registerCandidate = async (payload: RegisterCandidateDTO): Promise<SessionResult> => {
  const passwordHash = await bcrypt.hash(payload.password, PASSWORD_HASH_ROUNDS);
  const { firstName, lastName } = splitProfileName(payload.fullName);
  try {
    return await prisma.$transaction(async (database) => {
      const user = await database.user.create({
        data: {
          email: payload.email, passwordHash, status: { connect: { name: 'Activo' } },
          profile: { create: { firstName, lastName } },
          userRoles: { create: { roles: { connect: { name: ROLE_NAMES.CANDIDATE } } } },
        },
        select: { id: true },
      });
      return createSession(database, user.id);
    });
  } catch (error: unknown) {
    return rethrowUserConflict(error);
  }
};

/** Validates credentials before reporting disabled status; unknown/deleted accounts remain indistinguishable. */
export const loginAccount = async (payload: LoginDTO): Promise<SessionResult> => {
  const user = await prisma.user.findFirst({
    where: { email: payload.email, deletedAt: null },
    select: { id: true, passwordHash: true, deletedAt: true, status: { select: { name: true } } },
  });
  const valid = await bcrypt.compare(payload.password, user?.passwordHash ?? await dummyHash);
  const failure = (): AppError => new AppError(401, 'Correo o contraseña incorrectos.');
  if (!user || !valid || user.deletedAt !== null) throw failure();
  if (user.status.name === USER_STATUS_NAMES.DISABLED) {
    throw new AppError(401, 'Tu cuenta está deshabilitada. Contacta al administrador para solicitar su rehabilitación.');
  }
  if (user.status.name !== USER_STATUS_NAMES.ACTIVE) throw failure();
  try {
    return await prisma.$transaction((database) => createSession(database, user.id));
  } catch (error: unknown) {
    if (error instanceof AppError && error.statusCode === 401) throw failure();
    throw error;
  }
};

const RESET_TOKEN_LIFETIME_MS = 30 * 60_000;
const REQUEST_COOLDOWN_MS = 5 * 60_000;
const MIN_RESPONSE_MS = 300;

/** Hashes a recovery credential so the raw value never enters the token table. */
const tokenDigest = (token: string): string => createHash('sha256').update(token).digest('hex');

/** Reduces timing differences between eligible, unknown and throttled accounts. */
const waitForMinimumDuration = async (startedAt: number): Promise<void> => {
  const remaining = MIN_RESPONSE_MS - (Date.now() - startedAt);
  if (remaining > 0) await new Promise<void>((resolve) => { setTimeout(resolve, remaining); });
};

/**
 * Creates a single-use link at most once every five minutes for an active account.
 * The token and encrypted outbox entry commit together under serializable isolation.
 */
export const requestPasswordReset = async (payload: ForgotPasswordDTO): Promise<void> => {
  const startedAt = Date.now();
  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        await prisma.$transaction(async (database) => {
          const user = await database.user.findFirst({
            where: { email: payload.email, deletedAt: null },
            select: { id: true, email: true, status: { select: { name: true } } },
          });
          if (!user || user.status.name !== USER_STATUS_NAMES.ACTIVE) return;

          const lastRequest = await database.passwordResetToken.findFirst({
            where: { userId: user.id },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: { createdAt: true },
          });
          const now = new Date();
          if (lastRequest && now.getTime() - lastRequest.createdAt.getTime() < REQUEST_COOLDOWN_MS) return;

          const token = randomBytes(32).toString('hex');
          const tokenHash = tokenDigest(token);
          await database.passwordResetToken.updateMany({
            where: { userId: user.id, usedAt: null },
            data: { usedAt: now },
          });
          await database.passwordResetToken.create({
            data: {
              userId: user.id, tokenHash,
              createdAt: now, expiresAt: new Date(now.getTime() + RESET_TOKEN_LIFETIME_MS),
            },
          });
          await enqueueEmail(database, 'password-reset:' + tokenHash, user.email, {
            kind: 'PASSWORD_RESET', token,
          });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        return;
      } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2034' && attempt < 3) continue;
        throw error;
      }
    }
  } finally {
    await waitForMinimumDuration(startedAt);
  }
};

/** Changes the password, consumes the link and revokes every existing session atomically. */
export const resetPassword = async (payload: ResetPasswordDTO): Promise<void> => {
  const tokenHash = tokenDigest(payload.token);
  const invalid = (): AppError => new AppError(
    400, 'El enlace de recuperación no es válido o ha expirado.',
  );
  const precheck = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      expiresAt: true, usedAt: true,
      user: { select: { deletedAt: true, status: { select: { name: true } } } },
    },
  });
  if (!precheck || precheck.usedAt || precheck.expiresAt <= new Date() ||
      precheck.user.deletedAt || precheck.user.status.name !== USER_STATUS_NAMES.ACTIVE) throw invalid();

  const passwordHash = await bcrypt.hash(payload.password, PASSWORD_HASH_ROUNDS);
  await prisma.$transaction(async (database) => {
    const record = await database.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true, userId: true, expiresAt: true, usedAt: true,
        user: {
          select: {
            email: true, deletedAt: true, statusId: true,
            status: { select: { name: true } },
          },
        },
      },
    });
    const now = new Date();
    if (!record || record.usedAt || record.expiresAt <= now ||
        record.user.deletedAt || record.user.status.name !== USER_STATUS_NAMES.ACTIVE) throw invalid();

    const consumed = await database.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) throw invalid();

    const updated = await database.user.updateMany({
      where: { id: record.userId, deletedAt: null, statusId: record.user.statusId },
      data: { passwordHash },
    });
    if (updated.count !== 1) throw invalid();

    await database.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: now },
    });
    await database.authSession.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: now },
    });
    await enqueueEmail(database, 'password-changed:' + randomUUID(), record.user.email, {
      kind: 'PASSWORD_CHANGED',
    });
  });
};
