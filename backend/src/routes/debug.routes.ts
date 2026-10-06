import { Router } from 'express';
import { getDebugUsers } from '../controllers/debug.controller.js';

/** Temporary diagnostic routes; mounted only in development by createApp. */
export const debugRouter = Router();

debugRouter.get('/users', getDebugUsers);
