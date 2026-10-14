import { useState } from 'react';
import { clearSavedIntent, getSavedIntent } from '../../utils/savedIntent';
import '../../styles/users/savedOpportunities.css';

/** Login and registration keep one explicit public bookmark intent until success or cancellation. */
export function PendingSavedNotice() {
  const [visible, setVisible] = useState(() => Boolean(getSavedIntent()));
  if (!visible) return null;
  return <div className="saved-intent-notice"><p>Al iniciar sesión o registrarte guardaremos la vacante que seleccionaste.</p><button type="button" onClick={() => { clearSavedIntent(); setVisible(false); }}>Cancelar guardado</button></div>;
}
