import type { Application } from '../types/application';
import { KIND_LABELS } from '../types/opportunity';
import '../styles/users/applications.css';
interface ApplicationConfirmationProps { application:Application; onView:()=>void; onBrowse:()=>void }
/** Success is shown only for the persisted API response, including its real reference. */
export function ApplicationConfirmation({application,onView,onBrowse}:ApplicationConfirmationProps) {
  return <section className="application-section application-confirmation"><h1>¡Postulación enviada!</h1><p>Tu postulación se ha registrado correctamente.</p><dl className="application-data"><div><dt>Referencia</dt><dd>{application.referenceNumber}</dd></div><div><dt>Vacante</dt><dd>{application.opportunity.title}</dd></div><div><dt>Tipo</dt><dd>{KIND_LABELS[application.opportunity.kind]}</dd></div><div><dt>Estado</dt><dd>{application.statusLabel}</dd></div><div><dt>Candidato</dt><dd>{application.candidateName}</dd></div><div><dt>Documento</dt><dd>{application.resume?.originalName??'Sin CV'}</dd></div></dl><p>Podrás consultar el estado y las decisiones en Mis postulaciones y Notificaciones.</p><div className="application-actions"><button type="button" className="application-button" onClick={onView}>Ver mi postulación</button><button type="button" className="application-button secondary" onClick={onBrowse}>Explorar oportunidades</button></div></section>;
}
