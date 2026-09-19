import { Router, type RequestHandler } from 'express';
import { changeStatus, create, get, list, update } from '../controllers/organization.controller.js';
import { PERMISSIONS, type PermissionCode } from '../constants/authorization.constants.js';
import { authenticate } from '../middleware/authorization.middleware.js';
import { protectSessionMutation } from '../middleware/session-cookie.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import { assertOrganizationAccess } from '../services/organization.service.js';
import { AppError } from '../utils/app-error.js';
import {
  changeOrganizationStatusSchema, createOrganizationSchema, listOrganizationsSchema, updateOrganizationSchema,
} from '../validation/organization.schema.js';

/** Checks the same role/grant policy as services before validation or resource lookup. */
const requireOrganizationAccess = (permission: PermissionCode): RequestHandler =>
  (request, _response, next): void => {
    try {
      if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
      assertOrganizationAccess(request.user, permission);
      next();
    } catch (error: unknown) { next(error); }
  };

/** Administrative organization management; no public or membership endpoints. */
export const organizationRouter = Router();
organizationRouter.use(authenticate);
organizationRouter.get('/', requireOrganizationAccess(PERMISSIONS.ORGANIZATION_READ),
  validateQuery(listOrganizationsSchema), list);
organizationRouter.get('/:id', requireOrganizationAccess(PERMISSIONS.ORGANIZATION_READ), get);
organizationRouter.post('/', requireOrganizationAccess(PERMISSIONS.ORGANIZATION_CREATE),
  protectSessionMutation, validateBody(createOrganizationSchema), create);
organizationRouter.patch('/:id', requireOrganizationAccess(PERMISSIONS.ORGANIZATION_UPDATE),
  protectSessionMutation, validateBody(updateOrganizationSchema), update);
organizationRouter.patch('/:id/status', requireOrganizationAccess(PERMISSIONS.ORGANIZATION_STATUS_UPDATE),
  protectSessionMutation, validateBody(changeOrganizationStatusSchema), changeStatus);
