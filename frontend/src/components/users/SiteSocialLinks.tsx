import { useSiteSettings } from '../../hooks/useSiteSettings';
import { safeSocialUrl } from '../../utils/siteLinks';

/** Shared, optional social links preserve accessible text and avoid empty destinations. */
export function SiteSocialLinks() {
  const { configuration } = useSiteSettings();
  const labels = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube' };
  return <div className="site-social-links">{(Object.keys(labels) as Array<keyof typeof labels>).map(key => {
    const href = safeSocialUrl(configuration.redes[key]);
    return href ? <a key={key} href={href} target="_blank" rel="noopener noreferrer">{labels[key]}</a> : null;
  })}</div>;
}
