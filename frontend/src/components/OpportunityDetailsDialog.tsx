import { useEffect, useRef } from 'react';
import { KIND_LABELS, STATUS_LABELS, type Opportunity } from '../types/opportunity';
import { opportunitySalary } from '../utils/opportunityPresentation';
/** The caller supplies a fresh, authorized detail response. */
interface OpportunityDetailsDialogProps { opportunity: Opportunity; onClose: () => void }
/** Reusable read-only detail for every type, including archived administrative records. */
export function OpportunityDetailsDialog({ opportunity, onClose }: OpportunityDetailsDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const trigger = document.activeElement; const modal = ref.current; modal?.showModal(); return () => { modal?.close(); if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus(); }; }, []);
  const sections = [{ title: 'Responsabilidades', lines: opportunity.responsibilities }, { title: 'Requisitos', lines: opportunity.requirements }, { title: 'Beneficios', lines: opportunity.benefits }];
  return <dialog ref={ref} className="vacancy-dialog" aria-labelledby="opportunity-detail-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <h2 id="opportunity-detail-title">{opportunity.title}</h2>
    <p>{KIND_LABELS[opportunity.kind]} · {STATUS_LABELS[opportunity.status]}</p>
    <dl className="vacancy-detail"><dt>Organización</dt><dd>{opportunity.organization?.name ?? 'Sin asignar'}</dd><dt>Categoría</dt><dd>{opportunity.category?.name ?? 'Sin asignar'}</dd><dt>Ubicación</dt><dd>{[opportunity.municipality, opportunity.department].filter(Boolean).join(', ') || 'Sin especificar'}</dd><dt>Modalidad</dt><dd>{{ ON_SITE: 'Presencial', REMOTE: 'Remoto', HYBRID: 'Híbrido' }[opportunity.modality]}</dd>
      {opportunity.kind === 'EMPLOYMENT' && <><dt>Salario mensual (USD)</dt><dd>{opportunitySalary(opportunity)}</dd><dt>Jornada o contrato</dt><dd>{opportunity.employmentType || 'Sin especificar'}</dd></>}
      {opportunity.experienceLevel && <><dt>Experiencia</dt><dd>{opportunity.experienceLevel}</dd></>}
      {opportunity.socialHours != null && <><dt>Horas sociales</dt><dd>{opportunity.socialHours}</dd></>}
      {opportunity.duration && <><dt>Duración</dt><dd>{opportunity.duration}</dd></>}
      {opportunity.slots != null && <><dt>Cupos</dt><dd>{opportunity.slots}</dd></>}
      {opportunity.contact && <><dt>Contacto</dt><dd>{opportunity.contact}</dd></>}
      {opportunity.expiresAt && <><dt>Fecha de cierre</dt><dd>{new Date(opportunity.expiresAt).toLocaleDateString('es-SV', { timeZone: 'UTC' })}</dd></>}
    </dl>
    <h3>Descripción</h3><p style={{ whiteSpace: 'pre-wrap' }}>{opportunity.description || 'Sin descripción'}</p>
    {sections.filter((section) => section.lines.length > 0).map((section) => <section key={section.title}><h3>{section.title}</h3><ul>{section.lines.map((line, index) => <li key={index}>{line}</li>)}</ul></section>)}
    <div className="vacancy-actions"><button type="button" autoFocus onClick={onClose}>Cerrar</button></div>
  </dialog>;
}
