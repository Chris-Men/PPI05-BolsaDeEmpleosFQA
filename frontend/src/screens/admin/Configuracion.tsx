import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import type { SiteConfiguration } from '../../config/siteConfiguration';
import { ApiError } from '../../services/api';
import { getAdminSiteSettings, resetSiteSettings, saveSiteSettings, type SiteSettingsDocument } from '../../services/siteSettingsService';
import { canReadSiteSettings, canUpdateSiteSettings } from '../../utils/siteManagement';
import '../../styles/admin/configuracion.css';

interface SettingsField { key: string; label: string; type?: 'email' | 'tel' | 'url' | 'textarea'; limit: number }
interface SettingsSection { key: keyof SiteConfiguration; label: string; description: string; fields: SettingsField[] }

/** Only the four agreed groups are editable; removed prototype flags have no wire representation. */
const sections: SettingsSection[] = [
  { key: 'contacto', label: 'Información de contacto', description: 'Contacto compartido en las páginas públicas', fields: [
    { key: 'correo', label: 'Correo electrónico', type: 'email', limit: 255 }, { key: 'telefono', label: 'Teléfono', type: 'tel', limit: 30 },
    { key: 'whatsapp', label: 'WhatsApp', type: 'tel', limit: 30 }, { key: 'direccion', label: 'Dirección', limit: 500 },
  ] },
  { key: 'inicio', label: 'Página principal', description: 'Contenido principal mostrado a los usuarios', fields: [
    { key: 'titulo', label: 'Título principal', limit: 180 }, { key: 'subtitulo', label: 'Subtítulo', limit: 500 }, { key: 'descripcion', label: 'Descripción', type: 'textarea', limit: 2000 },
  ] },
  { key: 'institucional', label: 'Misión y visión', description: 'Misión y visión de la fundación', fields: [
    { key: 'mision', label: 'Misión', type: 'textarea', limit: 4000 }, { key: 'vision', label: 'Visión', type: 'textarea', limit: 4000 },
  ] },
  { key: 'redes', label: 'Redes sociales', description: 'Enlaces HTTPS; deja vacío lo que no deseas mostrar', fields: [
    { key: 'facebook', label: 'Facebook', type: 'url', limit: 2048 }, { key: 'instagram', label: 'Instagram', type: 'url', limit: 2048 },
    { key: 'linkedin', label: 'LinkedIn', type: 'url', limit: 2048 }, { key: 'youtube', label: 'YouTube', type: 'url', limit: 2048 },
  ] },
];

