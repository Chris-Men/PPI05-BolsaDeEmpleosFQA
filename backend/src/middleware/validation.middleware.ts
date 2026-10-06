import type { RequestHandler } from 'express';
import type { z } from 'zod';

/** Validates and normalizes the body before it reaches a typed controller. */
export const validateBody = <T>(schema: z.ZodType<T>): RequestHandler =>
  (request, _response, next): void => {
    const payload: unknown = request.body;
    const result = schema.safeParse(payload);

    if (!result.success) {
      next(result.error);
      return;
    }

    request.body = result.data;
    next();
  };

/** Stores validated query parameters in locals because Express 5 exposes a read-only query getter. */
export const validateQuery = <T>(schema: z.ZodType<T>): RequestHandler =>
  (request, response, next): void => {
    const result = schema.safeParse(request.query);
    if (!result.success) { next(result.error); return; }
    response.locals.query = result.data;
    next();
  };
