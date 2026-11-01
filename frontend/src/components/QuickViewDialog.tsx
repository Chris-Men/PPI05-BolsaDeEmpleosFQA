import type { ReactNode } from 'react';
import { useModalDialog } from '../hooks/useModalDialog';

interface QuickViewDialogProps { children: ReactNode; onClose: () => void }

/** Native focus containment and Escape behavior retain the existing quick view presentation. */
export function QuickViewDialog({ children, onClose }: QuickViewDialogProps) {
  const dialog = useModalDialog();
  return <dialog ref={dialog} id="qv-overlay" aria-label="Vista rápida de la vacante"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>{children}</dialog>;
}
