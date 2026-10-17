import { useContext } from 'react';
import { SiteSettingsContext } from '../state/siteSettingsContext';

/** All public consumers use the same confirmed configuration. */
export const useSiteSettings = () => {
  const state = useContext(SiteSettingsContext);
  if (!state) throw new Error('La configuración pública no está disponible.');
  return state;
};
