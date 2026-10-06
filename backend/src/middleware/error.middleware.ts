import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/app-error.js';

/** Sends localized errors without logging bodies, credentials or raw exceptions. */
export const errorHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction,
): void => {
  if (response.headersSent) {
    next(new Error('Ocurri? un error interno en el servidor.'));
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      message: 'Los datos de la solicitud no son válidos.',
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  if (
    error instanceof SyntaxError &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  ) {
    response.status(400).json({ message: 'El cuerpo de la solicitud debe ser JSON válido.' });
    return;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.too.large'
  ) {
    response.status(413).json({ message: 'El cuerpo de la solicitud es demasiado grande.' });
    return;
  }

  console.error('Ocurrió un error interno al procesar la solicitud.');
  response.status(500).json({ message: 'Ocurrió un error interno en el servidor.' });
};
