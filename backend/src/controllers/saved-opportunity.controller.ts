import type { Request, Response, NextFunction } from 'express';
import type { AccessContext } from '../types/authorization.types.js';
import * as service from '../services/saved-opportunity.service.js';
import { emptySavedMutationSchema, savedOpportunityQuerySchema } from '../validation/saved-opportunity.schema.js';
import { opportunityKeySchema } from '../validation/opportunity.schema.js';
import { AppError } from '../utils/app-error.js';

/** Delegates validated requests while preventing private responses from being cached. */
const endpoint = (operation: (request: Request, actor: AccessContext) => Promise<unknown>, status = 200) =>
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
      const result = await operation(request, request.user);
      response.set('Cache-Control', 'no-store');
      if (status === 204) response.sendStatus(204); else response.status(status).json(result);
    } catch (error: unknown) { next(error); }
  };

export const list = endpoint((request, actor) => service.listSavedOpportunities(savedOpportunityQuerySchema.parse(request.query), actor));
export const keys = endpoint((request, actor) => { emptySavedMutationSchema.parse(request.query); return service.savedOpportunityKeys(actor); });
export const save = endpoint((request, actor) => {
  emptySavedMutationSchema.parse(request.body ?? {});
  return service.saveOpportunity(opportunityKeySchema.parse(request.params.key), actor);
}, 204);
export const remove = endpoint((request, actor) => {
  emptySavedMutationSchema.parse(request.body ?? {});
  return service.removeSavedOpportunity(opportunityKeySchema.parse(request.params.key), actor);
}, 204);
