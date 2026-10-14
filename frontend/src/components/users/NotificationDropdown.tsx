import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Bell, Check, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useApplications';
import { markNotificationRead } from '../../services/applicationService';
import type { CandidateNotification } from '../../types/application';
import { ApplicationDetails } from '../applications/ApplicationDetails';

interface NotificationDropdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewAll: () => void;
}

/** Shows recent private notifications; its state is discarded when the account changes. */
export function NotificationDropdown({ open, onOpenChange, onViewAll }: NotificationDropdownProps) {
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const titleId = useId();
  const state = useNotifications(true, 1, 5);
  const { session } = useAuth();
  const canMarkRead = session?.permissions.includes('notifications.update.own');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const { reload } = state;

  useEffect(() => { if (open) reload(); }, [open, reload]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent): void => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) onOpenChange(false);
    };
    const escape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') { onOpenChange(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open, onOpenChange]);

  /** Read state changes only after server confirmation; failed requests remain recoverable. */
  const openNotification = async (item: CandidateNotification): Promise<void> => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (!item.readAt && canMarkRead) await markNotificationRead(item.id);
      if (item.applicationId) { onOpenChange(false); setSelected(item.applicationId); }
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'No se pudo abrir la notificación.');
    } finally { setBusy(false); }
  };
  const unread = state.error ? 0 : state.result.unreadCount;

  return <div className="nav-notifications" ref={container}>
    <button ref={trigger} type="button" className={`nav-notifications-button ${open ? 'active' : ''}`}
      aria-label={unread > 0 ? `Notificaciones: ${unread} sin leer` : 'Notificaciones'}
      aria-expanded={open} aria-controls={open ? panelId : undefined}
      title="Notificaciones" onClick={() => { setError(''); onOpenChange(!open); }}>
      <Bell size={21} aria-hidden="true" />
      {unread > 0 && <span className="nav-notifications-badge" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
    </button>
    {open && <section id={panelId} className="nav-notifications-panel" aria-labelledby={titleId}>
      <header className="nav-notifications-header">
        <div><h2 id={titleId}>Notificaciones</h2><p>{state.error ? 'No disponibles' : `${state.result.unreadCount} sin leer`}</p></div>
        <button type="button" className="nav-notifications-close" aria-label="Cerrar notificaciones" onClick={() => { onOpenChange(false); trigger.current?.focus(); }}><X size={18} /></button>
      </header>
      <div className="nav-notifications-list">
        {(error || state.error) && <div className="nav-notifications-error" role="alert"><p>{error || state.error}</p><button type="button" onClick={() => { setError(''); reload(); }}>Reintentar</button></div>}
        {state.loading ? <p className="nav-notifications-empty" role="status">Cargando notificaciones…</p>
          : !state.error && state.result.items.length === 0 ? <div className="nav-notifications-empty"><Bell size={26} aria-hidden="true" /><p>No tienes notificaciones.</p></div>
          : !state.error && <ul>{state.result.items.map(item => <li key={item.id}>
            <button type="button" disabled={busy} className={`nav-notification-item ${item.readAt ? 'read' : 'unread'}`} onClick={() => void openNotification(item)}>
              <span className="nav-notification-indicator" aria-hidden="true">{item.readAt ? <Check size={16} /> : <span />}</span>
              <span className="nav-notification-content"><strong>{item.title}</strong><span className="nav-notification-message">{item.message}</span>
                {item.createdAt && <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' })}</time>}
                {!item.readAt && <span className="nav-notification-state">Sin leer</span>}
              </span>
            </button>
          </li>)}</ul>}
      </div>
      <button type="button" className="nav-notifications-view-all" onClick={() => { onOpenChange(false); onViewAll(); }}>Ver todas <ArrowRight size={17} aria-hidden="true" /></button>
    </section>}
    {selected !== null && <ApplicationDetails id={selected} onClose={() => { setSelected(null); trigger.current?.focus(); }} onChanged={reload} />}
  </div>;
}
