import { useId, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../services/api';
import type { CandidateProfileState } from '../../hooks/useCandidateProfile';
import type { CandidateProfileData, Education, WorkExperience } from '../../types/profile';
import { CandidateCatalogStatus, CandidatePersonalFields } from './CandidatePersonalFields';
import { changedProfileFields, focusFirstInvalid, validateProfileChanges, type PersonalField } from '../../utils/candidateValidation';
import '../../styles/users/candidateProfile.css';

interface CandidateProfileEditorProps { state: CandidateProfileState }
interface ProfileFieldProps {
  label: string; value: string | null; onChange: (value: string) => void;
  disabled: boolean; readOnly: boolean; error?: string; type?: string; maxLength?: number; required?: boolean;
}

/** Labelled form field shared by personal and history editors. */
function ProfileField({ label, value, onChange, disabled, readOnly, error, type = 'text', maxLength, required }: ProfileFieldProps) {
  const id = useId();
  return <div className="candidate-editor-field"><label htmlFor={id}>{label}</label>
    <input id={id} type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)}
      disabled={disabled} readOnly={readOnly} maxLength={maxLength} required={required} aria-invalid={Boolean(error)}
      aria-describedby={error ? id + '-error' : undefined} />
    {error && <small id={id + '-error'} role="alert">{error}</small>}
  </div>;
}

