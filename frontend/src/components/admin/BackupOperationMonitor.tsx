import { useEffect, useState, useSyncExternalStore } from 'react';
import { backupOperationStore } from '../../services/backupOperationStore';
import { getBackupOperation } from '../../services/backupService';
import { sessionStore } from '../../services/sessionStore';
import { BACKUP_PHASE_LABELS } from '../../types/backup';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/admin/backups.css';

/** Mounted outside account screens so maintenance or token expiry cannot stop operation tracking. */
export function BackupOperationMonitor() {
  const tracked = useSyncExternalStore(backupOperationStore.subscribe, backupOperationStore.getSnapshot);
  const [notice, setNotice] = useState('');
  const { status, retry } = useAuth();
  const id = tracked?.ticket.operation.id;
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async (): Promise<void> => {
      const current = backupOperationStore.getSnapshot(); if (!current || current.ticket.operation.id !== id) return;
      try {
        const operation = await getBackupOperation(current.ticket, controller.signal);
        if (controller.signal.aborted || backupOperationStore.getSnapshot()?.ticket.operation.id !== id) return;
        backupOperationStore.update(operation);
        if (operation.phase === 'SUCCEEDED' || operation.phase === 'FAILED') {
          setNotice(operation.message);
          backupOperationStore.clear();
          if (operation.kind === 'RESTORE' && operation.phase === 'SUCCEEDED') sessionStore.finishDatabaseRestore();
          return;
        }
      } catch (failure: unknown) { if (!controller.signal.aborted) backupOperationStore.fail(failure instanceof Error ? failure.message : 'No se pudo consultar el resultado.'); }
      if (!controller.signal.aborted) timer = setTimeout(() => { void poll(); }, 2000);
    };
    void poll(); return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [id]);
  useEffect(() => {
    if (tracked || !notice || status !== 'error') return;
    const timer = setTimeout(() => { void retry(); }, 1000);
    return () => clearTimeout(timer);
  }, [tracked, notice, status, retry]);
  if (!tracked && !notice) return null;
  return <aside className="backup-monitor" role="status" aria-live="polite">
    {tracked ? <><strong>{BACKUP_PHASE_LABELS[tracked.ticket.operation.phase]}</strong><p>{tracked.ticket.operation.message}</p>
      {tracked.error && <p className="backup-error">{tracked.error} Se volverá a consultar el resultado.</p>}</> : <><p>{notice}</p><button type="button" onClick={() => setNotice('')}>Cerrar aviso</button></>}
  </aside>;
}
