import { useRef, useState } from 'react';
import { ApiError } from '../../services/api';
import { createOpportunity, setOpportunityStatus, updateOpportunity } from '../../services/opportunityService';
import { KIND_LABELS, type Opportunity, type OpportunityCatalogs, type OpportunityInput, type OpportunityKind } from '../../types/opportunity';
import { canManageVacancies } from '../../utils/vacancyManagement';
import { municipalitiesOf } from '../../utils/elSalvadorLocations';
import type { LocationZone } from '../../types/profile';
import { useAuth } from '../../hooks/useAuth';
import { VacancySuccessAlert } from '../../components/admin/VacancySuccessAlert';

/** Editor callbacks keep persistence separate from dashboard navigation. */
interface OpportunityEditorProps { opportunity: Opportunity | null; catalogs: OpportunityCatalogs; onSaved: () => void; onCancel: () => void }
/** Form strings retain incomplete drafts, while API mutations have explicit numeric references. */
type FormValues = Record<keyof OpportunityInput, string>;
type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'money';

const REQUIRED_MESSAGE = 'Este campo es obligatorio.';

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

/** Zona a la que pertenece un departamento ('' si no se reconoce). */
const zoneOf = (department: string, zones: LocationZone[]): string =>
  zones.find((zone) => zone.departments.some((item) => item.name === department))?.name ?? '';

