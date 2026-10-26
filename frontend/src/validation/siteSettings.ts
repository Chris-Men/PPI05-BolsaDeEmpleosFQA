import type { SiteConfiguration } from '../config/siteConfiguration';
import { phoneDigits } from '../utils/phone';
import { safeSocialUrl } from '../utils/siteLinks';
import { emailError, fieldErrors } from './fields';

/** Complete configuration validation mirrors the API; the UI reveals only touched fields. */
export const validateSiteSettings = (value: SiteConfiguration): Record<string, string> => {
  const errors: Record<string, string> = {
    'contacto.correo': emailError(value.contacto.correo, false),
    'contacto.correoSoporte': emailError(value.contacto.correoSoporte, false),
    'inicio.titulo': value.inicio.titulo.trim() ? '' : 'El título es obligatorio.',
  };
  for (const field of ['telefono', 'whatsapp'] as const) if (value.contacto[field] && !phoneDigits(value.contacto[field])) errors['contacto.' + field] = 'Ingresa ocho dígitos con prefijo +503.';
  const limits = { contacto: { correo: 255, correoSoporte: 255, telefono: 30, whatsapp: 30, direccion: 500 }, inicio: { titulo: 180, subtitulo: 500, descripcion: 2000 }, institucional: { mision: 4000, vision: 4000 }, redes: { facebook: 2048, instagram: 2048, linkedin: 2048, youtube: 2048 } };
  for (const section of Object.keys(limits) as Array<keyof SiteConfiguration>) for (const [field, limit] of Object.entries(limits[section])) {
    const text = (value[section] as Record<string, string>)[field].trim();
    if (text.length > limit) errors[section + '.' + field] = `Máximo ${limit} caracteres.`;
    else if (section === 'redes' && text && !safeSocialUrl(text)) errors[section + '.' + field] = 'Escribe una URL HTTPS válida, sin credenciales.';
  }
  return fieldErrors(errors);
};
