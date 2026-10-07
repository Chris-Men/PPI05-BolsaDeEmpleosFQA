import type { Job, StudentSpot, VolunteerSpot } from '../types/models';
import type { Opportunity } from '../types/opportunity';
/** Location labels retain both persisted geographic fields. */
const location = (value: Opportunity): string => [value.municipality, value.department].filter(Boolean).join(', ');
/** Numeric USD ranges have no invented salary when the organization omitted it. */
export const opportunitySalary = (value: Pick<Opportunity, 'salaryMin' | 'salaryMax'>): string => {
  const money = (amount: number) => new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(amount);
  if (value.salaryMin != null && value.salaryMax != null) return value.salaryMin === value.salaryMax ? money(value.salaryMin) : money(value.salaryMin) + '–' + money(value.salaryMax);
  if (value.salaryMin != null) return 'Desde ' + money(value.salaryMin);
  if (value.salaryMax != null) return 'Hasta ' + money(value.salaryMax);
  return 'Salario no especificado';
};
/** Adapts persisted vacancies to the existing public cards without simulated metrics. */
export const opportunityToJob = (value: Opportunity): Job => ({
  id: value.id, opportunityKey: value.key, title: value.title, org: value.organization?.name ?? '', location: location(value), area: value.category?.name ?? '',
  type: [value.employmentType, { ON_SITE: 'Presencial', REMOTE: 'Remoto', HYBRID: 'Híbrido' }[value.modality]].filter(Boolean).join(' · '),
  salary: opportunitySalary(value), date: value.publishedAt ? new Date(value.publishedAt).toLocaleDateString('es-SV') : '',
  closing: value.expiresAt ? 'Cierra el ' + new Date(value.expiresAt).toLocaleDateString('es-SV', { timeZone: 'UTC' }) : undefined,
  desc: value.description, requirements: value.requirements, responsibilities: value.responsibilities, offers: value.benefits,
});
/** Volunteer capacity is displayed as configured slots, without pretending to track availability. */
export const opportunityToVolunteer = (value: Opportunity): VolunteerSpot => ({
  id: value.id, opportunityKey: value.key, title: value.title, org: value.organization?.name ?? '', location: location(value), area: value.category?.name ?? '',
  slots: value.slots, desc: value.description, orgInfo: value.organization?.description ?? '', contact: value.contact ?? '',
});
/** Social hours and internships retain their own required information. */
export const opportunityToStudent = (value: Opportunity): StudentSpot => ({
  id: value.id, opportunityKey: value.key, title: value.title, org: value.organization?.name ?? '', location: location(value), area: value.category?.name ?? '',
  tipo: value.kind === 'SOCIAL_HOURS' ? 'social' : 'practica', desc: value.description, horas: value.socialHours ?? undefined, duracion: value.duration ?? undefined, contact: value.contact ?? '',
});