/** All four types share one editor; a saved vacancy retains its original discriminator. */
export default function OpportunityEditor({ opportunity, catalogs, onSaved, onCancel }: OpportunityEditorProps) {
  const { session } = useAuth();
  const [kind, setKind] = useState<OpportunityKind>(opportunity?.kind ?? 'EMPLOYMENT');
  const [values, setValues] = useState(() => initialValues(opportunity));
  const [zone, setZone] = useState(() => zoneOf(opportunity?.department ?? '', catalogs.locationZones));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const savedKey = useRef(opportunity?.key);
  const [created, setCreated] = useState(false);
  /** Alerta de éxito: se muestra ~2 s y luego se vuelve al listado con onSaved. */
  const [success, setSuccess] = useState<{ title: string; message: string } | null>(null);
  const canSave = canManageVacancies(session, opportunity || created ? 'opportunities.update' : 'opportunities.create');

  /** Campos obligatorios (marcados con *). Dependen del tipo de vacante. */
  const requiredNames: Array<keyof FormValues> = [
    'title', 'description', 'organizationId', 'categoryId', 'department', 'municipality', 'slots', 'contact',
    ...(kind === 'EMPLOYMENT' ? (['employmentTypeId'] as const) : []),
    ...(kind !== 'VOLUNTEER' ? (['experienceLevelId'] as const) : []),
    ...(kind === 'SOCIAL_HOURS' ? (['socialHours'] as const) : []),
    ...(kind === 'INTERNSHIP' ? (['duration'] as const) : []),
  ];
  const isRequired = (name: keyof FormValues) => requiredNames.includes(name);
  const update = (name: keyof FormValues, value: string) => setValues((current) => ({ ...current, [name]: value }));

  /** Etiqueta y asterisco en un solo elemento para que queden en la misma línea. */
  const labelText = (label: string, required: boolean) => <span className="field-label">
    {label}{required && <span className="required-mark" aria-hidden="true"> *</span>}
  </span>;

  /** El título basta para un borrador; para publicar (o editar una vacante abierta) se exigen todos los *. */

  const validate = (strict: boolean): Record<string, string> => {
    const found: Record<string, string> = {};

    if (!values.title.trim()) {
      found.title = REQUIRED_MESSAGE;
    }

    if (strict) {
      for (const name of requiredNames) {
        if (!values[name].trim()) {
          found[name] = REQUIRED_MESSAGE;
        }
      }
    }

    // Los cupos deben ser un entero positivo.
    if (values.slots.trim() !== '') {
      const slots = Number(values.slots);

      if (!/^[1-9]\d*$/.test(values.slots) || !Number.isSafeInteger(slots)) {
        found.slots = 'La cantidad de cupos debe ser un número entero mayor que cero.';
      }
    }

    const min = numberValue(values.salaryMin);
    const max = numberValue(values.salaryMax);

    if (kind === 'EMPLOYMENT' && min !== null && max !== null && max < min) {
      found.salaryMax = 'El salario máximo no puede ser menor que el mínimo.';
    }

    return found;
  };

  /** One accessible field renderer displays server validation beside its input. */
  const field = (name: keyof FormValues, label: string, type: FieldType = 'text', options?: Array<{ id: number; name: string }>) => {
    const required = isRequired(name);
    const common = { 'aria-label': label, 'aria-required': required, 'aria-invalid': Boolean(errors[name]), disabled: busy, value: values[name] };
    const isMoney = type === 'money';
    return <label key={name}>
      {labelText(label, required)}
      {options ? <select {...common} onChange={(event) => update(name, event.target.value)}>
        <option value="">Seleccionar</option>
        {values[name] && !options.some((option) => String(option.id) === values[name]) && <option value={values[name]}>Selección anterior (inactiva)</option>}
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select> : type === 'textarea' ? <textarea {...common} onChange={(event) => update(name, event.target.value)} />
        : isMoney ? <span className="money-input">
          <span className="money-symbol" aria-hidden="true">$</span>
          <input {...common} type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" onChange={(event) => update(name, event.target.value)} />
        </span>
          : <input {...common} type={type} step={type === 'number' ? '1' : undefined} min={type === 'number' ? '1' : undefined}
            maxLength={name === 'title' ? 150 : name === 'description' ? 20000 : undefined} onChange={(event) => update(name, event.target.value)} />}
      {errors[name] && <span className="vacancy-error">{errors[name]}</span>}
    </label>;
  };

  /** Zona → Departamento → Municipio: cada lista es corta. Cambiar un nivel limpia los siguientes. */
  const zoneDepartments = catalogs.locationZones.find((item) => item.name === zone)?.departments ?? [];
  const zoneField = <label key="zone">
    <span className="field-label">Zona</span>
    <select aria-label="Zona" disabled={busy} value={zone}
      onChange={(event) => { setZone(event.target.value); setValues((current) => ({ ...current, department: '', municipality: '' })); }}>
      <option value="">Seleccionar</option>
      {catalogs.locationZones.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
    </select>
  </label>;
  const departmentField = <label key="department">
    {labelText('Departamento', true)}
    <select aria-label="Departamento" aria-required aria-invalid={Boolean(errors.department)} disabled={busy || (!zone && !values.department)} value={values.department}
      onChange={(event) => setValues((current) => ({ ...current, department: event.target.value, municipality: '' }))}>
      <option value="">{zone || values.department ? 'Seleccionar' : 'Primero elige una zona'}</option>
      {values.department && !zoneDepartments.some((item) => item.name === values.department) && <option value={values.department}>{values.department} (anterior)</option>}
      {zoneDepartments.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
    </select>
    {errors.department && <span className="vacancy-error">{errors.department}</span>}
  </label>;

  /** Municipio depende del departamento elegido. */
  const municipalities = municipalitiesOf(values.department, catalogs.locationZones);
  const municipalityField = <label key="municipality">
    {labelText('Municipio', true)}
    <select aria-label="Municipio" aria-required aria-invalid={Boolean(errors.municipality)} disabled={busy || !values.department} value={values.municipality}
      onChange={(event) => update('municipality', event.target.value)}>
      <option value="">{values.department ? 'Seleccionar' : 'Primero elige un departamento'}</option>
      {values.municipality && !municipalities.includes(values.municipality) && <option value={values.municipality}>{values.municipality} (anterior)</option>}
      {municipalities.map((name) => <option key={name} value={name}>{name}</option>)}
    </select>
    {errors.municipality && <span className="vacancy-error">{errors.municipality}</span>}
  </label>;

  /** Retains a newly saved identity if publication fails so retries cannot create duplicates. */
  const save = async (publish: boolean): Promise<void> => {
    if (lock.current || !canSave) return;
    const found = validate(publish || opportunity?.status === 'OPEN');
    if (Object.keys(found).length > 0) { setErrors(found); setError('Revisa los campos marcados.'); return; }
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
      // En lugar de salir de inmediato, muestra la alerta; ella llama a onSaved al terminar.
      setSuccess(publish
        ? { title: 'Vacante publicada', message: 'La vacante se publicó correctamente y ya es visible para los candidatos.' }
        : opportunity?.status === 'OPEN'
          ? { title: 'Cambios guardados', message: 'Los cambios de la vacante se guardaron correctamente.' }
          : { title: 'Borrador guardado', message: 'El borrador está guardado. Puedes completar los campos y volver a publicar.' });
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'No se pudo guardar la vacante.');
      if (failure instanceof ApiError) setErrors(Object.fromEntries(failure.validationErrors.map((item) => [item.field.split('.')[0], item.message])));
    } finally { lock.current = false; setBusy(false); }
  };

  return <form className="vacancy-editor" noValidate onSubmit={(event) => { event.preventDefault(); void save(false); }}>
    <h2>{opportunity || created ? 'Editar vacante' : 'Nueva vacante'}</h2>
    {created && !opportunity && !success && <p role="status">El borrador está guardado. Puedes completar los campos y volver a publicar.</p>}
    {error && <p role="alert">{error}</p>}
    <div className="vacancy-fields">
      <label>Tipo de vacante<select aria-label="Tipo de vacante" value={kind} disabled={Boolean(opportunity || created || busy)} onChange={(event) => setKind(event.target.value as OpportunityKind)}>{Object.entries(KIND_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      {field('title', 'Título')}{field('organizationId', 'Organización', 'text', catalogs.organizations)}{field('categoryId', 'Categoría', 'text', catalogs.categories)}
      <div className="location-group">{zoneField}{departmentField}{municipalityField}</div>
      <label>{labelText('Modalidad', true)}<select aria-label="Modalidad" value={values.modality} disabled={busy} onChange={(event) => update('modality', event.target.value)}><option value="ON_SITE">Presencial</option><option value="REMOTE">Remoto</option><option value="HYBRID">Híbrido</option></select></label>
      {field('expiresAt', 'Fecha de cierre', 'date')}{field('slots', 'Cantidad de cupos', 'number')}{field('contact', 'Contacto')}
      {kind === 'EMPLOYMENT' && <>{field('employmentTypeId', 'Jornada o contrato', 'text', catalogs.employmentTypes)}{field('salaryMin', 'Salario mínimo mensual (USD)', 'money')}{field('salaryMax', 'Salario máximo mensual (USD)', 'money')}</>}
      {kind !== 'VOLUNTEER' && field('experienceLevelId', 'Experiencia requerida', 'text', catalogs.experienceLevels)}
      {kind === 'SOCIAL_HOURS' && field('socialHours', 'Horas sociales', 'number')}
      {kind === 'INTERNSHIP' && field('duration', 'Duración de la práctica')}
      <div className="full">{field('description', 'Descripción', 'textarea')}</div>
      {field('responsibilities', 'Responsabilidades (una por línea)', 'textarea')}{field('requirements', 'Requisitos (uno por línea)', 'textarea')}{field('benefits', 'Beneficios (uno por línea)', 'textarea')}
    </div>
    <p className="required-note"><span className="required-mark" aria-hidden="true">*</span> Los campos con asterisco son obligatorios para publicar. Para guardar un borrador solo necesitas el título.</p>
    <footer className="vacancy-actions"><button type="button" disabled={busy} onClick={onCancel}>Cancelar</button>
      {canSave && <button type="submit" disabled={busy || Boolean(success)}>{busy ? 'Guardando…' : opportunity?.status === 'OPEN' ? 'Guardar cambios' : 'Guardar borrador'}</button>}
      {canSave && canManageVacancies(session, 'opportunities.status.update') && opportunity?.status !== 'OPEN' && <button type="button" disabled={busy || Boolean(success)} onClick={() => void save(true)}>Guardar y publicar</button>}
    </footer>
    {success && <VacancySuccessAlert title={success.title} message={success.message} duration={2000} onDone={onSaved} />}
  </form>;
}
