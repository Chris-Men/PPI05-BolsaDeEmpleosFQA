import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { initialSiteConfiguration } from '../../config/siteConfiguration';
import AdminDashboard from '../../screens/admin/AdminDashboard';
import { useOpportunityListing } from '../../hooks/useOpportunities';
import { opportunityToJob } from '../../utils/opportunityPresentation';
import { canManageVacancies } from '../../utils/vacancyManagement';
import { STATUS_LABELS } from '../../types/opportunity';

/** Connects the existing administrative prototype to the authenticated identity. */
export function AuthenticatedDashboard() {
  const { session, logout } = useAuth();
  const [configuration, setConfiguration] = useState(initialSiteConfiguration);
  const [error, setError] = useState('');
  const vacancies = useOpportunityListing({ page: 1, pageSize: 100 }, canManageVacancies(session), true, session?.user.id);
  if (!session) return null;
  const user = session.user;
  return <>
    {error && <p role="alert">{error}</p>}
    {vacancies.error && <p role="alert">{vacancies.error} <button type="button" onClick={vacancies.reload}>Reintentar</button></p>}
    <AdminDashboard currentUser={{
      name: user.fullName, email: user.email, initial: user.fullName.charAt(0).toUpperCase(),
      role: session.roles.includes('SUPER_ADMIN') ? 'Super Admin' : 'Administrador',
    }} handleLogout={() => { void logout().catch((failure: unknown) =>
      setError(failure instanceof Error ? failure.message : 'No fue posible cerrar la sesión.')); }}

      jobs={vacancies.page.items.map((value) => ({ ...opportunityToJob(value), status: STATUS_LABELS[value.status] }))}
      vacancyTotal={vacancies.loading ? undefined : vacancies.page.total} onVacanciesChanged={vacancies.reload}
      configuration={configuration} setConfiguration={setConfiguration} />
  </>;
}
