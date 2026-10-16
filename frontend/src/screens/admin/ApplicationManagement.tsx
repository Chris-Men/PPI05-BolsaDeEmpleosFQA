import { ApplicationList } from '../../components/applications/ApplicationList';
import { useApplicationStatistics } from '../../hooks/useApplications';
import { useAuth } from '../../hooks/useAuth';
import { canManageApplications } from '../../utils/applicationManagement';
import '../../styles/admin/cv-recibidos.css';
interface ApplicationManagementProps { onChanged:()=>void }
/** Preserves the administration layout while reading full server aggregates and original documents. */
export default function ApplicationManagement({onChanged}:ApplicationManagementProps) {
  const {session}=useAuth();const allowed=canManageApplications(session);const indicators=useApplicationStatistics(allowed);
  if(!allowed)return <p role="alert">No tienes permiso para consultar postulaciones.</p>;
  const changed=()=>{indicators.reload();onChanged();};
  return <div className="application-admin"><div className="cards"><div className="card"><span>Postulaciones</span><h2>{indicators.error?'—':indicators.statistics?.total??'—'}</h2></div><div className="card"><span>Candidatos postulantes</span><h2>{indicators.error?'—':indicators.statistics?.candidates??'—'}</h2></div><div className="card"><span>Postulaciones con CV</span><h2>{indicators.error?'—':indicators.statistics?.withResume??'—'}</h2></div></div>{indicators.error&&<p role="alert">{indicators.error} <button type="button" onClick={indicators.reload}>Reintentar</button></p>}<ApplicationList admin onChanged={changed}/></div>;
}
