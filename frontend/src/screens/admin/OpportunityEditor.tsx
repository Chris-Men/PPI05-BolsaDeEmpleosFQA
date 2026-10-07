import { useRef, useState } from 'react';
import { ApiError } from '../../services/api';
import { createOpportunity, setOpportunityStatus, updateOpportunity } from '../../services/opportunityService';
import { KIND_LABELS, type Opportunity, type OpportunityCatalogs, type OpportunityInput, type OpportunityKind } from '../../types/opportunity';
import { canManageVacancies } from '../../utils/vacancyManagement';
import { useAuth } from '../../hooks/useAuth';

/** Editor callbacks keep persistence separate from dashboard navigation. */
interface OpportunityEditorProps { opportunity: Opportunity | null; catalogs: OpportunityCatalogs; onSaved: () => void; onCancel: () => void }
/** Form strings retain incomplete drafts, while API mutations have explicit numeric references. */
type FormValues = Record<keyof OpportunityInput, string>;
/** Maps stored data to controlled inputs without example values. */
const initialValues = (value: Opportunity | null): FormValues => ({
  title: value?.title ?? '', description: value?.description ?? '', organizationId: String(value?.organizationId ?? ''), categoryId: String(value?.categoryId ?? ''),
  department: value?.department ?? '', municipality: value?.municipality ?? '', modality: value?.modality ?? 'ON_SITE',
  employmentTypeId: String(value?.employmentTypeId ?? ''), experienceLevelId: String(value?.experienceLevelId ?? ''), salaryMin: String(value?.salaryMin ?? ''), salaryMax: String(value?.salaryMax ?? ''),
  slots: String(value?.slots ?? ''), socialHours: String(value?.socialHours ?? ''), duration: value?.duration ?? '', contact: value?.contact ?? '',
  requirements: value?.requirements.join('\n') ?? '', responsibilities: value?.responsibilities.join('\n') ?? '', benefits: value?.benefits.join('\n') ?? '', expiresAt: value?.expiresAt?.slice(0, 10) ?? '',
});
/** Empty optional numeric values clear the field rather than becoming zero. */
const numberValue = (value: string): number | null => value === '' ? null : Number(value);
/** All four types share one editor; a saved vacancy retains its original discriminator. */
export default function OpportunityEditor({ opportunity, catalogs, onSaved, onCancel }: OpportunityEditorProps) {
  const { session } = useAuth();
  const [kind, setKind] = useState<OpportunityKind>(opportunity?.kind ?? 'EMPLOYMENT');
  const [values, setValues] = useState(() => initialValues(opportunity));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const savedKey = useRef(opportunity?.key);
  const [created, setCreated] = useState(false);
  const canSave = canManageVacancies(session, opportunity || created ? 'opportunities.update' : 'opportunities.create');
  /** One accessible field renderer displays server validation beside its input. */
  const field = (name: keyof FormValues, label: string, type = 'text', options?: Array<{ id: number; name: string }>) => <label key={name}>
    {label}
    {options ? <select aria-label={label} disabled={busy} value={values[name]} aria-invalid={Boolean(errors[name])} onChange={(event) => setValues({ ...values, [name]: event.target.value })}>
      <option value="">Seleccionar</option>
      {values[name] && !options.some((option) => String(option.id) === values[name]) && <option value={values[name]}>Selección anterior (inactiva)</option>}
      {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
    </select> : type === 'textarea' ? <textarea aria-label={label} disabled={busy} value={values[name]} aria-invalid={Boolean(errors[name])} onChange={(event) => setValues({ ...values, [name]: event.target.value })} />
      : <input aria-label={label} disabled={busy} type={type} step={type === 'number' ? (name === 'salaryMin' || name === 'salaryMax' ? '0.01' : '1') : undefined} min={type === 'number' ? (name === 'salaryMin' || name === 'salaryMax' ? '0' : '1') : undefined} maxLength={name === 'title' ? 150 : name === 'description' ? 20000 : undefined} value={values[name]} aria-invalid={Boolean(errors[name])} onChange={(event) => setValues({ ...values, [name]: event.target.value })} />}
    {errors[name] && <span className="vacancy-error">{errors[name]}</span>}
  </label>;
  /** Retains a newly saved identity if publication fails so retries cannot create duplicates. */
  const save = async (publish: boolean): Promise<void> => {
    if (lock.current || !canSave) return;
    lock.current = true; setBusy(true); setErrors({}); setError('');
    const lines = (value: string) => value.split('\n').map((line) => line.trim()).filter(Boolean);
    const payload: OpportunityInput = {
      title: values.title, description: values.description, organizationId: numberValue(values.organizationId), categoryId: numberValue(values.categoryId),
      department: values.department || null, municipality: values.municipality || null, modality: values.modality as Opportunity['modality'],
      slots: numberValue(values.slots), contact: values.contact || null, expiresAt: values.expiresAt || null,
      requirements: lines(values.requirements), responsibilities: lines(values.responsibilities), benefits: lines(values.benefits),
      ...(kind === 'EMPLOYMENT' ? { salaryMin: numberValue(values.salaryMin), salaryMax: numberValue(values.salaryMax), employmentTypeId: numberValue(values.employmentTypeId) } : {}),
      ...(kind !== 'VOLUNTEER' ? { experienceLevelId: numberValue(values.experienceLevelId) } : {}),
      ...(kind === 'SOCIAL_HOURS' ? { socialHours: numberValue(values.socialHours) } : {}),
      ...(kind === 'INTERNSHIP' ? { duration: values.duration || null } : {}),
    };
    try {
      const saved = savedKey.current ? await updateOpportunity(savedKey.current, payload) : await createOpportunity(kind, payload);
      savedKey.current = saved.key; setCreated(true);
      if (publish) await setOpportunityStatus(saved.key, 'OPEN');
      onSaved();
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'No se pudo guardar la vacante.');
      if (failure instanceof ApiError) setErrors(Object.fromEntries(failure.validationErrors.map((item) => [item.field.split('.')[0], item.message])));
    } finally { lock.current = false; setBusy(false); }
  };
  return <form className="vacancy-editor" onSubmit={(event) => { event.preventDefault(); void save(false); }}>
    <h2>{opportunity || created ? 'Editar vacante' : 'Nueva vacante'}</h2>
    {created && !opportunity && <p role="status">El borrador está guardado. Puedes completar los campos y volver a publicar.</p>}
    {error && <p role="alert">{error}</p>}
    <div className="vacancy-fields">
      <label>Tipo de vacante<select aria-label="Tipo de vacante" value={kind} disabled={Boolean(opportunity || created || busy)} onChange={(event) => setKind(event.target.value as OpportunityKind)}>{Object.entries(KIND_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      {field('title', 'Título *')}{field('organizationId', 'Organización', 'text', catalogs.organizations)}{field('categoryId', 'Categoría', 'text', catalogs.categories)}
      {field('department', 'Departamento')}{field('municipality', 'Municipio')}
      <label>Modalidad<select aria-label="Modalidad" value={values.modality} disabled={busy} onChange={(event) => setValues({ ...values, modality: event.target.value })}><option value="ON_SITE">Presencial</option><option value="REMOTE">Remoto</option><option value="HYBRID">Híbrido</option></select></label>
      {field('expiresAt', 'Fecha de cierre', 'date')}{field('slots', 'Cantidad de cupos', 'number')}{field('contact', 'Contacto')}
      {kind === 'EMPLOYMENT' && <>{field('employmentTypeId', 'Jornada o contrato', 'text', catalogs.employmentTypes)}{field('salaryMin', 'Salario mínimo mensual (USD)', 'number')}{field('salaryMax', 'Salario máximo mensual (USD)', 'number')}</>}
      {kind !== 'VOLUNTEER' && field('experienceLevelId', 'Experiencia requerida', 'text', catalogs.experienceLevels)}
      {kind === 'SOCIAL_HOURS' && field('socialHours', 'Horas sociales', 'number')}
      {kind === 'INTERNSHIP' && field('duration', 'Duración de la práctica')}
      <div className="full">{field('description', 'Descripción', 'textarea')}</div>
      {field('responsibilities', 'Responsabilidades (una por línea)', 'textarea')}{field('requirements', 'Requisitos (uno por línea)', 'textarea')}{field('benefits', 'Beneficios (uno por línea)', 'textarea')}
    </div>
    <footer className="vacancy-actions"><button type="button" disabled={busy} onClick={onCancel}>Cancelar</button>
      {canSave && <button type="submit" disabled={busy}>{busy ? 'Guardando…' : opportunity?.status === 'OPEN' ? 'Guardar cambios' : 'Guardar borrador'}</button>}
      {canSave && canManageVacancies(session, 'opportunities.status.update') && opportunity?.status !== 'OPEN' && <button type="button" disabled={busy} onClick={() => void save(true)}>Guardar y publicar</button>}
    </footer>
  </form>;
}
