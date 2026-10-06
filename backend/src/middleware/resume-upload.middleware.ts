import multer from 'multer';
import type { RequestHandler } from 'express';
import { MAX_RESUME_BYTES } from '../services/resume.service.js';
import { getResumeStorage } from '../services/resume-storage.service.js';
import { AppError } from '../utils/app-error.js';

// Multer handles streaming multipart boundaries and limits without a custom HTTP parser.
const upload = multer({ storage: multer.memoryStorage(), limits: {
  fileSize: MAX_RESUME_BYTES, files: 1, fields: 0, parts: 1,
} }).single('file');

/** Invoked only after authentication and permission checks, with safe localized failures. */
export const receiveResume: RequestHandler = (request, response, next): void => {
  try { getResumeStorage(); } catch (error: unknown) { next(error); return; }
  upload(request, response, (error: unknown) => {
    if (error) {
      next(new AppError(error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
        error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
          ? 'El CV no debe superar 5 MB.' : 'Envía únicamente un archivo PDF en el campo file.'));
    } else if (!request.file) next(new AppError(400, 'Selecciona un CV en formato PDF.'));
    else next();
  });
};
