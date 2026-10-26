import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Download, Upload, X } from 'lucide-react';
import { useModalDialog } from '../../hooks/useModalDialog';
import { exportBackup, importBackup } from '../../services/backupService';
import { backupOperationStore } from '../../services/backupOperationStore';
import type { BackupSummary } from '../../types/backup';
import { downloadFile } from '../../utils/downloadFile';
import { useLiveValidation } from '../../hooks/useLiveValidation';

interface ImportConfirmationProps { file: File; latest: BackupSummary | null; busy: boolean; error: string; onClose: () => void; onConfirm: (confirmation: string) => void }

/** Explicit import consent replaces only the available backup, leaving the live database intact. */
function ImportConfirmation({ file, latest, busy, error, onClose, onConfirm }: ImportConfirmationProps) {
  const dialog = useModalDialog(); const [confirmation, setConfirmation] = useState('');
  const live = useLiveValidation({ confirmation }, (value): Record<string, string> => value.confirmation === 'IMPORTAR' ? {} : { confirmation: 'Escribe IMPORTAR exactamente para confirmar.' });
  const submit = (event: FormEvent<HTMLFormElement>): void => { event.preventDefault(); if (live.check(event.currentTarget)) onConfirm(confirmation); };
  return <dialog ref={dialog} className="detail-dialog backup-dialog" aria-labelledby="import-backup-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className="detail-dialog-header"><span className="detail-dialog-icon"><Upload size={22} /></span><div><h2 id="import-backup-title">Importar respaldo</h2><p>Archivo cifrado de DB y CV</p></div>
      <button type="button" className="detail-dialog-close" aria-label="Cerrar importación" disabled={busy} onClick={onClose}><X size={20} /></button></header>
    <form noValidate onChangeCapture={live.watch} onSubmit={submit}><div className="detail-dialog-body">
      <p>Archivo seleccionado: <strong className="backup-filename">{file.name}</strong></p>
      <p>Se comprobarán su integridad, la clave de cifrado y la compatibilidad con la aplicación.</p>
      {latest && <p>Si la validación termina correctamente, sustituirá el respaldo disponible del <strong>{new Intl.DateTimeFormat('es-SV', { timeZone: 'America/El_Salvador', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(latest.createdAt))}</strong>.</p>}
      <p>La importación conserva los datos actuales. Para aplicar este respaldo, después deberás usar «Restaurar último respaldo».</p>
      <label htmlFor="import-backup-confirmation">Escribe IMPORTAR para confirmar</label><input {...live.bind('confirmation')} id="import-backup-confirmation" autoComplete="off" value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)} required />{live.error('confirmation')}
      {error && <p className="backup-error" role="alert">{error}</p>}
    </div><footer className="detail-dialog-footer"><button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={busy || confirmation !== 'IMPORTAR'}>{busy ? 'Cargando respaldo…' : 'Confirmar importación'}</button></footer></form>
  </dialog>;
}

interface BackupTransfersProps {
  userId: number; latest: BackupSummary | null; disabled: boolean; canImport: boolean;
  onBusyChange: (busy: boolean) => void; onAccepted: () => void;
}

