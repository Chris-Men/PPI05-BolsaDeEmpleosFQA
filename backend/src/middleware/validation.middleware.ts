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
