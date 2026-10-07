import type { Request, RequestHandler } from 'express';
import type { AccessContext } from '../types/authorization.types.js';
import { AppError } from '../utils/app-error.js';
import { entityIdSchema } from '../validation/common.schema.js';
import { opportunityKeySchema, type CreateOpportunityDTO, type UpdateOpportunityDTO, type OpportunityQuery } from '../validation/opportunity.schema.js';
import type { CategoryQuery, CreateCategoryDTO, UpdateCategoryDTO } from '../validation/category.schema.js';
import * as opportunities from '../services/opportunity.service.js';
import * as categories from '../services/category.service.js';
import { opportunityCatalogs } from '../services/opportunity-catalog.service.js';

/** Authenticated routes always supply a fresh database-derived access context. */
const actorFor = (request: Request): AccessContext => {
  if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
  return request.user;
};
/** Thin endpoint wrapper forwards validation and service failures to the central handler. */
const endpoint = (operation: (request: Request, query: unknown) => Promise<unknown>, status = 200): RequestHandler =>
  async (request, response, next): Promise<void> => {
    try {
      const result = await operation(request, response.locals.query);
      response.setHeader('Cache-Control', 'no-store');
      if (status === 204) response.status(status).end();
      else response.status(status).json(result);
    } catch (error: unknown) { next(error); }
  };
/** Public vacancy listing cannot choose lifecycle visibility. */
export const listPublic = endpoint((_request, query) => opportunities.listOpportunities(query as OpportunityQuery));
/** Public detail rechecks publication and eligibility. */
export const getPublic = endpoint((request) => opportunities.getOpportunity(opportunityKeySchema.parse(request.params.key)));
/** Administrative listing includes draft and closed records. */
export const listAdmin = endpoint((request, query) => opportunities.listOpportunities(query as OpportunityQuery, actorFor(request)));
/** Administrative detail allows editing drafts. */
export const getAdmin = endpoint((request) => opportunities.getOpportunity(opportunityKeySchema.parse(request.params.key), actorFor(request)));
/** Typed creation delegates all persistence and auditing to the service. */
export const createOpportunity = endpoint((request) => opportunities.createOpportunity(request.body as CreateOpportunityDTO, actorFor(request)), 201);
/** Typed updates preserve omitted collections. */
export const updateOpportunity = endpoint((request) => opportunities.updateOpportunity(opportunityKeySchema.parse(request.params.key), request.body as UpdateOpportunityDTO, actorFor(request)));
/** Publication and closing have a separate permission. */
export const statusOpportunity = endpoint((request) => opportunities.changeOpportunityStatus(opportunityKeySchema.parse(request.params.key), (request.body as { status: 'OPEN' | 'CLOSED' }).status, actorFor(request)));
/** Delete is explicitly a logical archive to protect historical records. */
export const archiveOpportunity = endpoint((request) => opportunities.changeOpportunityStatus(opportunityKeySchema.parse(request.params.key), 'ARCHIVED', actorFor(request)));
/** Selectable dictionaries contain no candidate data. */
export const catalogs = endpoint(() => opportunityCatalogs());
/** Public active-category metadata. */
export const publicCategories = endpoint(() => categories.publicCategories());
/** Administrative filtered category listing. */
export const listCategories = endpoint((request, query) => categories.listCategories(query as CategoryQuery, actorFor(request)));
/** Category creation uses a server-generated normalized slug. */
export const createCategory = endpoint((request) => categories.saveCategory(null, request.body as CreateCategoryDTO, actorFor(request)), 201);
/** Partial category update can also activate or deactivate it. */
export const updateCategory = endpoint((request) => categories.saveCategory(entityIdSchema.parse(request.params.id), request.body as UpdateCategoryDTO, actorFor(request)));
/** Only unreferenced leaf categories can be removed. */
export const deleteCategory = endpoint((request) => categories.deleteCategory(entityIdSchema.parse(request.params.id), actorFor(request)), 204);
