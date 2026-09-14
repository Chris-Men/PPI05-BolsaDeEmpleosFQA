import { Router } from 'express';
import { getCurrentAccess, register } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authorization.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { registerCandidateSchema } from '../validation/auth.schema.js';

/** Public authentication routes with explicit validation before controllers. */
export const authRouter = Router();

authRouter.post('/register', validateBody(registerCandidateSchema), register);
authRouter.get('/me', authenticate, getCurrentAccess);
