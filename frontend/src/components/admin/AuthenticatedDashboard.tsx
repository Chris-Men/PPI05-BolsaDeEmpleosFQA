import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import AdminDashboard from '../../screens/admin/AdminDashboard';
import { useDashboardStatistics } from '../../hooks/useAdministrativeStatistics';

/** Connects cumulative server statistics and the administrative interface to the current account. */
export function AuthenticatedDashboard() {
  const { session, logout } = useAuth();
  const [error, setError] = useState('');
  const dashboard = useDashboardStatistics();
  if (!session) return null;
  const user = session.user;
  return <>
    {error && <p role="alert">{error}</p>}
    <AdminDashboard currentUser={{
      name: user.fullName, email: user.email, initial: user.fullName.charAt(0).toUpperCase(),
      role: session.roles.includes('SUPER_ADMIN') ? 'Super Admin' : 'Administrador',
    }} handleLogout={() => { void logout().catch((failure: unknown) =>
      setError(failure instanceof Error ? failure.message : 'No fue posible cerrar la sesión.')); }}

      statistics={dashboard.data} statisticsLoading={dashboard.loading} statisticsError={dashboard.error}
      onReloadStatistics={dashboard.reload} onVacanciesChanged={dashboard.reload} />
  </>;
}
