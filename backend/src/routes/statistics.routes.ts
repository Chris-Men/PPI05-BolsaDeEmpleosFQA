import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/authorization.middleware.js';
import { PERMISSIONS } from '../constants/authorization.constants.js';
import { statistics } from '../controllers/statistics.controller.js';

/** Granular grants are checked before filters; service also enforces the administrative role. */
export const statisticsRouter = Router();
statisticsRouter.use(authenticate, requirePermission(PERMISSIONS.STATISTICS_READ));
statisticsRouter.get('/dashboard', statistics(true));
statisticsRouter.get('/', statistics());
