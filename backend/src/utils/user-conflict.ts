import { Prisma } from '@prisma/client';
import { AppError } from './app-error.js';

/** Maps uniqueness and concurrent mutations without exposing database details. */
export const rethrowUserConflict = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002' && Array.isArray(error.meta?.target) && error.meta.target.includes('email')) {
      throw new AppError(409, 'Ya existe una cuenta con este correo electrónico.');
    }
    if (error.code === 'P2034') {
      throw new AppError(409, 'La cuenta cambió mientras guardabas. Actualiza la lista e inténtalo de nuevo.');
    }
  }
  throw error;
};
