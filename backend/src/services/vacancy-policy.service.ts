import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import type { PermissionCode } from '../constants/authorization.constants.js';
import type { AccessContext } from '../types/authorization.types.js';
import { AppError } from '../utils/app-error.js';
import { assertPermission } from './authorization.service.js';

/** Administrative role and operation grant are independently mandatory. */
export const assertVacancyAccess = (actor: AccessContext, permission: PermissionCode): void => {
  if (!actor.roles.some((role) => role === 'ADMINISTRATOR' || role === 'SUPER_ADMIN')) {
    throw new AppError(403, 'Solo los administradores pueden gestionar vacantes y categorías.');
  }
  assertPermission(actor, permission);
};
/** Serializable operations protect hierarchy, lifecycle, references and audit atomically. */
export const mutateVacancy = async <T>(operation: (database: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2034' && attempt < 2) continue;
        if (error.code === 'P2002') throw new AppError(409, 'Ya existe un registro con ese nombre.');
        if (error.code === 'P2003') throw new AppError(409, 'El registro tiene relaciones que impiden esta operación.');
        if (error.code === 'P2025') throw new AppError(404, 'El registro ya no existe.');
        if (error.code === 'P2034') throw new AppError(409, 'Los datos cambiaron durante la operación. Intenta nuevamente.');
      }
      throw error;
    }
  }
  throw new AppError(409, 'No se pudo completar la operación.');
};
/** Creates a deterministic URL label without relying on user-supplied identifiers. */
export const vacancySlug = (name: string): string => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
