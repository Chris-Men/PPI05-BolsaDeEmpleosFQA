import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { decideApplication, downloadApplicationResume, getApplication, saveDownloadedResume, withdrawApplication } from '../../services/applicationService';
import type { Application, ApplicationStatus } from '../../types/application';
import { APPLICATION_LABELS } from '../../types/application';
import { KIND_LABELS } from '../../types/opportunity';
import { canManageApplications } from '../../utils/applicationManagement';
import '../../styles/users/applications.css';

interface ApplicationDetailsProps { id:number; admin?:boolean; onClose:()=>void; onChanged:()=>void }
/** Displays the immutable submitted snapshot and performs versioned, confirmed decisions. */
export function ApplicationDetails({id,admin=false,onClose,onChanged}:ApplicationDetailsProps) {
  const dialog=useRef<HTMLDialogElement>(null); const {session}=useAuth();
  const [application,setApplication]=useState<Application|null>(null); const [error,setError]=useState('');
  const [action,setAction]=useState<Extract<ApplicationStatus,'IN_REVIEW'|'SELECTED'|'REJECTED'|'WITHDRAWN'>|null>(null);
  const [reason,setReason]=useState(''); const [busy,setBusy]=useState(false); const [revision,setRevision]=useState(0);
  useEffect(()=>{dialog.current?.showModal();},[]);
  useEffect(()=>{let current=true;setError('');void getApplication(id,admin).then(value=>{if(current)setApplication(value);}).catch((failure:unknown)=>{if(current)setError(failure instanceof Error?failure.message:'No se pudo consultar la postulación.');});return()=>{current=false;};},[id,admin,revision]);
  const decide=async()=>{if(!application||!action||busy)return;setBusy(true);setError('');try {
    const saved=action==='WITHDRAWN'?await withdrawApplication(id,application.version):await decideApplication(id,application.version,action,reason.trim()||undefined);
    setApplication(saved);setAction(null);setReason('');onChanged();
  }catch(failure){setError(failure instanceof Error?failure.message:'No se pudo guardar la decisión.');}finally{setBusy(false);}};
  const download=async()=>{if(!application?.resume)return;setBusy(true);try{await saveDownloadedResume(downloadApplicationResume(id,admin),application.resume.originalName);}catch(failure){setError(failure instanceof Error?failure.message:'No se pudo descargar el CV.');}finally{setBusy(false);}};
  const active=application?.status==='PENDING'||application?.status==='IN_REVIEW';
  const canDecide=admin&&canManageApplications(session,'applications.select');
  const canDownload= !admin || canManageApplications(session,'applications.resume.read.any');
  return <dialog ref={dialog} className="application-dialog" onCancel={event=>{if(busy)event.preventDefault();else onClose();}} onClose={onClose}>
    <header className="application-heading"><h2>Detalle de postulación</h2><button type="button" onClick={onClose} disabled={busy} aria-label="Cerrar detalle">×</button></header>
    {error&&<div role="alert" className="application-error">{error} <button type="button" disabled={busy} onClick={()=>{setAction(null);setRevision(value=>value+1);}}>Actualizar datos</button></div>}
    {!application&&!error&&<p role="status">Cargando postulación…</p>}
    {application&&<>
      <div className="application-heading"><div><h3>{application.opportunity.title}</h3><p>{application.opportunity.organization?.name} · {KIND_LABELS[application.opportunity.kind]}</p><small>{application.referenceNumber} · Intento {application.attemptNumber}</small></div><span className={'application-status status-'+application.status.toLowerCase()}>{application.statusLabel}</span></div>
      {application.legacy&&<p className="application-notice">Registro histórico: algunos datos del formulario no se guardaron en su momento.</p>}
      <section className="application-detail-section"><h3>Datos enviados</h3><dl className="application-data"><div><dt>Nombre</dt><dd>{application.candidateName}</dd></div><div><dt>Correo</dt><dd>{application.candidateEmail}</dd></div>{application.data&&Object.entries(application.data.personal).filter(([key])=>!['firstName','lastName'].includes(key)).map(([key,value])=><div key={key}><dt>{{phone:'Teléfono',department:'Departamento',municipality:'Municipio',profession:'Profesión',educationLevel:'Nivel educativo'}[key]}</dt><dd>{value||'Sin especificar'}</dd></div>)}</dl></section>
      {application.data&&<section className="application-detail-section"><h3>Experiencia y motivación</h3><dl className="application-data"><div><dt>Último cargo</dt><dd>{application.data.experience.lastRole||'Sin especificar'}</dd></div><div><dt>Organización</dt><dd>{application.data.experience.lastOrg||'Sin especificar'}</dd></div><div><dt>Habilidades</dt><dd>{application.data.experience.skills||'Sin especificar'}</dd></div></dl><p className="application-text">{application.data.experience.motivation}</p></section>}
      {application.professionalProfile&&<section className="application-detail-section"><h3>Perfil al iniciar el formulario</h3><p>{application.professionalProfile.professionalSummary}</p>{application.professionalProfile.workExperiences.map((item,index)=><p key={index}>{item.position} · {item.companyName} ({item.startDate?.slice(0,10)} — {item.endDate?.slice(0,10)||'Actualidad'})</p>)}{application.professionalProfile.educations.map((item,index)=><p key={index}>{item.degree} · {item.institution} ({item.startDate?.slice(0,10)} — {item.endDate?.slice(0,10)||'Actualidad'})</p>)}</section>}
      <section className="application-detail-section"><h3>Documento enviado</h3>{application.resume?<><p>{application.resume.originalName}</p>{canDownload&&<button type="button" className="application-button secondary" disabled={busy} onClick={()=>void download()}>Descargar PDF original</button>}</>:<p>Esta postulación se envió sin CV.</p>}</section>
      <section className="application-detail-section"><h3>Historial</h3><ol className="application-history">{application.history.map(item=><li key={item.id}><strong>{APPLICATION_LABELS[item.status]}</strong> · {item.createdAt?new Date(item.createdAt).toLocaleString('es-SV'):'Fecha no disponible'}{item.reason&&<p className="application-text">{item.reason}</p>}</li>)}</ol></section>
      {action?<section className="application-confirm"><h3>{action==='WITHDRAWN'?'¿Retirar esta postulación?':'Confirmar: '+APPLICATION_LABELS[action]}</h3><p>{action==='WITHDRAWN'?'Conservaremos este intento y podrás volver a postular.':'La decisión quedará en el historial y será visible para el candidato.'}</p>{admin&&<label>Explicación opcional<textarea maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)}/></label>}<div className="application-actions"><button type="button" className="application-button secondary" disabled={busy} onClick={()=>setAction(null)}>Cancelar</button><button type="button" className="application-button" disabled={busy} onClick={()=>void decide()}>{busy?'Guardando…':'Confirmar'}</button></div></section>:<div className="application-actions">{active&&canDecide&&<>{application.status==='PENDING'&&<button type="button" className="application-button secondary" onClick={()=>setAction('IN_REVIEW')}>Pasar a revisión</button>}<button type="button" className="application-button" onClick={()=>setAction('SELECTED')}>Seleccionar</button><button type="button" className="application-button danger" onClick={()=>setAction('REJECTED')}>Rechazar</button></>}{active&&!admin&&session?.permissions.includes('applications.withdraw.own')&&<button type="button" className="application-button danger" onClick={()=>setAction('WITHDRAWN')}>Retirar postulación</button>}</div>}
    </>}
  </dialog>;
}
