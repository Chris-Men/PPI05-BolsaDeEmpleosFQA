import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma.js';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  ACTIVE_USER_STATUS_CODE,
  CANDIDATE_ROLE_CODE,
  PASSWORD_HASH_ROUNDS,
} from '../constants/auth.constants.js';
import type { RegistrationResponse } from '../types/auth.types.js';
import { AppError } from '../utils/app-error.js';
import type { RegisterCandidateDTO } from '../validation/auth.schema.js';
import { tokenService } from './token.service.js';

/** Creates a candidate and profile atomically, committing only after JWT signing. */
export const registerCandidate = async (
  payload: RegisterCandidateDTO,
): Promise<RegistrationResponse> => {
  // Expensive hashing happens before opening a database transaction.
  const passwordHash = await bcrypt.hash(payload.password, PASSWORD_HASH_ROUNDS);

  try {
    return await prisma.$transaction(async (transaction) => {
      const account = await transaction.user.create({
        data: {
          email: payload.email,
          passwordHash,
          role: { connect: { code: CANDIDATE_ROLE_CODE } },
          status: { connect: { code: ACTIVE_USER_STATUS_CODE } },
          profile: { create: { fullName: payload.fullName } },
        },
        select: {
          id: true,
          email: true,
          createdAt: true,
          role: { select: { code: true } },
          status: { select: { code: true } },
          profile: { select: { fullName: true } },
        },
      });

      if (!account.profile) {
        throw new Error('No se pudo crear el perfil del candidato.');
      }

      const accessToken = tokenService.createAccessToken(account.id, account.role.code);

      return {
        user: {
          id: account.id,
          fullName: account.profile.fullName,
          email: account.email,
          role: account.role.code,
          status: account.status.code,
          createdAt: account.createdAt.toISOString(),
        },
        accessToken,
        tokenType: 'Bearer',
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      };
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes('email')
    ) {
      throw new AppError(409, 'Ya existe una cuenta con este correo electrónico.');
    }

    throw error;
  }
};
