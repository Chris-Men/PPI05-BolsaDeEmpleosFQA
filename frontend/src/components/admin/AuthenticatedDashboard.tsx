import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { initialSiteConfiguration } from '../../config/siteConfiguration';
import AdminDashboard from '../../screens/admin/AdminDashboard';
import type { NewJobForm } from '../../screens/admin/NuevaPostulacion';

/** Connects the existing administrative prototype to the authenticated identity. */
export function AuthenticatedDashboard() {
  const { session, logout } = useAuth();
  const [configuration, setConfiguration] = useState(initialSiteConfiguration);
  const [newJobForm, setNewJobForm] = useState<NewJobForm>({
    title: '', org: '', location: '', area: '', type: '', salary: '', deadline: '',
    desc: '', responsibilities: '', requirements: '', offers: '',
  });
  const [error, setError] = useState('');
  if (!session) return null;
  const user = session.user;
  return <>
    {error && <p role="alert">{error}</p>}
    <AdminDashboard currentUser={{
      name: user.fullName, email: user.email, initial: user.fullName.charAt(0).toUpperCase(),
      role: session.roles.includes('SUPER_ADMIN') ? 'Super Admin' : 'Administrador',
    }} handleLogout={() => { void logout().catch((failure: unknown) =>
      setError(failure instanceof Error ? failure.message : 'No fue posible cerrar la sesión.')); }}
      newJobForm={newJobForm} setNewJobForm={setNewJobForm}
      configuration={configuration} setConfiguration={setConfiguration} />
  </>;
}
