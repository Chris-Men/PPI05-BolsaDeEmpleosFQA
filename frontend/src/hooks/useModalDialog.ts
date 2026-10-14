import { useEffect, useRef } from 'react';

/** Opens native dialogs; callers may preserve the trigger before an asynchronous detail request. */
export function useModalDialog(returnFocus?: HTMLElement | null) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(returnFocus ?? null);
  useEffect(() => {
    if (!opener.current && document.activeElement instanceof HTMLElement) opener.current = document.activeElement;
    const trigger = opener.current;
    const modal = dialog.current;
    modal?.showModal();
    return () => {
      modal?.close();
      // StrictMode replays effects while the dialog is still connected.
      if (!modal?.isConnected && trigger?.isConnected) trigger.focus();
    };
  }, []);
  return dialog;
}
