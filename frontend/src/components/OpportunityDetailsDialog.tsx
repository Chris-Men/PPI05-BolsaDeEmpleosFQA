import { useId } from 'react';
import { BriefcaseBusiness, X } from 'lucide-react';
import { useModalDialog } from '../hooks/useModalDialog';
import { KIND_LABELS, STATUS_LABELS, type Opportunity } from '../types/opportunity';
import { opportunitySalary } from '../utils/opportunityPresentation';
import '../styles/components/detailDialog.css';
/** The caller supplies a fresh, authorized detail response. */
interface OpportunityDetailsDialogProps { opportunity: Opportunity; onClose: () => void; returnFocus?: HTMLElement | null }
/** Uses the same detail layout for candidates and administrators, preserving each vacancy's fields. */
export function OpportunityDetailsDialog({ opportunity, onClose, returnFocus }: OpportunityDetailsDialogProps) {
  const ref = useModalDialog(returnFocus);
  const titleId = useId();
  const sections = [{ title: 'Responsabilidades', lines: opportunity.responsibilities }, { title: 'Requisitos', lines: opportunity.requirements }, { title: 'Beneficios', lines: opportunity.benefits }];
  return <dialog ref={ref} className="opportunity-details-dialog detail-dialog" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header className="detail-dialog-header">
      <span className="detail-dialog-icon" aria-hidden="true"><BriefcaseBusiness size={22} /></span>
      <div><h2 id={titleId}>Detalle de vacante</h2><p>Información de la oportunidad</p></div>
      <button type="button" className="detail-dialog-close" aria-label="Cerrar detalle de vacante" autoFocus onClick={onClose}><X size={20} /></button>
    </header>
    <div className="detail-dialog-body">
      <div className="detail-dialog-summary">
        <div><h3>{opportunity.title}</h3><p>{opportunity.organization?.name ?? 'Sin asignar'} · {KIND_LABELS[opportunity.kind]}</p></div>
        <span className="detail-dialog-status" data-status={opportunity.status}>{STATUS_LABELS[opportunity.status]}</span>
      </div>
      <section className="detail-dialog-section">
        <h3>Información de la vacante</h3>
        <dl className="detail-dialog-data">
          <div><dt>Organización</dt><dd>{opportunity.organization?.name ?? 'Sin asignar'}</dd></div>
          <div><dt>Categoría</dt><dd>{opportunity.category?.name ?? 'Sin asignar'}</dd></div>
          <div><dt>Ubicación</dt><dd>{[opportunity.municipality, opportunity.department].filter(Boolean).join(', ') || 'Sin especificar'}</dd></div>
          <div><dt>Modalidad</dt><dd>{{ ON_SITE: 'Presencial', REMOTE: 'Remoto', HYBRID: 'Híbrido' }[opportunity.modality]}</dd></div>
          {opportunity.kind === 'EMPLOYMENT' && <>
            <div><dt>Salario mensual (USD)</dt><dd>{opportunitySalary(opportunity)}</dd></div>
            <div><dt>Jornada o contrato</dt><dd>{opportunity.employmentType || 'Sin especificar'}</dd></div>
          </>}
          {opportunity.experienceLevel && <div><dt>Experiencia</dt><dd>{opportunity.experienceLevel}</dd></div>}
          {opportunity.socialHours != null && <div><dt>Horas sociales</dt><dd>{opportunity.socialHours}</dd></div>}
          {opportunity.duration && <div><dt>Duración</dt><dd>{opportunity.duration}</dd></div>}
          {opportunity.slots != null && <div><dt>Cupos</dt><dd>{opportunity.slots}</dd></div>}
          {opportunity.contact && <div><dt>Contacto</dt><dd>{opportunity.contact}</dd></div>}
          {opportunity.expiresAt && <div><dt>Fecha de cierre</dt><dd>{new Date(opportunity.expiresAt).toLocaleDateString('es-SV', { timeZone: 'UTC' })}</dd></div>}
        </dl>
      </section>
      <section className="detail-dialog-section"><h3>Descripción</h3><p className="detail-dialog-text">{opportunity.description || 'Sin descripción'}</p></section>
      {sections.filter((section) => section.lines.length > 0).map((section) => <section key={section.title} className="detail-dialog-section">
        <h3>{section.title}</h3><ul className="detail-dialog-list">{section.lines.map((line, index) => <li key={index}>{line}</li>)}</ul>
      </section>)}
    </div>
    <footer className="detail-dialog-footer"><button type="button" className="detail-dialog-button" onClick={onClose}>Cerrar</button></footer>
  </dialog>;
}
