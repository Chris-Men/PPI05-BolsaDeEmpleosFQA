import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

/** Router that exposes infrastructure-oriented API endpoints. */
export const healthRouter = Router();

healthRouter.get('/health', getHealth);
