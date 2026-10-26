import { useId, useState, type FormEvent } from 'react';
import { focusFirstInvalid } from '../utils/candidateValidation';
import '../styles/fieldValidation.css';

/** Exposes field errors on change using the latest rendered values, plus a definitive submit check. */
export function useLiveValidation<T extends object>(values: T, validate: (values: T) => Record<string, string>) {
  const prefix = useId(); const [touched, setTouched] = useState<Record<string, boolean>>({});
  const found = validate(values);
  const errors = Object.fromEntries(Object.entries(found).filter(([key]) => touched[key]));
  const touch = (name: string) => setTouched(current => current[name] ? current : { ...current, [name]: true });
  return {
    errors,
    reset: (): void => setTouched({}),
    watch: (event: FormEvent<HTMLElement>): void => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) touch(target.name);
    },
    bind: (name: string) => ({ name, 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? prefix + '-' + name : undefined, onBlur: () => touch(name) }),
    error: (name: string) => errors[name] ? <small id={prefix + '-' + name} className="field-validation-error" role="alert">{errors[name]}</small> : null,
    check: (container: HTMLElement | null): boolean => {
      setTouched(Object.fromEntries(Object.keys(found).map(name => [name, true])));
      if (Object.keys(found).length) { focusFirstInvalid(container); return false; }
      return true;
    },
  };
}
