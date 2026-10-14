import { useSavedOpportunityState } from '../../hooks/useSavedOpportunities';
import '../../styles/users/savedOpportunities.css';

interface SaveOpportunityButtonProps {
  opportunityKey: string;
  className?: string;
  variant?: 'icon' | 'full' | 'remove';
}

/** Reuses existing button appearances while all types share one account-scoped mutation state. */
export function SaveOpportunityButton({ opportunityKey, className = 'save-opportunity-button', variant = 'full' }: SaveOpportunityButtonProps) {
  const state = useSavedOpportunityState();
  const saved = state.keys.has(opportunityKey);
  const pending = state.pending.has(opportunityKey);
  const error = state.mutationErrors.get(opportunityKey);
  const disabled = Boolean(state.userId && (state.loading || state.error || !state.canUpdate || state.total === null || pending));
  const remove = variant === 'remove' || saved;
  const label = pending ? remove ? 'Quitando…' : 'Guardando…' : remove ? variant === 'remove' ? 'Quitar' : 'Guardada' : 'Guardar vacante';
  /** Anonymous intent is preserved through auth; confirmation follows the backend response. */
  const activate = async (): Promise<void> => {
    if (!state.userId) { state.requestLogin(opportunityKey); return; }
    try {
      await state.change(opportunityKey, !remove);
      state.notice(remove ? 'Vacante eliminada de guardadas.' : 'Vacante guardada en tu perfil.');
    } catch { /* Shared per-key errors remain visible and retrying the button preserves the intended operation. */ }
  };
  return <>
    <button type="button" className={`${className} ${saved ? 'saved' : ''}`} disabled={disabled}
      aria-label={remove ? 'Quitar vacante de guardadas' : 'Guardar vacante'} aria-pressed={saved}
      title={state.userId && !state.canUpdate ? 'No tienes permiso para cambiar guardadas.' : label}
      onClick={event => { event.stopPropagation(); void activate(); }}>
      {variant === 'icon' ? pending ? '…' : saved ? '♥' : '♡' : variant === 'remove' ? label : <>{saved ? '♥' : '♡'} {label}</>}
    </button>
    {error && <span role="alert" className="saved-operation-error">{error} Vuelve a pulsar para reintentar.</span>}
  </>;
}
