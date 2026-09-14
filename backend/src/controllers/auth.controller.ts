import type { NextFunction, Request, Response } from 'express';
import { registerCandidate } from '../services/auth.service.js';
import type { RegistrationResponse } from '../types/auth.types.js';
import type { RegisterCandidateDTO } from '../validation/auth.schema.js';
import type { AccessContext } from '../types/authorization.types.js';
import { AppError } from '../utils/app-error.js';

/** Returns the caller's effective access metadata, never credentials or other accounts. */
export const getCurrentAccess = (
  request: Request, response: Response<AccessContext>, next: NextFunction,
): void => {
  if (!request.user) {
    next(new AppError(401, 'Debes iniciar sesión para realizar esta acción.'));
    return;
  }
  response.set('Cache-Control', 'no-store').json(request.user);
};

/** Express request whose body has already passed the registration validator. */
interface RegistrationRequest extends Request {
  body: RegisterCandidateDTO;
}

/** Returns the created candidate and access token, delegating business rules. */
export const register = async (
  request: RegistrationRequest,
  response: Response<RegistrationResponse>,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await registerCandidate(request.body);
    response.set('Cache-Control', 'no-store').status(201).json(result);
  } catch (error: unknown) {
    next(error);
  }
};
