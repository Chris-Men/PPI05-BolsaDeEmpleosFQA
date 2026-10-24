import { useId } from 'react';
import type { CandidateCatalogs } from '../../types/profile';
import { municipalitiesOf } from '../../utils/elSalvadorLocations';
import { latestBirthDate, PERSONAL_LABELS, PERSONAL_LIMITS, type FieldErrors, type PersonalField, type PersonalValues } from '../../utils/candidateValidation';

interface CandidatePersonalFieldsProps {
  values: PersonalValues; catalogs: CandidateCatalogs | null; errors: FieldErrors;
  disabled: boolean; readOnly?: boolean; required?: boolean; className?: string; prefix?: string;
  onChange: (field: PersonalField, value: string) => void; onBlur?: (field: PersonalField) => void;
}
interface CandidateCatalogStatusProps { loading: boolean; error: string; onRetry: () => Promise<void> }

/** Catalog requests are independent of document storage and retain edits while retrying. */
export function CandidateCatalogStatus({ loading, error, onRetry }: CandidateCatalogStatusProps) {
  return <>{loading && <p role="status">Cargando opciones…</p>}{error && <p role="alert">{error} <button type="button" onClick={() => void onRetry()}>Reintentar opciones</button></p>}</>;
}

/** Accessible personal controls are shared by the profile and the application wizard. */
export function CandidatePersonalFields({ values, catalogs, errors, disabled, readOnly = false, required = false, className = 'candidate-editor-field', prefix = '', onChange, onBlur }: CandidatePersonalFieldsProps) {
  const id = useId();
  const municipalities = municipalitiesOf(values.department ?? '', catalogs?.locationZones ?? []);
  return <>{(Object.keys(PERSONAL_LABELS) as PersonalField[]).map(field => {
    const value = values[field] ?? ''; const error = errors[field]; const fieldId = `${id}-${field}`;
    const mandatory = field === 'firstName' || (required && field !== 'profession');
    const common = { id: fieldId, name: prefix + field, value, required: mandatory, 'aria-invalid': Boolean(error), 'aria-describedby': error ? fieldId + '-error' : undefined, onBlur: () => onBlur?.(field) };
    const selection = ['sex', 'department', 'municipality', 'educationLevel'].includes(field);
    const options = field === 'sex' ? catalogs?.sexes.map(item => ({ value: item.value, label: item.label })) ?? []
      : field === 'municipality' ? municipalities.map(name => ({ value: name, label: name }))
        : field === 'educationLevel' ? catalogs?.educationLevels.map(name => ({ value: name, label: name })) ?? [] : [];
    const known = field === 'department' ? catalogs?.locationZones.some(zone => zone.departments.some(item => item.name === value)) : options.some(item => item.value === value);
    return <div className={className} key={field}>
      <label htmlFor={fieldId}>{PERSONAL_LABELS[field]}{mandatory ? ' *' : ''}</label>
      {selection ? <select {...common} disabled={disabled || readOnly || !catalogs || (field === 'municipality' && !values.department)} onChange={event => onChange(field, event.target.value)}>
        <option value="">{field === 'municipality' && !values.department ? 'Primero elige un departamento' : 'Seleccionar'}</option>
        {value && !known && <option value={value}>{value} (anterior)</option>}
        {field === 'department' ? catalogs?.locationZones.map(zone => <optgroup label={zone.name} key={zone.name}>{zone.departments.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}</optgroup>)
          : options.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select> : <input {...common} type={field === 'birthDate' ? 'date' : field === 'phone' ? 'tel' : 'text'} max={field === 'birthDate' ? latestBirthDate() : undefined}
        maxLength={PERSONAL_LIMITS[field]} disabled={disabled} readOnly={readOnly} onChange={event => onChange(field, event.target.value)} />}
      {error && <small id={fieldId + '-error'} className="application-field-error" role="alert">{error}</small>}
    </div>;
  })}</>;
}
