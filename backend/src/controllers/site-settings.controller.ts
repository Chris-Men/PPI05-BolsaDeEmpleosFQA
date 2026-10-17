import type { Request, Response, NextFunction } from 'express';
import { DEFAULT_SITE_SETTINGS } from '../constants/site-settings.constants.js';
import * as service from '../services/site-settings.service.js';
import { saveSiteSettingsSchema, resetSiteSettingsSchema } from '../validation/site-settings.schema.js';
import { dashboardQuerySchema } from '../validation/statistics.schema.js';
import { AppError } from '../utils/app-error.js';

/** Controllers perform only input and identity checks; persistence and authorization stay in services. */
export const siteSettings = (action: 'public' | 'read' | 'save' | 'reset') =>
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      dashboardQuerySchema.parse(request.query);
      if (action === 'public') { response.set('Cache-Control', 'no-store').json(await service.getPublicSiteSettings()); return; }
      if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
      let result;
      if (action === 'read') result = await service.getAdminSiteSettings(request.user);
      else if (action === 'save') {
        const payload = saveSiteSettingsSchema.parse(request.body);
        result = await service.writeSiteSettings(payload.version, payload.configuration, request.user);
      } else result = await service.writeSiteSettings(resetSiteSettingsSchema.parse(request.body).version, DEFAULT_SITE_SETTINGS, request.user, true);
      response.set('Cache-Control', 'no-store').json(result);
    } catch (error: unknown) { next(error); }
  };