/** Accessible transfer controls share the existing typed transport and durable operation monitor. */
export function BackupTransfers({ userId, latest, disabled, canImport, onBusyChange, onAccepted }: BackupTransfersProps) {
  const [file, setFile] = useState<File | null>(null); const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<'EXPORT' | 'IMPORT' | null>(null); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const input = useRef<HTMLInputElement>(null); const requestId = useRef(''); const selectedBackupId = useRef<string | null>(null);
  const controller = useRef<AbortController | null>(null); const submitting = useRef(false);
  useEffect(() => () => { controller.current?.abort(); }, []);
  const select = (selected?: File): void => {
    setError(''); setNotice(''); setFile(null);
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith('.fqabackup') || selected.size === 0) { setError('Selecciona un archivo .fqabackup válido.'); if (input.current) input.current.value = ''; return; }
    if (selected.size > 1024 * 1024 * 1024) { setError('El respaldo supera el límite de 1 GiB.'); if (input.current) input.current.value = ''; return; }
    setFile(selected);
  };
  const transfer = async (kind: 'EXPORT' | 'IMPORT', confirmation = ''): Promise<void> => {
    if (submitting.current || disabled || (kind === 'EXPORT' ? !latest : !file || !canImport)) return;
    submitting.current = true; setBusy(kind); onBusyChange(true); setError(''); setNotice('');
    const active = new AbortController(); controller.current = active;
    try {
      if (kind === 'EXPORT' && latest) {
        const blob = await exportBackup(latest.id, userId, active.signal);
        if (!active.signal.aborted) { downloadFile(blob, 'fqa-respaldo-' + latest.createdAt.slice(0, 10) + '-' + latest.id + '.fqabackup'); setNotice('Archivo preparado. La descarga se ha iniciado.'); }
      } else if (file) {
        const ticket = await importBackup({ requestId: requestId.current, backupId: selectedBackupId.current, confirmation, file }, userId, active.signal);
        if (!active.signal.aborted) { backupOperationStore.start(userId, ticket); setConfirming(false); setFile(null); if (input.current) input.current.value = ''; onAccepted(); }
      }
    } catch (failure: unknown) { if (!active.signal.aborted) setError(failure instanceof Error ? failure.message : 'No se pudo completar la transferencia.'); }
    finally { submitting.current = false; if (!active.signal.aborted) { setBusy(null); onBusyChange(false); } }
  };
  return <div className="backup-panel backup-transfers"><h3>Exportar e importar</h3><p>Conserva una copia cifrada fuera del servidor o carga un respaldo exportado anteriormente.</p>
    <p className="backup-notice">Incluye la base de datos y los CV privados. Para importarlo se necesita la misma clave de cifrado del servidor de origen; la clave se conserva por separado.</p>
    <div className="backup-transfer-grid"><article><h4><Download size={20} aria-hidden="true" />Exportar respaldo</h4><p>Descarga el último respaldo completo en formato .fqabackup.</p>
      <button type="button" disabled={disabled || !latest || busy !== null} onClick={() => void transfer('EXPORT')}><Download size={18} aria-hidden="true" />{busy === 'EXPORT' ? 'Preparando descarga…' : 'Descargar respaldo'}</button></article>
      {canImport && <article><h4><Upload size={20} aria-hidden="true" />Importar respaldo</h4><p>Hasta 1 GiB. Se validará antes de sustituir el respaldo disponible.</p>
        <label htmlFor="backup-import-file">Archivo de respaldo</label><div className="backup-file-control">
          <input ref={input} id="backup-import-file" type="file" accept=".fqabackup" hidden disabled={disabled || busy !== null} onChange={event => select(event.target.files?.[0])} />
          <button type="button" className="backup-file-picker" disabled={disabled || busy !== null} onClick={() => input.current?.click()} aria-describedby="backup-import-help backup-import-filename">Seleccionar archivo</button>
          <span id="backup-import-filename" className="backup-filename" role="status">{file?.name ?? 'Ningún archivo seleccionado'}</span></div>
        <small id="backup-import-help">La importación conserva la DB actual. La restauración se realiza por separado.</small>
        <button type="button" className="primary-button" disabled={disabled || !file || busy !== null} onClick={() => { requestId.current = crypto.randomUUID(); selectedBackupId.current = latest?.id ?? null; setError(''); setConfirming(true); }}><Upload size={18} aria-hidden="true" />Importar respaldo</button></article>}
    </div>
    {notice && <p role="status">{notice}</p>}{error && !confirming && <p role="alert" className="backup-error">{error}</p>}
    {confirming && file && <ImportConfirmation file={file} latest={latest} busy={busy === 'IMPORT'} error={error} onClose={() => { if (!busy) setConfirming(false); }} onConfirm={confirmation => void transfer('IMPORT', confirmation)} />}
  </div>;
}