/** Edits a persistent profile snapshot without overwriting unsaved inputs during background refreshes. */
export function CandidateProfileEditor({ state }: CandidateProfileEditorProps) {
  const [draft, setDraft] = useState<CandidateProfileData | null>(null);
  const [skillsText, setSkillsText] = useState('');
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const summaryId = useId();
  const skillsId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const originalProfile = useRef<CandidateProfileData | null>(null);
  const data = draft ?? state.profile;
  const editing = Boolean(draft);
  if (state.loading) return <section className="profile-card candidate-editor"><p role="status">Cargando tu perfil…</p></section>;
  if (!data) return <section className="profile-card candidate-editor"><p role="alert">{state.error || 'No fue posible cargar tu perfil.'}</p>
    <button type="button" onClick={() => void state.reload()}>Reintentar</button></section>;

  const baseline = originalProfile.current ?? data;
  /** Validates changes only, retaining unrelated historical values in the profile. */
  const validate = (): Record<string, string> => validateProfileChanges(baseline, { ...data,
    skills: skillsText.split(',').map(value => value.trim()).filter(Boolean) }, state.catalogs);
  /** Saves only the edited properties, excluding immutable account information. */
  const save = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); if (!draft || state.busy) return;
    setError(''); setFields({}); setNotice('');
    const found = validate(); setFields(found);
    if (Object.keys(found).length) { setError('Revisa los campos marcados.'); focusFirstInvalid(formRef.current); return; }
    const payload = changedProfileFields(baseline, { ...draft, skills: skillsText.split(',').map(value => value.trim()).filter(Boolean) });
    if (!Object.keys(payload).length) { setDraft(null); setNotice('No hay cambios para guardar.'); return; }
    try {
      await state.save(payload);
      setDraft(null); setNotice('Perfil actualizado correctamente.');
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'No fue posible guardar tu perfil.');
      if (failure instanceof ApiError) setFields(Object.fromEntries(failure.validationErrors.map((item) => [item.field, item.message])));
      focusFirstInvalid(formRef.current);
    }
  };
  /** Updates a history entry while retaining the rest of the draft. */
  const changeWork = (index: number, patch: Partial<WorkExperience>): void => setDraft({ ...data,
    workExperiences: data.workExperiences.map((item, position) => position === index ? { ...item, ...patch } : item) });
  /** Updates one educational entry using the same date and null conventions as the API. */
  const changeEducation = (index: number, patch: Partial<Education>): void => setDraft({ ...data,
    educations: data.educations.map((item, position) => position === index ? { ...item, ...patch } : item) });
  /** Changing departments clears only their dependent municipality; sex remains a typed choice. */
  const changePersonal = (field: PersonalField, value: string): void => {
    if (field === 'sex') setDraft({ ...data, sex: state.catalogs?.sexes.find(item => item.value === value)?.value ?? null });
    else setDraft({ ...data, [field]: value, ...(field === 'department' ? { municipality: null } : {}) });
  };
  return <section className="profile-card candidate-editor">
    <div className="candidate-editor-heading"><h2>Mi perfil profesional</h2>
      {!editing && <button type="button" disabled={state.busy} onClick={() => {
        originalProfile.current = data; setDraft(structuredClone(data)); setSkillsText(data.skills.join(', ')); setError(''); setFields({}); setNotice('');
      }}>Editar perfil</button>}
    </div>
    {notice && <p role="status">{notice}</p>}
    {(error || state.error) && <p role="alert">{error || state.error}</p>}
    <CandidateCatalogStatus loading={state.catalogsLoading} error={state.catalogsError} onRetry={state.reloadCatalogs} />
    <form ref={formRef} noValidate onSubmit={(event) => void save(event)} onBlur={() => { if (editing) setFields(validate()); }} aria-busy={state.busy}>
      <p>Correo: {data.email}</p>
      <div className="candidate-editor-grid"><CandidatePersonalFields values={data} catalogs={state.catalogs} errors={fields}
        disabled={state.busy} readOnly={!editing} onChange={changePersonal} /></div>
      <div className="candidate-editor-field"><label htmlFor={summaryId}>Descripción profesional</label>
        <textarea id={summaryId} value={data.professionalSummary ?? ''} maxLength={5000} readOnly={!editing} disabled={state.busy}
          aria-invalid={Boolean(fields.professionalSummary)} aria-describedby={fields.professionalSummary ? summaryId + '-error' : undefined}
          onChange={(event) => setDraft({ ...data, professionalSummary: event.target.value })} />
        {fields.professionalSummary && <small id={summaryId + '-error'} role="alert">{fields.professionalSummary}</small>}
      </div>
      <h3>Experiencia laboral</h3>
      {fields.workExperiences && <p role="alert">{fields.workExperiences}</p>}
      {!data.workExperiences.length && <p>Sin experiencia registrada.</p>}
      {data.workExperiences.map((item, index) => <fieldset key={index} className="candidate-history">
        <legend>Experiencia {index + 1}</legend><div className="candidate-editor-grid">
          {(['companyName', 'position', 'description', 'startDate', 'endDate'] as const).map((field) => <ProfileField key={field}
            label={({ companyName: 'Empresa', position: 'Cargo', description: 'Descripción del cargo', startDate: 'Fecha inicial', endDate: 'Fecha final (vacía si continúa)' })[field]}
            value={item[field] ?? null} disabled={state.busy} readOnly={!editing} error={fields[`workExperiences.${index}.${field}`]}
            type={field.endsWith('Date') ? 'date' : 'text'} required={field !== 'endDate' && field !== 'description'}
            maxLength={field === 'companyName' ? 150 : field === 'position' ? 100 : 5000}
            onChange={(value) => changeWork(index, { [field]: field === 'endDate' || field === 'description' ? value || null : value })} />)}
        </div>{editing && <button type="button" disabled={state.busy} onClick={() => setDraft({ ...data,
          workExperiences: data.workExperiences.filter((_item, position) => position !== index) })}>Eliminar experiencia {index + 1}</button>}
      </fieldset>)}
      {editing && <button type="button" disabled={state.busy || data.workExperiences.length >= 50} onClick={() => setDraft({ ...data,
        workExperiences: [...data.workExperiences, { companyName: '', position: '', description: null, startDate: '', endDate: null }] })}>Añadir experiencia</button>}
      <h3>Educación</h3>
      {fields.educations && <p role="alert">{fields.educations}</p>}
      {!data.educations.length && <p>Sin estudios registrados.</p>}
      {data.educations.map((item, index) => <fieldset key={index} className="candidate-history"><legend>Estudio {index + 1}</legend>
        <div className="candidate-editor-grid">{(['institution', 'degree', 'startDate', 'endDate'] as const).map((field) => <ProfileField key={field}
          label={({ institution: 'Institución', degree: 'Título o carrera', startDate: 'Fecha inicial de estudios', endDate: 'Fecha final de estudios (vacía si continúa)' })[field]}
          value={item[field]} disabled={state.busy} readOnly={!editing} error={fields[`educations.${index}.${field}`]}
          type={field.endsWith('Date') ? 'date' : 'text'} required={field !== 'endDate'} maxLength={150}
          onChange={(value) => changeEducation(index, { [field]: field === 'endDate' ? value || null : value })} />)}</div>
        {editing && <button type="button" disabled={state.busy} onClick={() => setDraft({ ...data,
          educations: data.educations.filter((_item, position) => position !== index) })}>Eliminar estudio {index + 1}</button>}
      </fieldset>)}
      {editing && <button type="button" disabled={state.busy || data.educations.length >= 50} onClick={() => setDraft({ ...data,
        educations: [...data.educations, { institution: '', degree: '', startDate: '', endDate: null }] })}>Añadir estudio</button>}
      <div className="candidate-editor-field"><label htmlFor={skillsId}>Habilidades (separadas por comas)</label>
        <input id={skillsId} value={editing ? skillsText : data.skills.join(', ')} readOnly={!editing} disabled={state.busy}
          aria-invalid={Object.keys(fields).some(field => field.startsWith('skills'))} aria-describedby={Object.keys(fields).some(field => field.startsWith('skills')) ? skillsId + '-error' : undefined}
          onChange={(event) => setSkillsText(event.target.value)} />
        <div id={skillsId + '-error'}>{Object.entries(fields).filter(([field]) => field.startsWith('skills')).map(([field, message]) => <small role="alert" key={field}>{message}</small>)}</div>
      </div>
      {editing && <div className="candidate-editor-actions">
        <button type="button" disabled={state.busy} onClick={() => { setDraft(null); setError(''); setFields({}); }}>Cancelar edición</button>
        <button type="submit" className="profile-primary-button" disabled={state.busy}>{state.busy ? 'Guardando…' : 'Guardar perfil'}</button>
      </div>}
    </form>
  </section>;
}
