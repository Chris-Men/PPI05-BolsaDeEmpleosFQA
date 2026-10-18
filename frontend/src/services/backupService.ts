import { apiRequest } from './api';
import type { BackupOperation, BackupOperationTicket, BackupStatus, RestoreBackupRequest } from '../types/backup';

/** Administrative commands keep the original identity across access-token renewal. */
export const getBackupStatus = (userId: number, signal?: AbortSignal): Promise<BackupStatus> =>
  apiRequest('/admin/backups', { authenticated: true, expectedUserId: userId, signal });
/** Starts a complete backup without retrying it under a different account. */
export const createBackup = (requestId: string, userId: number, signal?: AbortSignal): Promise<BackupOperationTicket> =>
  apiRequest('/admin/backups', { method: 'POST', authenticated: true, expectedUserId: userId, signal, body: JSON.stringify({ requestId }) });
/** Sends explicit restoration consent and current credentials without persisting either. */
export const restoreBackup = (payload: RestoreBackupRequest, userId: number, signal?: AbortSignal): Promise<BackupOperationTicket> =>
  apiRequest('/admin/backups/restore', { method: 'POST', authenticated: true, expectedUserId: userId, signal, body: JSON.stringify(payload) });
/** A scoped monitor credential never enters the URL and cannot initiate any operation. */
export const getBackupOperation = (ticket: BackupOperationTicket, signal?: AbortSignal): Promise<BackupOperation> =>
  apiRequest('/admin/backups/operations/' + encodeURIComponent(ticket.operation.id), { signal, headers: { 'X-FQA-Operation-Token': ticket.monitorToken } });
