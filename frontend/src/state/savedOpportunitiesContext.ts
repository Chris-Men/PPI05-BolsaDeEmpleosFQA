import { createContext } from 'react';

/** One provider coordinates candidate bookmarks and all per-key mutations. */
export interface SavedOpportunitiesState {
  userId: number | undefined;
  keys: ReadonlySet<string>; total: number | null;
  loading: boolean; error: string; canRead: boolean; canUpdate: boolean;
  pending: ReadonlySet<string>; mutationErrors: ReadonlyMap<string, string>;
  revision: number;
  reload: () => void;
  change: (key: string, saved: boolean) => Promise<void>;
  requestLogin: (key: string) => void;
  notice: (message: string) => void;
}
export const SavedOpportunitiesContext = createContext<SavedOpportunitiesState | null>(null);
