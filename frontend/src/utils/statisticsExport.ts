import type { StatisticsExport } from '../types/statisticsExport';

/** Local markers contain only job IDs/expiry; workbook data and personal information stay out of storage. */
export const exportDownloadMarker = (userId: number, jobId: number, createdAt: string): string => 'fqa.statistics-export.' + userId + '.' + jobId + '.' + createdAt;
/** Pending work is independent of the currently selected statistics range. */
export const isStatisticsExportPending = (job: StatisticsExport): boolean => job.status === 'QUEUED' || job.status === 'PROCESSING';
/** Labels are shared by the persistent monitor and the statistics job list. */
export const STATISTICS_EXPORT_LABELS: Record<StatisticsExport['status'], string> = {
  QUEUED: 'En cola', PROCESSING: 'Generando', READY: 'Listo', FAILED: 'Falló', EXPIRED: 'Vencido',
};
