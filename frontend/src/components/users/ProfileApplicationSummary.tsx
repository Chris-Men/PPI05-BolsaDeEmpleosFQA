import { BriefcaseBusiness } from 'lucide-react';
import { useApplications } from '../../hooks/useApplications';
import { useAuth } from '../../hooks/useAuth';
import type { CandidateSummarySection } from '../../types/application';
import { KIND_LABELS, type OpportunityKind } from '../../types/opportunity';
import '../../styles/users/applications.css';

interface ProfileApplicationSummaryProps {
  section: Exclude<CandidateSummarySection, 'saved'>;
  onViewAll: () => void;
}

/** Shows recent attempts only; complete data, history and actions belong to Mis postulaciones. */
export function ProfileApplicationSummary({ section, onViewAll }: ProfileApplicationSummaryProps) {
  const { session } = useAuth();
  const allowed = Boolean(session?.roles.includes('CANDIDATE') && session.permissions.includes('applications.read.own'));
  const student = section === 'students';
  const kind: OpportunityKind | undefined = section === 'employment' ? 'EMPLOYMENT'
    : section === 'volunteering' ? 'VOLUNTEER' : student ? 'SOCIAL_HOURS' : undefined;
  const primary = useApplications({ page: 1, pageSize: 5, kind }, false, allowed);
  const internships = useApplications({ page: 1, pageSize: 5, kind: 'INTERNSHIP' }, false, allowed && student);
  const loading = primary.loading || (student && internships.loading);
  const error = primary.error || (student ? internships.error : '');
  const total = primary.page.total + (student ? internships.page.total : 0);
  // Each server page holds five recent attempts, enough to derive the five most recent of both kinds.
  const items = [...primary.page.items, ...(student ? internships.page.items : [])]
    .sort((left, right) => {
      const leftDate = left.createdAt ? Date.parse(left.createdAt) : -Infinity;
      const rightDate = right.createdAt ? Date.parse(right.createdAt) : -Infinity;
      return (rightDate - leftDate) || right.id - left.id;
    }).slice(0, 5);
  const reload = (): void => { primary.reload(); if (student) internships.reload(); };
  const emptyText = section === 'employment' ? 'Todavía no tienes postulaciones a empleos.'
    : section === 'volunteering' ? 'Todavía no tienes postulaciones a voluntariados.'
    : student ? 'Todavía no tienes postulaciones a horas sociales o prácticas.' : 'Todavía no tienes postulaciones.';

  return <>
    {!allowed ? <p role="alert" className="profile-summary-error">No tienes permiso para consultar tus postulaciones.</p>
      : error ? <div role="alert" className="profile-summary-error"><p>{error}</p><button type="button" className="profile-small-button" onClick={reload}>Reintentar</button></div>
      : loading ? <p className="profile-summary-loading" role="status">Cargando postulaciones…</p>
      : items.length === 0 ? <div className="profile-empty-simple"><BriefcaseBusiness size={34} aria-hidden="true" /><p>{emptyText}</p></div>
      : <>
        <p className="profile-summary-caption">{total > items.length ? `${items.length} postulaciones recientes de ${total}` : `${total} ${total === 1 ? 'postulación' : 'postulaciones'}`}</p>
        <div className="profile-list profile-summary-list">{items.map(item => <article className="profile-list-item profile-summary-item" key={item.id}>
          <div className="profile-list-info"><h3>{item.opportunity.title}</h3><p>{item.opportunity.organization?.name ?? 'Sin organización'} · {KIND_LABELS[item.opportunity.kind]}</p>
            {item.createdAt && <time dateTime={item.createdAt}>Enviada el {new Date(item.createdAt).toLocaleDateString('es-SV')}</time>}
          </div>
          <span className={`application-status profile-summary-status status-${item.status.toLowerCase()}`}>{item.statusLabel}</span>
        </article>)}</div>
      </>}
    <div className="profile-summary-footer"><button type="button" className="profile-small-button" onClick={onViewAll}>Ir a Mis postulaciones</button></div>
  </>;
}
