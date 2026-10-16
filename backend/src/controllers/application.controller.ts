import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AccessContext } from '../types/authorization.types.js';
import * as service from '../services/application.service.js';
import * as notifications from '../services/notification.service.js';
import { applicationFiltersSchema, applicationDecisionSchema, applicationWithdrawSchema, createDraftSchema, updateDraftSchema, submitApplicationSchema, notificationFiltersSchema } from '../validation/application.schema.js';
import { AppError } from '../utils/app-error.js';
/** Controller wrappers handle only HTTP, validated DTOs and delegation. */
const endpoint = (operation: (request: Request, actor: AccessContext) => Promise<unknown>, status = 200) =>
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
      const result = await operation(request, request.user);
      response.set('Cache-Control','no-store');
      if (status === 204) response.sendStatus(204); else response.status(status).json(result);
    } catch (error: unknown) { next(error); }
  };
const id = (request: Request): number => z.coerce.number().int().positive().max(2147483647).parse(request.params.id);
const draftId = (request: Request): string => z.string().uuid().parse(request.params.id);
export const drafts = endpoint((request, actor) => { const query=applicationFiltersSchema.parse(request.query); return service.listDrafts(actor,query.page,query.pageSize); });
export const createDraft = endpoint((request, actor) => service.createDraft(createDraftSchema.parse(request.body).opportunityKey, actor), 201);
export const draft = endpoint((request, actor) => service.getDraft(draftId(request), actor));
export const updateDraft = endpoint((request, actor) => service.updateDraft(draftId(request), updateDraftSchema.parse(request.body), actor));
export const deleteDraft = endpoint((request, actor) => service.deleteDraft(draftId(request), actor), 204);
export const submit = endpoint((request, actor) => { const payload = submitApplicationSchema.parse(request.body); return service.submitApplication(payload.draftId, payload.version, actor); }, 201);
export const list = (admin = false) => endpoint((request, actor) => service.listApplications(applicationFiltersSchema.parse(request.query), actor, admin));
export const get = (admin = false) => endpoint((request, actor) => service.getApplication(id(request), actor, admin));
export const statistics = endpoint((request, actor) => service.applicationStatistics(applicationFiltersSchema.parse(request.query), actor));
export const decision = endpoint((request, actor) => service.decideApplication(id(request), applicationDecisionSchema.parse(request.body), actor));
export const withdraw = endpoint((request, actor) => service.changeApplicationStatus(id(request), 'WITHDRAWN', applicationWithdrawSchema.parse(request.body).version, undefined, actor));
export const listNotifications = endpoint((request, actor) => { const query = notificationFiltersSchema.parse(request.query); return notifications.listNotifications(query.page, query.pageSize, query.unread, actor); });
export const readNotification = endpoint((request, actor) => notifications.readNotification(id(request), actor), 204);
export const readAllNotifications = endpoint((_request, actor) => notifications.readNotification(null, actor), 204);
/** Every binary request authenticates and authorizes the specific application before reading bytes. */
export const download = (admin = false, draft = false) => async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    const file = await service.downloadApplicationResume(draft ? draftId(request) : id(request), request.user, admin, draft);
    response.set('Cache-Control','no-store').set('X-Content-Type-Options','nosniff').attachment(file.name).type('application/pdf').send(file.content);
  } catch (error: unknown) { next(error); }
};
