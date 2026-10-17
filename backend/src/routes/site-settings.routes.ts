import { Router } from 'express';
import { authenticate, requirePermission, requireRole } from '../middleware/authorization.middleware.js';
import { protectSessionMutation } from '../middleware/session-cookie.middleware.js';
import { PERMISSIONS } from '../constants/authorization.constants.js';
import { siteSettings } from '../controllers/site-settings.controller.js';

/** Public settings never expose version, audit or other SystemSettings keys. */
export const publicSiteSettingsRouter = Router();
publicSiteSettingsRouter.get('/', siteSettings('public'));
export const adminSiteSettingsRouter = Router();
adminSiteSettingsRouter.use(authenticate);
adminSiteSettingsRouter.get('/', requirePermission(PERMISSIONS.SITE_SETTINGS_READ), siteSettings('read'));
adminSiteSettingsRouter.put('/', requireRole('SUPER_ADMIN'), requirePermission(PERMISSIONS.SITE_SETTINGS_UPDATE), protectSessionMutation, siteSettings('save'));
adminSiteSettingsRouter.post('/reset', requireRole('SUPER_ADMIN'), requirePermission(PERMISSIONS.SITE_SETTINGS_UPDATE), protectSessionMutation, siteSettings('reset'));
