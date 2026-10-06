import { useId, useState, type FormEvent } from 'react';
import { ApiError } from '../../services/api';
import type { CandidateProfileState } from '../../hooks/useCandidateProfile';
import type { CandidateProfileData, Education, WorkExperience } from '../../types/profile';
import '../../styles/users/candidateEditor.css';

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

const labels = {
  firstName: 'Nombres', lastName: 'Apellidos', phone: 'Teléfono', department: 'Departamento', municipality: 'Municipio',
  profession: 'Profesión', educationLevel: 'Nivel educativo',
} as const;
const limits = { firstName: 100, lastName: 100, phone: 30, department: 100, municipality: 100, profession: 150, educationLevel: 100 };

/** Edits a persistent profile snapshot without overwriting unsaved inputs during background refreshes. */
export function CandidateProfileEditor({ state }: CandidateProfileEditorProps) {
  const [draft, setDraft] = useState<CandidateProfileData | null>(null);
  const [skillsText, setSkillsText] = useState('');
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const summaryId = useId();
  const skillsId = useId();
  const data = draft ?? state.profile;
  const editing = Boolean(draft);
  if (state.loading) return <section className="profile-card candidate-editor"><p role="status">Cargando tu perfil…</p></section>;
  if (!data) return <section className="profile-card candidate-editor"><p role="alert">{state.error || 'No fue posible cargar tu perfil.'}</p>
    <button type="button" onClick={() => void state.reload()}>Reintentar</button></section>;

  /** Saves a complete editable snapshot, excluding immutable account information. */
  const save = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); if (!draft || state.busy) return;
    setError(''); setFields({}); setNotice('');
    const { email: _email, ...payload } = draft;
    void _email;
    try {
      await state.save({ ...payload, skills: skillsText.split(',').map((value) => value.trim()).filter(Boolean) });
      setDraft(null); setNotice('Perfil actualizado correctamente.');
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'No fue posible guardar tu perfil.');
      if (failure instanceof ApiError) setFields(Object.fromEntries(failure.validationErrors.map((item) => [item.field, item.message])));
    }
  };
  /** Updates a history entry while retaining the rest of the draft. */
  const changeWork = (index: number, patch: Partial<WorkExperience>): void => setDraft({ ...data,
    workExperiences: data.workExperiences.map((item, position) => position === index ? { ...item, ...patch } : item) });
  /** Updates one educational entry using the same date and null conventions as the API. */
  const changeEducation = (index: number, patch: Partial<Education>): void => setDraft({ ...data,
    educations: data.educations.map((item, position) => position === index ? { ...item, ...patch } : item) });
  return <section className="profile-card candidate-editor">
    <div className="candidate-editor-heading"><h2>Mi perfil profesional</h2>
      {!editing && <button type="button" disabled={state.busy} onClick={() => {
        setDraft(structuredClone(data)); setSkillsText(data.skills.join(', ')); setError(''); setFields({}); setNotice('');
      }}>Editar perfil</button>}
    </div>
    {notice && <p role="status">{notice}</p>}
    {(error || state.error) && <p role="alert">{error || state.error}</p>}
    <form onSubmit={(event) => void save(event)} aria-busy={state.busy}>
      <p>Correo: {data.email}</p>
      <div className="candidate-editor-grid">{(Object.keys(labels) as (keyof typeof labels)[]).map((field) =>
        <ProfileField key={field} label={labels[field]} value={data[field]} disabled={state.busy} readOnly={!editing}
          required={field === 'firstName'} maxLength={limits[field]} error={fields[field]}
          onChange={(value) => setDraft({ ...data, [field]: value })} />)}</div>
      <div className="candidate-editor-field"><label htmlFor={summaryId}>Descripción profesional</label>
        <textarea id={summaryId} value={data.professionalSummary ?? ''} maxLength={5000} readOnly={!editing} disabled={state.busy}
          onChange={(event) => setDraft({ ...data, professionalSummary: event.target.value })} />
        {fields.professionalSummary && <small role="alert">{fields.professionalSummary}</small>}
      </div>
      <h3>Experiencia laboral</h3>
      {!data.workExperiences.length && <p>Sin experiencia registrada.</p>}
      {data.workExperiences.map((item, index) => <fieldset key={index} className="candidate-history">
        <legend>Experiencia {index + 1}</legend><div className="candidate-editor-grid">
          {(['companyName', 'position', 'description', 'startDate', 'endDate'] as const).map((field) => <ProfileField key={field}
            label={({ companyName: 'Empresa', position: 'Cargo', description: 'Descripción del cargo', startDate: 'Fecha inicial', endDate: 'Fecha final (vacía si continúa)' })[field]}
            value={item[field] ?? null} disabled={state.busy} readOnly={!editing} error={fields[`workExperiences.${index}.${field}`]}
            type={field.endsWith('Date') ? 'date' : 'text'} required={field !== 'endDate' && field !== 'description'}
            maxLength={field === 'companyName' ? 150 : field === 'position' ? 100 : 5000}
            onChange={(value) => changeWork(index, { [field]: value || null })} />)}
        </div>{editing && <button type="button" disabled={state.busy} onClick={() => setDraft({ ...data,
          workExperiences: data.workExperiences.filter((_item, position) => position !== index) })}>Eliminar experiencia {index + 1}</button>}
      </fieldset>)}
      {editing && <button type="button" disabled={state.busy || data.workExperiences.length >= 50} onClick={() => setDraft({ ...data,
        workExperiences: [...data.workExperiences, { companyName: '', position: '', description: null, startDate: '', endDate: null }] })}>Añadir experiencia</button>}
      <h3>Educación</h3>
      {!data.educations.length && <p>Sin estudios registrados.</p>}
      {data.educations.map((item, index) => <fieldset key={index} className="candidate-history"><legend>Estudio {index + 1}</legend>
        <div className="candidate-editor-grid">{(['institution', 'degree', 'startDate', 'endDate'] as const).map((field) => <ProfileField key={field}
          label={({ institution: 'Institución', degree: 'Título o carrera', startDate: 'Fecha inicial de estudios', endDate: 'Fecha final de estudios (vacía si continúa)' })[field]}
          value={item[field]} disabled={state.busy} readOnly={!editing} error={fields[`educations.${index}.${field}`]}
          type={field.endsWith('Date') ? 'date' : 'text'} required={field !== 'endDate'} maxLength={150}
          onChange={(value) => changeEducation(index, { [field]: value || null })} />)}</div>
        {editing && <button type="button" disabled={state.busy} onClick={() => setDraft({ ...data,
          educations: data.educations.filter((_item, position) => position !== index) })}>Eliminar estudio {index + 1}</button>}
      </fieldset>)}
      {editing && <button type="button" disabled={state.busy || data.educations.length >= 50} onClick={() => setDraft({ ...data,
        educations: [...data.educations, { institution: '', degree: '', startDate: '', endDate: null }] })}>Añadir estudio</button>}
      <div className="candidate-editor-field"><label htmlFor={skillsId}>Habilidades (separadas por comas)</label>
        <input id={skillsId} value={editing ? skillsText : data.skills.join(', ')} readOnly={!editing} disabled={state.busy}
          onChange={(event) => setSkillsText(event.target.value)} />
        {Object.entries(fields).filter(([field]) => field.startsWith('skills')).map(([field, message]) => <small role="alert" key={field}>{message}</small>)}
      </div>
      {editing && <div className="candidate-editor-actions">
        <button type="button" disabled={state.busy} onClick={() => { setDraft(null); setError(''); setFields({}); }}>Cancelar edición</button>
        <button type="submit" className="profile-primary-button" disabled={state.busy}>{state.busy ? 'Guardando…' : 'Guardar perfil'}</button>
      </div>}
    </form>
  </section>;
}
