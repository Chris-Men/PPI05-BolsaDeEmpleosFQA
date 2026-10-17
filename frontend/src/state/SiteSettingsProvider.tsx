import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { initialSiteConfiguration, type SiteConfiguration } from '../config/siteConfiguration';
import { getPublicSiteSettings } from '../services/siteSettingsService';
import { SiteSettingsContext } from './siteSettingsContext';

/** One provider keeps the last valid public content during outages and refreshes only visible pages. */
export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [configuration, setConfiguration] = useState(initialSiteConfiguration);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  const accept = useCallback((value: SiteConfiguration) => { generation.current += 1; setConfiguration(value); }, []);
  useEffect(() => {
    const request = ++generation.current;
    const controller = new AbortController();
    void getPublicSiteSettings(controller.signal).then(value => { if (!controller.signal.aborted && generation.current === request) setConfiguration(value); })
      .catch(() => { /* Last valid/default content remains visible; the next refresh retries. */ });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    const refresh = (): void => { if (!document.hidden) reload(); };
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    const timer = setInterval(refresh, 30000);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); clearInterval(timer); };
  }, [reload]);
  return <SiteSettingsContext.Provider value={{ configuration, reload, accept }}>{children}</SiteSettingsContext.Provider>;
}
