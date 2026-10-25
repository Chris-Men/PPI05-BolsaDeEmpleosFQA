import { createContext } from 'react';
import type { StatisticsExport, StatisticsExportRequest } from '../types/statisticsExport';

/** Session-level ownership lets queue monitoring outlive an individual administrative screen. */
export interface StatisticsExportsState {
  allowed: boolean; jobs: StatisticsExport[]; total: number; page: number; requesting: boolean;
  activeJob: StatisticsExport | null;
  downloading: number[]; error: string; notice: string;
  setPage: (page: number) => void; reload: () => void; dismiss: () => void;
  request: (payload: StatisticsExportRequest) => Promise<boolean>; download: (job: StatisticsExport) => Promise<void>;
}
export const StatisticsExportsContext = createContext<StatisticsExportsState | null>(null);
