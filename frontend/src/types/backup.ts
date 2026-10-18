/** Public backup contract; storage paths, encryption data and credentials are never returned. */
export interface BackupSummary { id: string; createdAt: string; sizeBytes: number; resumeCount: number }
export type BackupPhase = 'QUEUED' | 'DRAINING' | 'BACKING_UP' | 'VERIFYING' | 'PREPARING' | 'RESTORING' | 'RECOVERING' | 'SUCCEEDED' | 'FAILED';
export interface BackupOperation { id: string; kind: 'BACKUP' | 'RESTORE'; phase: BackupPhase; startedAt: string; finishedAt: string | null; message: string }
export interface BackupOperationTicket { operation: BackupOperation; monitorToken: string }
export interface BackupStatus { available: boolean; unavailableReason: string; latest: BackupSummary | null; nextScheduledAt: string; operation: BackupOperation | null }
export interface RestoreBackupRequest { requestId: string; backupId: string; currentPassword: string; confirmation: string }

export const BACKUP_PHASE_LABELS: Record<BackupPhase, string> = {
  QUEUED: 'En espera', DRAINING: 'Esperando operaciones en curso', BACKING_UP: 'Creando respaldo', VERIFYING: 'Verificando integridad',
  PREPARING: 'Preparando documentos', RESTORING: 'Restaurando base de datos', RECOVERING: 'Verificando resultado', SUCCEEDED: 'Completado', FAILED: 'Fallido',
};
