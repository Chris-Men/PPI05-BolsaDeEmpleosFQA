/** Public backup metadata never exposes paths, credentials or document keys. */
export interface BackupSummary {
  id: string;
  createdAt: string;
  sizeBytes: number;
  resumeCount: number;
}

/** Durable phases distinguish an uncertain commit from a safe, rolled-back failure. */
export type BackupPhase = 'QUEUED' | 'DRAINING' | 'BACKING_UP' | 'VERIFYING' | 'PREPARING' | 'RESTORING' | 'RECOVERING' | 'SUCCEEDED' | 'FAILED';
export interface BackupOperation {
  id: string;
  kind: 'BACKUP' | 'RESTORE';
  phase: BackupPhase;
  startedAt: string;
  finishedAt: string | null;
  message: string;
}
export interface BackupStatus {
  available: boolean;
  unavailableReason: string;
  latest: BackupSummary | null;
  nextScheduledAt: string;
  operation: BackupOperation | null;
}
export interface BackupOperationTicket {
  operation: BackupOperation;
  monitorToken: string;
}
