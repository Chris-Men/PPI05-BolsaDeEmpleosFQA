import { Router } from 'express';
import { register } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { registerCandidateSchema } from '../validation/auth.schema.js';

/** Public authentication routes with explicit validation before controllers. */
export const authRouter = Router();

authRouter.post('/register', validateBody(registerCandidateSchema), register);
