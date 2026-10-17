import type { Request, Response, NextFunction } from 'express';
import { dashboardQuerySchema, statisticsRangeSchema } from '../validation/statistics.schema.js';
import { getDashboardStatistics, getStatistics } from '../services/statistics.service.js';
import { AppError } from '../utils/app-error.js';

/** Validates filters and delegates all aggregate queries to the service. */
export const statistics = (dashboard = false) => async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    const result = dashboard
      ? (dashboardQuerySchema.parse(request.query), await getDashboardStatistics(request.user))
      : await getStatistics(statisticsRangeSchema.parse(request.query), request.user);
    response.set('Cache-Control', 'no-store').json(result);
  } catch (error: unknown) { next(error); }
};
