import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { PASSWORD_HASH_ROUNDS } from '../constants/auth.constants.js';
import { USER_STATUS_NAMES } from '../constants/user.constants.js';
import { ROLE_NAMES } from '../constants/authorization.constants.js';
import type { SessionResult } from '../types/auth.types.js';
import type { ForgotPasswordDTO, LoginDTO, RegisterCandidateDTO, ResetPasswordDTO } from '../validation/auth.schema.js';
import { AppError } from '../utils/app-error.js';
import { rethrowUserConflict } from '../utils/user-conflict.js';
import { splitProfileName } from '../utils/profile-name.js';
import { createSession, revokeUserSessions } from './session.service.js';

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

/**
 * Creates a password-reset token for an existing account.
 *
 * The raw token is intentionally not stored in the database.
 * Only its SHA-256 hash is persisted.
 */
export const requestPasswordReset = async (
  payload: ForgotPasswordDTO,
): Promise<string> => {
  const user = await prisma.user.findFirst({
    where: {
      email: payload.email,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  /*
   * Do not reveal whether the email belongs to an account.
   * The controller will return the same response either way.
   */
  if (!user) {
    return '';
  }

  const token = crypto.randomBytes(32).toString('hex');

  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  return token;
};

/**
 * Resets an account password using a valid, unused and non-expired token.
 */
export const resetPassword = async (
  payload: ResetPasswordDTO,
): Promise<void> => {
  const tokenHash = crypto
    .createHash('sha256')
    .update(payload.token)
    .digest('hex');

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  const now = new Date();

  if (
    !resetToken ||
    resetToken.usedAt !== null ||
    resetToken.expiresAt <= now
  ) {
    throw new AppError(
      400,
      'El enlace de recuperación no es válido o ha expirado.',
    );
  }

  const passwordHash = await bcrypt.hash(
    payload.password,
    PASSWORD_HASH_ROUNDS,
  );

  await prisma.$transaction(async (database) => {
    const consumed = await database.passwordResetToken.updateMany({
      where: {
        id: resetToken.id,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        usedAt: now,
      },
    });

    if (consumed.count !== 1) {
      throw new AppError(
        400,
        'El enlace de recuperación no es válido o ha expirado.',
      );
    }

    await database.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
      },
    });
  });

  await revokeUserSessions(resetToken.userId);
};
