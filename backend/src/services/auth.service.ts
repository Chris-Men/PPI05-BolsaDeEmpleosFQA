import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma.js';
import { PASSWORD_HASH_ROUNDS } from '../constants/auth.constants.js';
import { ROLE_NAMES } from '../constants/authorization.constants.js';
import type { SessionResult } from '../types/auth.types.js';
import type { LoginDTO, RegisterCandidateDTO } from '../validation/auth.schema.js';
import { AppError } from '../utils/app-error.js';
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' &&
      Array.isArray(error.meta?.target) && error.meta.target.includes('email')) {
      throw new AppError(409, 'Ya existe una cuenta con este correo electrónico.');
    }
    throw error;
  }
};

/** Checks credentials without revealing whether a particular account exists. */
export const loginAccount = async (payload: LoginDTO): Promise<SessionResult> => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
    select: { id: true, passwordHash: true, status: { select: { name: true } } },
  });
  const valid = await bcrypt.compare(payload.password, user?.passwordHash ?? await dummyHash);
  const failure = (): AppError => new AppError(401, 'Correo o contraseña incorrectos.');
  if (!user || !valid || user.status.name !== 'Activo') throw failure();
  try {
    return await prisma.$transaction((database) => createSession(database, user.id));
  } catch (error: unknown) {
    if (error instanceof AppError && error.statusCode === 401) throw failure();
    throw error;
  }
};
