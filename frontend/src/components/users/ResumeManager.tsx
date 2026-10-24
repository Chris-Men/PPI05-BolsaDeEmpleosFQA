
import { useId, useRef, useState, type ChangeEvent } from 'react';
import { FileText, Upload, Download, Trash2, RefreshCw, ShieldCheck, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { downloadResume } from '../../services/profileService';
import type { CandidateProfileState } from '../../hooks/useCandidateProfile';
import type { ResumeMetadata } from '../../types/profile';

interface ApplicationResumeContext {
  selected: ResumeMetadata | null;
  required: boolean;
  error?: string;
  onSelect: (file: ResumeMetadata | null) => void;
  onDownload: () => Promise<Blob>;
}

interface ResumeManagerProps {
  state: CandidateProfileState;
  onUploaded?: (file: ResumeMetadata) => void;
  application?: ApplicationResumeContext;
}

export function ResumeManager({
  state,
  onUploaded,
  application,
}: ResumeManagerProps) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const busy = state.busy || downloading || state.resumeLoading;
  const selected = application ? application.selected : state.resume;

  const choose = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setError('');
    setNotice('');

    if (
      !/\.pdf$/i.test(file.name) ||
      file.type !== 'application/pdf' ||
      !file.size ||
      file.size > 5 * 1024 * 1024
    ) {
      setError('Selecciona un archivo PDF válido de hasta 5 MiB.');
      return;
    }

    try {
      const result = await state.upload(file);
      onUploaded?.(result);
      setNotice('Tu currículum se ha guardado correctamente.');
      setConfirmDelete(false);
    } catch (failure: unknown) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'No fue posible subir tu CV.',
      );
    }
  };

  const download = async (): Promise<void> => {
    setDownloading(true);
    setError('');
    setNotice('');

    try {
      const blob = application
        ? await application.onDownload()
        : await downloadResume();

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');

      anchor.href = url;
      anchor.download = selected?.originalName ?? 'curriculum.pdf';

      document.body.append(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure: unknown) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'No fue posible descargar tu CV.',
      );
    } finally {
      setDownloading(false);
    }
  };

  const remove = async (): Promise<void> => {
    setError('');
    setNotice('');

    try {
      await state.remove();

      setNotice(
        application?.selected
          ? 'CV eliminado de tu perfil. El documento seleccionado para esta postulación se conserva.'
          : 'El CV se ha eliminado correctamente de tu perfil.',
      );

      setConfirmDelete(false);
    } catch (failure: unknown) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'No fue posible eliminar tu CV.',
      );
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <section className="resume-manager" aria-busy={busy}>
      <header className="resume-manager-header">
        <div className="resume-manager-heading-icon">
          <FileText size={23} aria-hidden="true" />
        </div>

        <div className="resume-manager-heading-copy">
          <h3>
            {application ? 'Documentos de postulación' : 'Mi currículum'}
          </h3>

          <p>
            {application
              ? 'Selecciona el CV que deseas presentar para esta oportunidad.'
              : 'Administra el currículum de tu perfil profesional.'}
          </p>
        </div>

        <span className="resume-manager-private">
          <ShieldCheck size={14} aria-hidden="true" />
          Privado
        </span>
      </header>

      <div className="resume-manager-format">
        <span className="resume-manager-pdf-badge">PDF</span>

        <div>
          <strong>Documento PDF</strong>
          <span>Máximo 5 MiB · Archivo privado</span>
        </div>
      </div>

      {state.resumeLoading && (
        <p className="resume-manager-loading" role="status">
          <RefreshCw size={16} aria-hidden="true" />
          Consultando tu currículum…
        </p>
      )}

      {(error || state.resumeError) && (
        <div className="resume-manager-message is-error" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />

          <div>
            <p>{error || state.resumeError}</p>

            {state.resumeError && (
              <button
                type="button"
                className="resume-manager-retry"
                disabled={busy}
                onClick={() => void state.reloadResume()}
              >
                Reintentar
              </button>
            )}
          </div>
        </div>
      )}

      {notice && (
        <div className="resume-manager-message is-success" role="status">
          <CheckCircle2 size={18} aria-hidden="true" />
          <p>{notice}</p>
        </div>
      )}

      {selected ? (
        <article className="resume-document-card">
          <div className="resume-document-icon">
            <FileText size={27} aria-hidden="true" />
            <span>PDF</span>
          </div>

          <div className="resume-document-info">
            <span className="resume-document-status">
              <span className="resume-status-dot" />
              {application
                ? 'Documento seleccionado'
                : 'Currículum disponible'}
            </span>

            <strong className="resume-document-name">
              {selected.originalName}
            </strong>

            <span className="resume-document-size">
              {formatSize(selected.sizeBytes)}
            </span>
          </div>

          <div className="resume-document-check" aria-hidden="true">
            <CheckCircle2 size={21} />
          </div>
        </article>
      ) : (
        !state.resumeLoading &&
        !state.resumeError && (
          <div className="resume-empty-state">
            <div className="resume-empty-icon">
              <Upload size={27} aria-hidden="true" />
            </div>

            <h4>
              {application
                ? 'Selecciona tu currículum'
                : 'Todavía no tienes un CV'}
            </h4>

            <p>
              {application
                ? 'Puedes utilizar un documento de tu perfil o subir un PDF para esta postulación.'
                : 'Sube tu currículum en PDF para tenerlo disponible cuando lo necesites.'}
            </p>
          </div>
        )
      )}

      {application && selected && (
        <div className="resume-application-note">
          <ShieldCheck size={17} aria-hidden="true" />

          <p>
            El documento seleccionado para esta postulación se gestiona
            independientemente del CV activo de tu perfil.
          </p>
        </div>
      )}

      {application?.error && (
        <p id={inputId + '-error'} role="alert" className="resume-manager-field-error">
          {application.error}
        </p>
      )}

      <input
        ref={input}
        id={inputId}
        type="file"
        accept=".pdf,application/pdf"
        hidden
        disabled={busy}
        onChange={(event) => void choose(event)}
      />

      <div className="resume-manager-actions">
        <button
          type="button"
          className="resume-action-primary"
          disabled={busy || Boolean(state.resumeError)}
          aria-invalid={Boolean(application?.error)}
          aria-describedby={application?.error ? inputId + '-error' : undefined}
          onClick={() => input.current?.click()}
        >
          <Upload size={17} aria-hidden="true" />

          {state.busy
            ? 'Procesando…'
            : selected
              ? 'Reemplazar CV'
              : 'Subir currículum'}
        </button>

        {selected && (
          <button
            type="button"
            className="resume-action-secondary"
            disabled={busy || (!application && Boolean(state.resumeError))}
            onClick={() => void download()}
          >
            <Download size={17} aria-hidden="true" />
            {downloading ? 'Descargando…' : 'Descargar'}
          </button>
        )}

        {application &&
          state.resume &&
          state.resume.id !== selected?.id && (
            <button
              type="button"
              className="resume-action-secondary"
              disabled={busy || Boolean(state.resumeError)}
              onClick={() => {
                setError('');
                setNotice('');
                application.onSelect(state.resume);
              }}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Usar CV del perfil
            </button>
          )}

        {application && !application.required && (
          <button
            type="button"
            className="resume-action-text"
            disabled={busy}
            onClick={() => {
              setError('');
              setNotice('');
              application.onSelect(null);
            }}
          >
            Continuar sin CV
          </button>
        )}

        {state.resume && (
          <button
            type="button"
            className="resume-action-danger"
            disabled={busy || Boolean(state.resumeError)}
            onClick={() => {
              setError('');
              setNotice('');
              setConfirmDelete(true);
            }}
          >
            <Trash2 size={16} aria-hidden="true" />
            Eliminar CV del perfil
          </button>
        )}
      </div>

      {confirmDelete && (
        <div
          className="resume-delete-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) {
              setConfirmDelete(false);
            }
          }}
        >
          <section
            className="resume-delete-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`${inputId}-delete-title`}
            aria-describedby={`${inputId}-delete-description`}
          >
            <button
              type="button"
              className="resume-delete-close"
              aria-label="Cerrar confirmación"
              disabled={busy}
              onClick={() => setConfirmDelete(false)}
            >
              <X size={19} aria-hidden="true" />
            </button>

            <div className="resume-delete-icon">
              <Trash2 size={28} aria-hidden="true" />
            </div>

            <span className="resume-delete-eyebrow">
              Confirmación de seguridad
            </span>

            <h2 id={`${inputId}-delete-title`}>
              ¿Eliminar tu currículum?
            </h2>

            <p id={`${inputId}-delete-description`}>
              Esta acción eliminará el CV activo de tu perfil. Tendrás que
              volver a subirlo si deseas utilizarlo en el futuro.
            </p>

            {application?.selected && (
              <div className="resume-delete-warning">
                <ShieldCheck size={19} aria-hidden="true" />

                <span>
                  El documento que ya seleccionaste para esta postulación
                  se conservará según el comportamiento actual de la aplicación.
                </span>
              </div>
            )}

            <div className="resume-delete-actions">
              <button
                type="button"
                className="resume-delete-cancel"
                disabled={busy}
                onClick={() => setConfirmDelete(false)}
              >
                Conservar CV
              </button>

              <button
                type="button"
                className="resume-delete-confirm"
                disabled={busy}
                onClick={() => void remove()}
              >
                <Trash2 size={16} aria-hidden="true" />
                {busy ? 'Procesando…' : 'Sí, eliminar CV'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
