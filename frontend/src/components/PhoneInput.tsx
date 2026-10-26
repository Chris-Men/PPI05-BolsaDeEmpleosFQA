import { useId, useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { phoneDigits, phoneEdit } from '../utils/phone';
import '../styles/fieldValidation.css';

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string; onValueChange: (value: string) => void;
}

/** Shared Salvadoran mask preserves selection, rejects invalid pastes and keeps an empty value empty. */
export function PhoneInput({ value, onValueChange, ...props }: PhoneInputProps) {
  const input = useRef<HTMLInputElement>(null); const caret = useRef<number | null>(null);
  const [rejected, setRejected] = useState(''); const errorId = useId();
  const digits = phoneDigits(value) ?? phoneEdit(value);
  const display = digits === null ? value : '+503 ' + digits.slice(0, 4) + (digits.length > 4 ? '-' + digits.slice(4) : '');
  useLayoutEffect(() => { if (caret.current !== null) { input.current?.setSelectionRange(caret.current, caret.current); caret.current = null; } }, [display]);
  return <><input {...props} ref={input} type="tel" inputMode="tel" autoComplete={props.autoComplete ?? 'tel'} value={display}
    aria-invalid={Boolean(rejected) || props['aria-invalid']}
    aria-describedby={[props['aria-describedby'], rejected ? errorId : ''].filter(Boolean).join(' ') || undefined}
    onSelect={event => {
      const element = event.currentTarget;
      if (digits !== null && element.selectionStart === element.selectionEnd && (element.selectionStart ?? 0) < 5) element.setSelectionRange(5, 5);
      props.onSelect?.(event);
    }}
    onKeyDown={event => {
      if (digits !== null && event.key === 'Backspace' && event.currentTarget.selectionStart === event.currentTarget.selectionEnd && (event.currentTarget.selectionStart ?? 0) <= 5) event.preventDefault();
      props.onKeyDown?.(event);
    }}
    onChange={event => {
      const next = phoneEdit(event.target.value);
      if (next === null) { setRejected('Usa ocho dígitos y el prefijo +503; no se admiten letras ni dígitos adicionales.'); return; }
      const position = event.target.selectionStart ?? event.target.value.length;
      const before = event.target.value.slice(0, position).replace(/^\+503\s?/, '').replace(/\D/g, '').length;
      caret.current = 5 + before + (before > 4 ? 1 : 0);
      setRejected(''); onValueChange(next);
    }} />{rejected && <small id={errorId} className="field-validation-error" role="alert">{rejected}</small>}</>;
}
