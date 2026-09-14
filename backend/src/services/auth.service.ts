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
  const passwordHash = await bcrypt.hash(payload.password, PASSWORD_HASH_ROUNDS);
  const nameParts = payload.fullName.trim().split(/\s+/);
  const lastName = nameParts.pop() ?? payload.fullName;
  const firstName = nameParts.join(' ') || lastName;

  try {
    return await prisma.$transaction(async (transaction) => {
      const account = await transaction.user.create({
        data: {
          email: payload.email,
          passwordHash,
          status: { connect: { name: 'Activo' } },
          profile: { create: { firstName, lastName } },
          userRoles: {
            create: { roles: { connect: { name: 'Candidato' } } },
          },
        },
        select: {
          id: true,
          email: true,
          createdAt: true,
          userRoles: { select: { roles: { select: { name: true } } } },
          status: { select: { name: true } },
          profile: { select: { firstName: true, lastName: true } },
        },
      });

      const role = account.userRoles[0]?.roles;
      if (!account.profile || !role) {
        throw new Error('No se pudo crear el perfil del candidato.');
      }

      const accessToken = tokenService.createAccessToken(
        account.id.toString(),
        CANDIDATE_ROLE_CODE,
      );

      return {
        user: {
          id: account.id,
          fullName: `${account.profile.firstName} ${account.profile.lastName}`,
          email: account.email,
          role: CANDIDATE_ROLE_CODE,
          status: ACTIVE_USER_STATUS_CODE,
          createdAt: account.createdAt?.toISOString() ?? new Date().toISOString(),
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
