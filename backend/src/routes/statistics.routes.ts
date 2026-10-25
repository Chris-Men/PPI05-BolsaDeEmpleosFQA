import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/authorization.middleware.js';
import { PERMISSIONS } from '../constants/authorization.constants.js';
import { statistics } from '../controllers/statistics.controller.js';
import { createExcelExport, downloadExcelExport, getExcelExport, listExcelExports } from '../controllers/statistics-export.controller.js';
import { protectSessionMutation } from '../middleware/session-cookie.middleware.js';

/** Granular grants are checked before filters; service also enforces the administrative role. */
export const statisticsRouter = Router();
statisticsRouter.use(authenticate, requirePermission(PERMISSIONS.STATISTICS_READ));
statisticsRouter.get('/dashboard', statistics(true));
statisticsRouter.post('/exports', requirePermission(PERMISSIONS.STATISTICS_EXPORT), protectSessionMutation, createExcelExport);
statisticsRouter.get('/exports', requirePermission(PERMISSIONS.STATISTICS_EXPORT), listExcelExports);
statisticsRouter.get('/exports/:id/file', requirePermission(PERMISSIONS.STATISTICS_EXPORT), downloadExcelExport);
statisticsRouter.get('/exports/:id', requirePermission(PERMISSIONS.STATISTICS_EXPORT), getExcelExport);
statisticsRouter.get('/', statistics());
