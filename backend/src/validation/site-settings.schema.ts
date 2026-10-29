import { z } from 'zod';
import { emailSchema, requiredText } from './common.schema.js';
import { localPhoneDigits } from '../utils/local-phone.js';

/** Bounded plain text is rendered through React escaping, never interpreted as markup. */
const text = (label: string, limit: number) => requiredText(label).trim().max(limit, `El campo ${label} no puede superar ${limit} caracteres.`);
const historicalPhone = text('teléfono', 30).refine(value => !value || /^[+()\d\s.-]+$/.test(value) && value.replace(/\D/g, '').length >= 7 && value.replace(/\D/g, '').length <= 15, 'Escribe un teléfono válido.');
const phone = text('teléfono', 30).refine(value => !value || localPhoneDigits(value) !== null, 'Ingresa ocho dígitos con prefijo +503.')
  .transform(value => { const digits = localPhoneDigits(value); return digits ? '+503 ' + digits.slice(0, 4) + '-' + digits.slice(4) : ''; });
const link = text('enlace', 2048).refine(value => {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}, 'Escribe una URL HTTPS válida, sin credenciales.');

/** Removed prototype groups are rejected, including operational publication flags. */
export const siteConfigurationSchema = z.object({
  contacto: z.object({ correo: z.union([emailSchema, z.literal('')]), correoSoporte: z.union([emailSchema, z.literal('')]), telefono: phone, whatsapp: phone, direccion: text('dirección', 500) }).strict('Contacto incluye campos no permitidos.'),
  inicio: z.object({ titulo: text('título', 180).min(1, 'El título es obligatorio.'), subtitulo: text('subtítulo', 500), descripcion: text('descripción', 2000) }).strict('Página principal incluye campos no permitidos.'),
  institucional: z.object({ mision: text('misión', 4000), vision: text('visión', 4000) }).strict('Misión y visión incluye campos no permitidos.'),
  redes: z.object({ facebook: link, instagram: link, linkedin: link, youtube: link }).strict('Redes sociales incluye campos no permitidos.'),
}).strict('La configuración incluye campos no permitidos.');
const versionNumber = z.number({ required_error: 'La versión es obligatoria.', invalid_type_error: 'La versión debe ser un número.' })
  .int('La versión debe ser un entero.').min(0, 'La versión no es válida.');
export const settingsVersionSchema = versionNumber.max(2_147_483_646, 'La versión no admite más ediciones.');
export const saveSiteSettingsSchema = z.object({ version: settingsVersionSchema, configuration: siteConfigurationSchema }).strict('La solicitud incluye campos no permitidos.');
export const resetSiteSettingsSchema = z.object({ version: settingsVersionSchema }).strict('La solicitud incluye campos no permitidos.');
/** Legacy documents retain their original contact values; missing support inherits contact once. */
const storedConfigurationSchema = siteConfigurationSchema.extend({ contacto: siteConfigurationSchema.shape.contacto.extend({
  telefono: historicalPhone, whatsapp: historicalPhone, correoSoporte: z.union([emailSchema, z.literal('')]).optional(),
}).transform(value => ({ ...value, correoSoporte: value.correoSoporte ?? value.correo })) });
export const storedSiteSettingsSchema = z.object({ version: versionNumber.min(1).max(2_147_483_647), configuration: storedConfigurationSchema }).strict();
export type SiteConfiguration = z.infer<typeof siteConfigurationSchema>;
export type StoredSiteSettings = z.infer<typeof storedSiteSettingsSchema>;
