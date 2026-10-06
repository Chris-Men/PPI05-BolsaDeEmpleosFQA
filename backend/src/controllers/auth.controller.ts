import type { NextFunction, Request, Response } from 'express';
import { registerCandidate } from '../services/auth.service.js';
import type { RegistrationResponse } from '../types/auth.types.js';
import type { RegisterCandidateDTO } from '../validation/auth.schema.js';

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
