import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { DatabaseBackup, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useModalDialog } from '../../hooks/useModalDialog';
import { backupOperationStore } from '../../services/backupOperationStore';
import { createBackup, getBackupStatus, restoreBackup } from '../../services/backupService';
import type { BackupStatus, BackupSummary } from '../../types/backup';
import { BACKUP_PHASE_LABELS } from '../../types/backup';
import { canManageBackups } from '../../utils/backupManagement';
import { BackupTransfers } from '../../components/admin/BackupTransfers';
import '../../styles/components/detailDialog.css';
import '../../styles/admin/backups.css';

const date = (value: string): string => new Intl.DateTimeFormat('es-SV', { timeZone: 'America/El_Salvador', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
interface BackupConfirmationProps { kind: 'BACKUP' | 'RESTORE'; latest: BackupSummary | null; busy: boolean; error: string; onClose: () => void; onConfirm: (password: string, confirmation: string) => void }

/** Native dialog preserves focus and keyboard navigation using the existing modal style. */
function BackupConfirmation({ kind, latest, busy, error, onClose, onConfirm }: BackupConfirmationProps) {
  const dialog = useModalDialog(); const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
  const restore = kind === 'RESTORE';
  const submit = (event: FormEvent): void => { event.preventDefault(); onConfirm(password, confirmation); };
  return <dialog ref={dialog} className="detail-dialog backup-dialog" aria-labelledby="backup-dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className="detail-dialog-header"><span className="detail-dialog-icon"><DatabaseBackup size={22} /></span><div><h2 id="backup-dialog-title">{restore ? 'Restaurar último respaldo' : 'Crear respaldo ahora'}</h2><p>Base de datos y CV privados</p></div>
      <button type="button" className="detail-dialog-close" disabled={busy} aria-label="Cerrar confirmación" onClick={onClose}><X size={20} /></button></header>
    <form onSubmit={submit}><div className="detail-dialog-body">
      {latest && <p>Respaldo disponible: <strong>{date(latest.createdAt)}</strong>, hora de El Salvador.</p>}
      <p>{restore ? 'Se descartarán los cambios posteriores al respaldo. Las cuentas, contraseñas y documentos volverán a ese estado. Se cerrarán todas las sesiones.' : 'Se respaldarán todos los datos y CV actuales. El nuevo respaldo sustituirá al anterior cuando termine correctamente.'}</p>
      {restore && <><label htmlFor="backup-password">Contraseña actual</label><input id="backup-password" type="password" autoComplete="current-password" required value={password} disabled={busy} onChange={event => setPassword(event.target.value)} />
        <label htmlFor="backup-confirmation">Escribe RESTAURAR para confirmar</label><input id="backup-confirmation" autoComplete="off" required value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)} /></>}
      {error && <p role="alert" className="backup-error">{error}</p>}
    </div><footer className="detail-dialog-footer"><button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button type="submit" className={restore ? 'backup-danger' : 'primary-button'} disabled={busy || (restore && (!password || confirmation !== 'RESTAURAR'))}>{busy ? 'Iniciando…' : restore ? 'Confirmar restauración' : 'Crear respaldo'}</button></footer></form>
  </dialog>;
}

