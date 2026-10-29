import type { StatisticsRange } from './statistics';

/** Account-owned durable workbook job, without storage paths or worker credentials. */
export interface StatisticsExport extends StatisticsRange {
  id: number; status: 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED' | 'EXPIRED';
  createdAt: string; startedAt: string | null; completedAt: string | null; snapshotAt: string | null;
  expiresAt: string | null; sizeBytes: number | null; rowCounts: Record<string, number> | null;
  error: string | null; fileName: string;
}
/** Lists are paginated independently from the contents of each workbook. */
export interface StatisticsExportList { items: StatisticsExport[]; total: number; page: number; pageSize: number }
/** A retry must keep the confirmed range and request UUID unchanged. */
export interface StatisticsExportRequest extends StatisticsRange { requestId: string; confirmed: true }
