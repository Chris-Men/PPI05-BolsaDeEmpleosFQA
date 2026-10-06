import { Router } from 'express';
import { getDebugUsers } from '../controllers/debug.controller.js';
import { authenticate, requireRole } from '../middleware/authorization.middleware.js';

/** Temporary diagnostic routes; mounted only in development by createApp. */
export const debugRouter = Router();

debugRouter.get('/users', authenticate, requireRole('SUPER_ADMIN'), getDebugUsers);