/** Super Admin backup console with real operation state and recoverable failures. */
export default function Backups() {
  const { session } = useAuth(); const userId = session?.userId ?? 0;
  const allowed = canManageBackups(session); const restoreAllowed = canManageBackups(session, 'database.restore');
  const tracked = useSyncExternalStore(backupOperationStore.subscribe, backupOperationStore.getSnapshot);
  const tracking = Boolean(tracked);
  const [status, setStatus] = useState<BackupStatus | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [dialog, setDialog] = useState<'BACKUP' | 'RESTORE' | null>(null); const [busy, setBusy] = useState(false); const [dialogError, setDialogError] = useState('');
  const [revision, setRevision] = useState(0); const requestId = useRef(''); const submitting = useRef(false); const requests = useRef(new Set<AbortController>());
  const [transferring, setTransferring] = useState(false);
  useEffect(() => { const controllers = requests.current; return () => { controllers.forEach(controller => controller.abort()); }; }, []);
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async (): Promise<void> => {
      try { const result = await getBackupStatus(userId, controller.signal); if (!controller.signal.aborted) { setStatus(result); setError(''); } }
      catch (failure: unknown) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'No se pudo consultar los respaldos.'); }
      finally { if (!controller.signal.aborted) { setLoading(false); timer = setTimeout(() => { void load(); }, tracking ? 2500 : 30_000); } }
    };
    void load(); const focus = (): void => { if (document.visibilityState === 'visible') { if (timer) clearTimeout(timer); void load(); } };
    window.addEventListener('focus', focus);
    return () => { controller.abort(); if (timer) clearTimeout(timer); window.removeEventListener('focus', focus); };
  }, [allowed, userId, revision, tracking]);
  const start = async (password: string, confirmation: string): Promise<void> => {
    if (!dialog || submitting.current) return; submitting.current = true; setBusy(true); setDialogError('');
    const controller = new AbortController(); requests.current.add(controller);
    try {
      const ticket = dialog === 'RESTORE' && status?.latest ? await restoreBackup({ requestId: requestId.current, backupId: status.latest.id, currentPassword: password, confirmation }, userId, controller.signal)
        : await createBackup(requestId.current, userId, controller.signal);
      if (!controller.signal.aborted) { backupOperationStore.start(userId, ticket); setDialog(null); setRevision(value => value + 1); }
    } catch (failure: unknown) { if (!controller.signal.aborted) setDialogError(failure instanceof Error ? failure.message : 'No se pudo iniciar la operación.'); }
    finally { requests.current.delete(controller); submitting.current = false; if (!controller.signal.aborted) setBusy(false); }
  };
  if (!allowed) return <p role="alert">Solo Super Admin puede consultar los respaldos.</p>;
  const operation = tracked?.ticket.operation ?? status?.operation;
  const pending = busy || transferring || Boolean(operation && !['SUCCEEDED', 'FAILED'].includes(operation.phase));
  const open = (kind: 'BACKUP' | 'RESTORE'): void => { requestId.current = crypto.randomUUID(); setDialogError(''); setDialog(kind); };
  return <section className="admin-screen backups-screen"><header className="backup-heading"><div><h2>Respaldos y restauración</h2><p>Base de datos completa y documentos privados</p></div><DatabaseBackup size={32} aria-hidden="true" /></header>
    {loading && <p role="status">Cargando respaldos…</p>}
    {error && <div role="alert" className="backup-error">{error} <button type="button" onClick={() => setRevision(value => value + 1)}>Reintentar</button></div>}
    {status && <>{!status.available && <p className="backup-notice">{status.unavailableReason}</p>}
      <div className="backup-cards"><article><span>Último respaldo completo</span><strong>{status.latest ? date(status.latest.createdAt) : 'Sin respaldo disponible'}</strong><small>Hora de El Salvador</small></article>
        <article><span>Contenido respaldado</span><strong>{status.latest ? (status.latest.sizeBytes / 1024 / 1024).toLocaleString('es-SV', { maximumFractionDigits: 2 }) + ' MiB' : '—'}</strong><small>{status.latest ? status.latest.resumeCount + ' CV privados' : 'DB y documentos'}</small></article>
        <article><span>Próximo respaldo automático</span><strong>{status.available ? date(status.nextScheduledAt) : 'Sin programación activa'}</strong><small>{status.available ? 'Diariamente a las 02:00 · El Salvador' : 'El módulo no está disponible'}</small></article></div>
      <div className="backup-panel"><h3>Operación más reciente</h3>{operation ? <><strong>{BACKUP_PHASE_LABELS[operation.phase]}</strong><p role="status">{operation.message}</p><small>{date(operation.startedAt)}</small></> : <p>Aún no hay operaciones registradas.</p>}</div>
      <div className="backup-panel"><h3>Acciones</h3><p>Se conserva un único respaldo. El anterior se reemplaza únicamente después de verificar el nuevo.</p><div className="backup-actions">
        <button type="button" className="primary-button" disabled={!status.available || pending} onClick={() => open('BACKUP')}>Crear respaldo ahora</button>
        {restoreAllowed && <button type="button" className="backup-danger" disabled={!status.available || pending || !status.latest} onClick={() => open('RESTORE')}>Restaurar último respaldo</button>}</div></div>
      <BackupTransfers key={userId} userId={userId} latest={status.latest} disabled={!status.available || pending} canImport={restoreAllowed} onBusyChange={setTransferring} onAccepted={() => setRevision(value => value + 1)} />
    </>}
    {dialog && <BackupConfirmation kind={dialog} latest={status?.latest ?? null} busy={busy} error={dialogError} onClose={() => { if (!busy) setDialog(null); }} onConfirm={(password, confirmation) => void start(password, confirmation)} />}
  </section>;
}
