import { createContext } from 'react';
import type { SiteConfiguration } from '../config/siteConfiguration';

/** Public content is safe to share across accounts; administrative editor data is never stored here. */
export interface SiteSettingsState {
  configuration: SiteConfiguration;
  reload: () => void;
  accept: (configuration: SiteConfiguration) => void;
}
export const SiteSettingsContext = createContext<SiteSettingsState | null>(null);
