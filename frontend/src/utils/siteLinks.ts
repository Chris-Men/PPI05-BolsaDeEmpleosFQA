/** Only HTTPS external destinations without embedded credentials become clickable. */
export const safeSocialUrl = (value: string): string | null => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
};
/** Formatted contact numbers remain readable while links use only dialable characters. */
export const telephoneHref = (value: string): string => 'tel:' + value.replace(/[^+\d]/g, '');
export const whatsappHref = (value: string): string => 'https://wa.me/' + value.replace(/\D/g, '');
