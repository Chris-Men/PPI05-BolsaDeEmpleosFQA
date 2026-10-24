
import { useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { useBackdropClose } from '../../hooks/useBackdropClose';

interface ConfigurationSuccessAlertProps {
  title: string;
  message: string;
  /** Tiempo en milisegundos antes de cerrar la alerta. */
  duration?: number;
  onDone: () => void;
}

/** Alerta de éxito que se cierra automáticamente o al pulsar fuera o Esc. */
export function ConfigurationSuccessAlert({
  title,
  message,
  duration = 2000,
  onDone,
}: ConfigurationSuccessAlertProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const doneRef = useRef(onDone);
  const finished = useRef(false);

  useEffect(() => {
    doneRef.current = onDone;
  });

  /** Evita ejecutar el callback más de una vez. */
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

    return () => {
      window.clearTimeout(timer);
      if (dialog?.open) dialog.close();
    };
  }, [duration, finish]);

  return (
    <dialog
      ref={dialogRef}
      className="configuration-success-dialog"
      aria-labelledby="configuration-success-title"
      style={{ '--alert-duration': `${duration}ms` } as CSSProperties}
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
    >
      <h2 id="configuration-success-title">{title}</h2>
      <p role="status">{message}</p>
    </dialog>
  );
}
