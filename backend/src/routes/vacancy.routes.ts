import { Router, type RequestHandler } from 'express';
import * as controller from '../controllers/vacancy.controller.js';
import { PERMISSIONS, type PermissionCode } from '../constants/authorization.constants.js';
import { authenticate } from '../middleware/authorization.middleware.js';
import { protectSessionMutation } from '../middleware/session-cookie.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import { assertVacancyAccess } from '../services/vacancy-policy.service.js';
import { AppError } from '../utils/app-error.js';
import { createOpportunitySchema, updateOpportunitySchema, opportunityStatusSchema, listOpportunitiesSchema } from '../validation/opportunity.schema.js';
import { createCategorySchema, updateCategorySchema, listCategoriesSchema } from '../validation/category.schema.js';

/** Authorization precedes payload validation and database lookup. */
const grant = (permission: PermissionCode): RequestHandler => (request, _response, next): void => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    assertVacancyAccess(request.user, permission);
    next();
  } catch (error: unknown) { next(error); }
};
/** Public read-only opportunity catalog. */
export const publicOpportunityRouter = Router();
publicOpportunityRouter.get('/catalogs', controller.catalogs);
publicOpportunityRouter.get('/', validateQuery(listOpportunitiesSchema), controller.listPublic);
publicOpportunityRouter.get('/:key', controller.getPublic);
/** Public category catalog excludes inactive records. */
export const publicCategoryRouter = Router();
publicCategoryRouter.get('/', controller.publicCategories);
/** Administrative mutation endpoints require both role and granular grants. */
export const adminOpportunityRouter = Router();
adminOpportunityRouter.use(authenticate);
adminOpportunityRouter.get('/catalogs', grant(PERMISSIONS.OPPORTUNITY_READ), controller.catalogs);
adminOpportunityRouter.get('/', grant(PERMISSIONS.OPPORTUNITY_READ), validateQuery(listOpportunitiesSchema), controller.listAdmin);
adminOpportunityRouter.get('/:key', grant(PERMISSIONS.OPPORTUNITY_READ), controller.getAdmin);
adminOpportunityRouter.post('/', grant(PERMISSIONS.OPPORTUNITY_CREATE), protectSessionMutation, validateBody(createOpportunitySchema), controller.createOpportunity);
adminOpportunityRouter.patch('/:key', grant(PERMISSIONS.OPPORTUNITY_UPDATE), protectSessionMutation, validateBody(updateOpportunitySchema), controller.updateOpportunity);
adminOpportunityRouter.patch('/:key/status', grant(PERMISSIONS.OPPORTUNITY_STATUS_UPDATE), protectSessionMutation, validateBody(opportunityStatusSchema), controller.statusOpportunity);
adminOpportunityRouter.delete('/:key', grant(PERMISSIONS.OPPORTUNITY_ARCHIVE), protectSessionMutation, controller.archiveOpportunity);
/** Categories preserve the shared hierarchy used by all four opportunity types. */
export const adminCategoryRouter = Router();
adminCategoryRouter.use(authenticate);
adminCategoryRouter.get('/', grant(PERMISSIONS.CATEGORY_READ), validateQuery(listCategoriesSchema), controller.listCategories);
adminCategoryRouter.post('/', grant(PERMISSIONS.CATEGORY_CREATE), protectSessionMutation, validateBody(createCategorySchema), controller.createCategory);
adminCategoryRouter.patch('/:id', grant(PERMISSIONS.CATEGORY_UPDATE), protectSessionMutation, validateBody(updateCategorySchema), controller.updateCategory);
adminCategoryRouter.delete('/:id', grant(PERMISSIONS.CATEGORY_DELETE), protectSessionMutation, controller.deleteCategory);
