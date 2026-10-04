import type { NextFunction, Request, Response } from 'express';
import { getCandidateProfile, updateCandidateProfile } from '../services/profile.service.js';
import { deleteResume, downloadResume, getResume, uploadResume } from '../services/resume.service.js';
import type { UpdateProfileDTO } from '../validation/profile.schema.js';
import { AppError } from '../utils/app-error.js';

/** Returns the profile owned by the authenticated candidate. */
export const get = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    response.json(await getCandidateProfile(request.user));
  } catch (error: unknown) { next(error); }
};
/** Delegates a validated partial profile edit to the transactional service. */
export const update = async (request: Request<Record<string, never>, unknown, UpdateProfileDTO>, response: Response, next: NextFunction): Promise<void> => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    response.json(await updateCandidateProfile(request.body, request.user));
  } catch (error: unknown) { next(error); }
};
/** Returns safe current resume metadata, or null when none is active. */
export const resume = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    response.json(await getResume(request.user));
  } catch (error: unknown) { next(error); }
};
/** Receives the already bounded multipart document. */
export const upload = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    if (!request.file) throw new AppError(400, 'Selecciona un CV.');
    response.json(await uploadResume(request.file, request.user));
  } catch (error: unknown) { next(error); }
};
/** Detaches the current document without deleting historical application attachments. */
export const remove = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    await deleteResume(request.user); response.sendStatus(204);
  } catch (error: unknown) { next(error); }
};
/** Downloads authorized bytes with no-store and attachment disposition. */
export const download = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    const file = await downloadResume(request.user);
    response.attachment(file.metadata.originalName).type('application/pdf').set('X-Content-Type-Options', 'nosniff').send(file.content);
  } catch (error: unknown) { next(error); }
};
