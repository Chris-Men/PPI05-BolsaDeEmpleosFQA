import { useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { useBackdropClose } from '../../hooks/useBackdropClose';

interface VacancySuccessAlertProps {
  title: string;
  message: string;
  /** Milliseconds before the alert closes by itself. */
  duration?: number;
  onDone: () => void;
}

/** Native modal alert without buttons: it closes by itself, or earlier on outside tap / Esc. */
export function VacancySuccessAlert({ title, message, duration = 2000, onDone }: VacancySuccessAlertProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const doneRef = useRef(onDone);
  const finished = useRef(false);

  useEffect(() => { doneRef.current = onDone; });

  /** Runs the callback only once, whichever way the alert is dismissed. */
  const finish = useCallback((): void => {
    if (finished.current) return;
    finished.current = true;
    doneRef.current();
  }, []);

  useBackdropClose(dialogRef, finish);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    const timer = window.setTimeout(finish, duration);
    return () => { window.clearTimeout(timer); dialog?.close(); };
  }, [duration, finish]);

  return <dialog ref={dialogRef} className="vacancy-success-dialog" aria-labelledby="vacancy-success-title"
    style={{ '--alert-duration': duration + 'ms' } as CSSProperties}
    onCancel={(event) => { event.preventDefault(); finish(); }}>
    <h2 id="vacancy-success-title">{title}</h2>
    <p role="status">{message}</p>
  </dialog>;
}
