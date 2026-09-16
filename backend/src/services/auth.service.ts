import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma.js';
import { PASSWORD_HASH_ROUNDS } from '../constants/auth.constants.js';
import { USER_STATUS_NAMES } from '../constants/user.constants.js';
import { ROLE_NAMES } from '../constants/authorization.constants.js';
import type { SessionResult } from '../types/auth.types.js';
import type { LoginDTO, RegisterCandidateDTO } from '../validation/auth.schema.js';
import { AppError } from '../utils/app-error.js';
import { rethrowUserConflict } from '../utils/user-conflict.js';
import { splitProfileName } from '../utils/profile-name.js';
import { createSession } from './session.service.js';

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
