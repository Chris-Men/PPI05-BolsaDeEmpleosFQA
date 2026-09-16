import { Router } from 'express';
import { getCurrentAccess, login, logout, logoutAll, refresh, register, revokeSessions } from '../controllers/auth.controller.js';
import { authenticate, requirePermission, requireRole } from '../middleware/authorization.middleware.js';
import { protectSessionMutation } from '../middleware/session-cookie.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { loginSchema, registerCandidateSchema } from '../validation/auth.schema.js';
import { PERMISSIONS } from '../constants/authorization.constants.js';

/** Authentication routes with explicit input, origin and authorization checks. */
export const authRouter = Router();
authRouter.use((_request, response, next) => { response.set('Cache-Control', 'no-store'); next(); });
authRouter.post('/register', protectSessionMutation, validateBody(registerCandidateSchema), register);
authRouter.post('/login', protectSessionMutation, validateBody(loginSchema), login);
authRouter.post('/refresh', protectSessionMutation, refresh);
authRouter.post('/logout', protectSessionMutation, logout);
authRouter.post('/logout-all', protectSessionMutation, authenticate, logoutAll);
authRouter.post('/users/:userId/revoke-sessions', protectSessionMutation, authenticate,
  requireRole('SUPER_ADMIN'), requirePermission(PERMISSIONS.SESSION_REVOKE_ANY), revokeSessions);
authRouter.get('/me', authenticate, getCurrentAccess);
