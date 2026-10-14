import { Router } from 'express';
import { authenticate } from '../middleware/authorization.middleware.js';
import { protectSessionMutation } from '../middleware/session-cookie.middleware.js';
import * as controller from '../controllers/saved-opportunity.controller.js';

/** All bookmarks belong to the authenticated candidate; every mutation also checks session protections. */
export const savedOpportunityRouter = Router();
savedOpportunityRouter.use(authenticate);
savedOpportunityRouter.get('/keys', controller.keys);
savedOpportunityRouter.get('/', controller.list);
savedOpportunityRouter.put('/:key', protectSessionMutation, controller.save);
savedOpportunityRouter.delete('/:key', protectSessionMutation, controller.remove);
