import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { DEFAULT_SITE_SETTINGS, SITE_SETTINGS_KEY } from '../constants/site-settings.constants.js';
import { PERMISSIONS } from '../constants/authorization.constants.js';
import type { AccessContext } from '../types/authorization.types.js';
import { siteConfigurationSchema, storedSiteSettingsSchema, type SiteConfiguration, type StoredSiteSettings } from '../validation/site-settings.schema.js';
import { assertVacancyAccess } from './vacancy-policy.service.js';
import { assertPermission } from './authorization.service.js';
import { AppError } from '../utils/app-error.js';

/** The seed never replaces customized values or unrelated system settings. */
export const seedSiteSettings = async (database: PrismaClient): Promise<void> => {
  await database.systemSettings.upsert({ where: { settingKey: SITE_SETTINGS_KEY }, update: {},
    create: { settingKey: SITE_SETTINGS_KEY, settingValue: JSON.stringify({ version: 1, configuration: siteConfigurationSchema.parse(DEFAULT_SITE_SETTINGS) }) } });
};

/** Invalid persisted documents fail safely instead of publishing arbitrary settings or credentials. */
const decode = (value: string): StoredSiteSettings => {
  try { return storedSiteSettingsSchema.parse(JSON.parse(value)); }
  catch { throw new AppError(503, 'No se pudo leer la configuración del sitio. Inténtalo nuevamente.'); }
};

/** Reading is side-effect free, including before the initial seed is deployed. */
const read = async (database: Prisma.TransactionClient = prisma) => {
  const row = await database.systemSettings.findUnique({ where: { settingKey: SITE_SETTINGS_KEY } });
  return row ? decode(row.settingValue) : { version: 0, configuration: siteConfigurationSchema.parse(DEFAULT_SITE_SETTINGS) };
};

/** Public projection contains only the four explicitly editable content groups. */
export const getPublicSiteSettings = async (): Promise<SiteConfiguration> => siteConfigurationSchema.parse((await read()).configuration);

/** Administrators may inspect settings; candidates cannot inspect administrative metadata. */
export const getAdminSiteSettings = async (actor: AccessContext) => {
  assertVacancyAccess(actor, PERMISSIONS.SITE_SETTINGS_READ);
  return read();
};

/** Compare-and-swap and audit commit atomically; a stale editor never overwrites another save. */
export const writeSiteSettings = async (version: number, configuration: SiteConfiguration, actor: AccessContext, reset = false) => {
  if (!actor.roles.includes('SUPER_ADMIN')) throw new AppError(403, 'Solo Super Admin puede modificar la configuración del sitio.');
  assertPermission(actor, PERMISSIONS.SITE_SETTINGS_UPDATE);
  const validated = siteConfigurationSchema.parse(configuration);
  try {
    return await prisma.$transaction(async database => {
      const row = await database.systemSettings.findUnique({ where: { settingKey: SITE_SETTINGS_KEY } });
      const before = row ? decode(row.settingValue) : { version: 0, configuration: DEFAULT_SITE_SETTINGS };
      if (before.version !== version) throw new AppError(409, 'La configuración cambió en otra sesión. Recarga antes de guardar.');
      const after = { version: version + 1, configuration: validated };
      const settingValue = JSON.stringify(after);
      let id: number;
      if (row) {
        const result = await database.systemSettings.updateMany({ where: { id: row.id, settingValue: row.settingValue }, data: { settingValue, updatedAt: new Date() } });
        if (result.count !== 1) throw new AppError(409, 'La configuración cambió en otra sesión. Recarga antes de guardar.');
        id = row.id;
      } else id = (await database.systemSettings.create({ data: { settingKey: SITE_SETTINGS_KEY, settingValue } })).id;
      await database.auditLogs.create({ data: { userId: actor.userId, entityType: 'SiteSettings', entityId: id, action: reset ? 'RESET' : 'UPDATE', changes: { before, after } } });
      return after;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code)) {
      throw new AppError(409, 'La configuración cambió en otra sesión. Recarga antes de guardar.');
    }
    throw error;
  }
};
