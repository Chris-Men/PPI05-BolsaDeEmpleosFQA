import { changeStatus, deleteUser, restoreUser } from '../controllers/user-lifecycle.controller.js';
import { changeUserStatusSchema, deleteAccountSchema, restoreAccountSchema } from '../validation/user-lifecycle.schema.js';
import { Router } from 'express';
import { create, list, update } from '../controllers/admin-user.controller.js';
import { authenticate, requirePermission, requireRole } from '../middleware/authorization.middleware.js';
import { protectSessionMutation } from '../middleware/session-cookie.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import { createUserSchema, listUsersSchema, updateUserSchema } from '../validation/admin-user.schema.js';
import { PERMISSIONS } from '../constants/authorization.constants.js';

/** Role-scoped listing/creation; only Super Admin can edit accounts. */
export const adminUserRouter = Router();
adminUserRouter.use(authenticate);
// Services enforce administrative roles and the permission for the requested scope.
adminUserRouter.get('/', validateQuery(listUsersSchema), list);
// Creation permissions depend on the requested role and are checked in the service.
adminUserRouter.post('/', protectSessionMutation, validateBody(createUserSchema), create);
adminUserRouter.patch('/:id', requireRole('SUPER_ADMIN'), protectSessionMutation, requirePermission(PERMISSIONS.USERS_UPDATE),
  validateBody(updateUserSchema), update);

adminUserRouter.patch('/:id/status', protectSessionMutation, validateBody(changeUserStatusSchema), changeStatus);
adminUserRouter.delete('/:id', protectSessionMutation, validateBody(deleteAccountSchema), deleteUser);
adminUserRouter.post('/:id/restore', requireRole('SUPER_ADMIN'), protectSessionMutation,
  validateBody(restoreAccountSchema), restoreUser);
