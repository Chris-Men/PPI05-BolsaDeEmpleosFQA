import { Router, type RequestHandler } from 'express';
import * as controller from '../controllers/profile.controller.js';
import { authenticate } from '../middleware/authorization.middleware.js';
import { protectSessionMutation } from '../middleware/session-cookie.middleware.js';
import { receiveResume } from '../middleware/resume-upload.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { PERMISSIONS, type PermissionCode } from '../constants/authorization.constants.js';
import { assertCandidateAccess } from '../services/profile.service.js';
import { updateProfileSchema } from '../validation/profile.schema.js';
import { AppError } from '../utils/app-error.js';

/** Checks role and grant before parsing any profile or file input. */
const authorize = (permission: PermissionCode): RequestHandler => (request, _response, next): void => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    assertCandidateAccess(request.user, permission); next();
  } catch (error: unknown) { next(error); }
};
/** All resources are selected by the session owner; no account or file ID is accepted. */
export const profileRouter = Router();
profileRouter.use(authenticate);
profileRouter.get('/me', authorize(PERMISSIONS.PROFILE_READ_OWN), controller.get);
profileRouter.patch('/me', authorize(PERMISSIONS.PROFILE_UPDATE_OWN), protectSessionMutation,
  validateBody(updateProfileSchema), controller.update);
profileRouter.get('/me/resume', authorize(PERMISSIONS.PROFILE_READ_OWN), controller.resume);
profileRouter.get('/me/resume/download', authorize(PERMISSIONS.PROFILE_READ_OWN), controller.download);
profileRouter.put('/me/resume', authorize(PERMISSIONS.PROFILE_RESUME_UPLOAD_OWN), protectSessionMutation, receiveResume, controller.upload);
profileRouter.delete('/me/resume', authorize(PERMISSIONS.PROFILE_RESUME_UPLOAD_OWN), protectSessionMutation, controller.remove);
