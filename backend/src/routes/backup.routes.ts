import { Router } from 'express';
import { backupAction } from '../controllers/backup.controller.js';
import { authenticate, requirePermission, requireRole } from '../middleware/authorization.middleware.js';
import { protectSessionMutation } from '../middleware/session-cookie.middleware.js';
import { PERMISSIONS } from '../constants/authorization.constants.js';

/** Monitor tokens are read-only capabilities: never bearer sessions or query-string credentials. */
export const backupRouter = Router();
backupRouter.get('/operations/:id', backupAction('operation'));
backupRouter.use(authenticate, requireRole('SUPER_ADMIN'));
backupRouter.get('/', requirePermission(PERMISSIONS.DATABASE_BACKUP), backupAction('status'));
backupRouter.post('/', protectSessionMutation, requirePermission(PERMISSIONS.DATABASE_BACKUP), backupAction('create'));
backupRouter.post('/restore', protectSessionMutation, requirePermission(PERMISSIONS.DATABASE_RESTORE), backupAction('restore'));
