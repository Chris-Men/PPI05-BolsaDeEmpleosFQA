import { createContext } from 'react';
import type { Location } from 'react-router';
import type { AppRoute } from '../utils/routes';

/** A registered editor can flush a draft or require explicit discard confirmation. */
export interface NavigationGuard { dirty: boolean; busy: boolean; flush?: () => Promise<unknown> }
export interface NavigationContextValue {
  route: AppRoute; location: Location;
  go: (path: string, replace?: boolean) => void;
  back: (fallback: string) => void;
  query: (update: (query: URLSearchParams) => URLSearchParams, replace?: boolean) => void;
  register: (id: string, guard: NavigationGuard | null) => void;
  clear: (id: string) => void;
  run: (callback: () => Promise<void>) => Promise<boolean>;
  leave: (id: string, callback: () => void) => void;
}
export const NavigationContext = createContext<NavigationContextValue | null>(null);
