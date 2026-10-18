import type { BackupOperation, BackupOperationTicket } from '../types/backup';

interface TrackedOperation { userId: number; ticket: BackupOperationTicket; error: string }
const storageKey = 'fqa.backup.monitor';
/** Only a limited monitor capability is persisted in this tab; no account password or JWT is stored. */
const restore = (): TrackedOperation | null => {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
    if (!value || typeof value !== 'object' || !('userId' in value) || !Number.isInteger(value.userId) || !('ticket' in value)) return null;
    const ticket = value.ticket as Partial<BackupOperationTicket>;
    if (!ticket.operation || !/^[0-9a-f-]{36}$/.test(ticket.operation.id) || !/^[a-f0-9]{64}$/.test(ticket.monitorToken ?? '') ||
      !['BACKUP', 'RESTORE'].includes(ticket.operation.kind) || !Number.isFinite(Date.parse(ticket.operation.startedAt)) ||
      Date.now() - Date.parse(ticket.operation.startedAt) > 24 * 60 * 60_000) return null;
    return { userId: Number(value.userId), ticket: ticket as BackupOperationTicket, error: '' };
  } catch { return null; }
};
let snapshot: TrackedOperation | null = restore();
const listeners = new Set<() => void>();
const publish = (next: TrackedOperation | null): void => {
  snapshot = next;
  try { if (next) sessionStorage.setItem(storageKey, JSON.stringify({ userId: next.userId, ticket: next.ticket })); else sessionStorage.removeItem(storageKey); } catch { /* Monitoring still works in memory. */ }
  listeners.forEach(listener => listener());
};

/** Root-level monitoring survives administrative screen changes and transient session errors. */
export const backupOperationStore = {
  getSnapshot: (): TrackedOperation | null => snapshot,
  subscribe(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; },
  start(userId: number, ticket: BackupOperationTicket): void { publish({ userId, ticket, error: '' }); },
  update(operation: BackupOperation): void { if (snapshot?.ticket.operation.id === operation.id) publish({ ...snapshot, ticket: { ...snapshot.ticket, operation }, error: '' }); },
  fail(message: string): void { if (snapshot) publish({ ...snapshot, error: message }); },
  clear(): void { publish(null); },
  /** Explicit logout/account switch removes capabilities from the tab immediately. */
  identityChanged(userId: number | undefined): void { if (snapshot && snapshot.userId !== userId) publish(null); },
};
