import { useId, useRef, useState, type ChangeEvent } from 'react';
import { downloadResume } from '../../services/profileService';
import type { CandidateProfileState } from '../../hooks/useCandidateProfile';
import type { ResumeMetadata } from '../../types/profile';

/** Application controls preserve the draft's document independently of the active profile CV. */
interface ApplicationResumeContext {
  selected: ResumeMetadata | null;
  required: boolean;
  error?: string;
  onSelect: (file: ResumeMetadata | null) => void;
  onDownload: () => Promise<Blob>;
}

/** The optional application context leaves profile document management unchanged. */
interface ResumeManagerProps {
  state: CandidateProfileState;
  onUploaded?: (file: ResumeMetadata) => void;
  application?: ApplicationResumeContext;
}

/** Shared real document controls for profile and application flow. */
export function ResumeManager({ state, onUploaded, application }: ResumeManagerProps) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const busy = state.busy || downloading || state.resumeLoading;
  const selected = application ? application.selected : state.resume;

  /** Checks common mistakes before the server validates the actual PDF bytes. */
  const choose = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setError(''); setNotice('');
    if (!/\.pdf$/i.test(file.name) || file.type !== 'application/pdf' || !file.size || file.size > 5 * 1024 * 1024) {
      setError('Selecciona un PDF válido de hasta 5 MiB.'); return;
    }
    try { const result = await state.upload(file); onUploaded?.(result); setNotice('CV guardado correctamente.'); setConfirmDelete(false); }
    catch (failure: unknown) { setError(failure instanceof Error ? failure.message : 'No fue posible subir tu CV.'); }
  };
  /** Creates a short-lived browser URL only after an authorized download succeeds. */
  const download = async (): Promise<void> => {
    setDownloading(true); setError('');
    try {
      const blob = application ? await application.onDownload() : await downloadResume();
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = selected?.originalName ?? 'curriculum.pdf';
      document.body.append(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure: unknown) { setError(failure instanceof Error ? failure.message : 'No fue posible descargar tu CV.'); }
    finally { setDownloading(false); }
  };
  /** Updates shared state only when the server confirms the deletion. */
  const remove = async (): Promise<void> => {
    setError(''); setNotice('');
    try { await state.remove(); setNotice(application?.selected ? 'CV eliminado de tu perfil. El documento seleccionado se conserva en esta postulación.' : 'CV eliminado de tu perfil.'); setConfirmDelete(false); }
    catch (failure: unknown) { setError(failure instanceof Error ? failure.message : 'No fue posible eliminar tu CV.'); }
  };
  return <div className="resume-manager" aria-busy={busy}>
    <h3>{application ? 'CV para esta postulación' : 'Mi currículum'}</h3>
    <p>PDF · Máximo 5 MiB · Documento privado</p>
    {state.resumeLoading && <p role="status">Cargando CV…</p>}
    {(error || state.resumeError) && <p role="alert">{error || state.resumeError}
      {state.resumeError && <button type="button" disabled={busy} onClick={() => void state.reloadResume()}>Reintentar</button>}</p>}
    {notice && <p role="status">{notice}</p>}
    {selected ? <p><strong>{selected.originalName}</strong> · {(selected.sizeBytes / 1024).toFixed(1)} KB</p>
      : !state.resumeLoading && !state.resumeError && <p>{application ? 'Sin CV seleccionado para esta postulación.' : 'No tienes un CV activo.'}</p>}
    {application && selected && <p>El documento seleccionado se conservará aunque actualices o elimines el CV de tu perfil.</p>}
    {application?.error && <p role="alert" className="application-field-error">{application.error}</p>}
    <input ref={input} id={inputId} type="file" accept=".pdf,application/pdf" hidden disabled={busy} onChange={(event) => void choose(event)} />
    <div className="candidate-editor-actions">
      <button type="button" className="profile-primary-button" disabled={busy || Boolean(state.resumeError)}
        onClick={() => input.current?.click()}>{state.busy ? 'Procesando…' : selected ? 'Reemplazar CV' : 'Subir CV'}</button>
      {selected && <button type="button" disabled={busy || (!application && Boolean(state.resumeError))} onClick={() => void download()}>Descargar CV</button>}
      {application && state.resume && state.resume.id !== selected?.id && <button type="button" disabled={busy || Boolean(state.resumeError)} onClick={() => { setError(''); setNotice(''); application.onSelect(state.resume); }}>Usar CV del perfil</button>}
      {application && !application.required && <button type="button" disabled={busy} onClick={() => { setError(''); setNotice(''); application.onSelect(null); }}>Continuar sin CV</button>}
      {state.resume && <button type="button" disabled={busy || Boolean(state.resumeError)} onClick={() => setConfirmDelete(true)}>{application ? 'Eliminar CV del perfil' : 'Eliminar CV'}</button>}
    </div>
    {confirmDelete && <div role="region" aria-label="Confirmar eliminación de CV"><p>{application ? '¿Deseas eliminar el CV activo de tu perfil? El documento seleccionado para esta postulación se conservará.' : '¿Deseas eliminar tu CV activo?'}</p>
      <button type="button" disabled={busy} onClick={() => setConfirmDelete(false)}>Cancelar</button>
      <button type="button" disabled={busy} onClick={() => void remove()}>Confirmar eliminación</button>
    </div>}
  </div>;
}