/** Replaces localStorage saves with a versioned, account-scoped editor and a read-only administrator view. */
export default function Configuracion() {
  const { session } = useAuth(); const publicSettings = useSiteSettings();
  const allowed = canReadSiteSettings(session); const editable = canUpdateSiteSettings(session); const userId = session?.userId ?? 0;
  const [document, setDocument] = useState<SiteSettingsDocument | null>(null);
  const [draft, setDraft] = useState<SiteConfiguration | null>(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [fields, setFields] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState(''); const [conflict, setConflict] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false); const [revision, setRevision] = useState(0);
  const requests = useRef(new Set<AbortController>());
  useEffect(() => { const controllers = requests.current; return () => { controllers.forEach(item => item.abort()); controllers.clear(); }; }, []);
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController(); setLoading(true); setError('');
    void getAdminSiteSettings(userId, controller.signal).then(value => {
      if (!controller.signal.aborted) { setDocument(value); setDraft(value.configuration); setFields({}); setConflict(false); setConfirmReset(false); setNotice(''); }
    }).catch((failure: unknown) => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'No se pudo cargar la configuración.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [allowed, userId, revision]);
  /** Server success is the only event that changes the saved snapshot and public content. */
  const persist = async (reset = false): Promise<void> => {
    if (!document || !draft || !editable || busy) return;
    const controller = new AbortController(); requests.current.add(controller); setBusy(true); setError(''); setFields({}); setNotice('');
    try {
      const value = reset ? await resetSiteSettings(document.version, userId, controller.signal) : await saveSiteSettings({ version: document.version, configuration: draft }, userId, controller.signal);
      if (controller.signal.aborted) return;
      setDocument(value); setDraft(value.configuration); setConflict(false); setConfirmReset(false);
      setNotice(reset ? 'Configuración restaurada correctamente.' : 'Configuración guardada correctamente.');
      publicSettings.accept(value.configuration); publicSettings.reload();
    } catch (failure: unknown) {
      if (!controller.signal.aborted) {
        setError(failure instanceof Error ? failure.message : 'No se pudo guardar la configuración.');
        if (failure instanceof ApiError) { setConflict(failure.status === 409); setFields(Object.fromEntries(failure.validationErrors.map(item => [item.field.replace(/^configuration\./, ''), item.message]))); }
      }
    } finally { requests.current.delete(controller); if (!controller.signal.aborted) setBusy(false); }
  };
  const save = (event: FormEvent<HTMLFormElement>): void => { event.preventDefault(); void persist(); };
  if (!allowed) return <p role="alert">No tienes permiso para consultar la configuración.</p>;
  if (loading) return <p role="status">Cargando configuración…</p>;
  return <section className="admin-screen configuracion-screen">
    {!editable && <p className="configuration-notice">Solo Super Admin puede modificar estos valores. Vista de consulta.</p>}
    {error && <div role="alert" className="configuration-error">{error} {conflict && <p>Recargar descartará las ediciones locales y mostrará la última versión guardada.</p>}<button type="button" disabled={busy} onClick={() => setRevision(value => value + 1)}>{conflict ? 'Recargar configuración' : 'Reintentar carga'}</button></div>}
    {notice && <p role="status" className="configuration-notice">{notice}</p>}
    {draft && document && <form className="settings-grid" onSubmit={save} noValidate>
      {sections.map(section => <div className="settings-card" key={section.key}><div className="form-section-title"><h3>{section.label}</h3><span>{section.description}</span></div>
        {section.fields.map(field => {
          const value = (draft[section.key] as Record<string, string>)[field.key];
          const fieldError = fields[section.key + '.' + field.key]; const id = 'site-' + section.key + '-' + field.key;
          const props = { id, value, maxLength: field.limit, disabled: busy, readOnly: !editable, 'aria-invalid': Boolean(fieldError), 'aria-describedby': fieldError ? id + '-error' : undefined,
            onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setDraft(current => current ? { ...current, [section.key]: { ...current[section.key], [field.key]: event.target.value } } : current); setNotice(''); } };
          return <div className="form-group" key={field.key}><label htmlFor={id}>{field.label}</label>{field.type === 'textarea' ? <textarea {...props} rows={4} /> : <input {...props} type={field.type ?? 'text'} />}{fieldError && <p id={id + '-error'} className="configuration-field-error" role="alert">{fieldError}</p>}</div>;
        })}
      </div>)}
      {editable && <div className="form-actions"><button type="submit" className="primary-button" disabled={busy || conflict}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
        <button type="button" className="secondary-button" disabled={busy} onClick={() => { setDraft(document.configuration); setError(''); setFields({}); setNotice(''); setConfirmReset(false); }}>Cancelar cambios</button>
        <button type="button" className="secondary-button" disabled={busy || conflict} onClick={() => setConfirmReset(true)}>Restaurar valores iniciales</button>
      </div>}
      {confirmReset && <div role="alert" className="configuration-confirm"><p>¿Restaurar el contacto, los textos y las redes a sus valores iniciales?</p><button type="button" disabled={busy} onClick={() => setConfirmReset(false)}>Cancelar restauración</button><button type="button" disabled={busy || conflict} onClick={() => void persist(true)}>Confirmar restauración</button></div>}
    </form>}
  </section>;
}
