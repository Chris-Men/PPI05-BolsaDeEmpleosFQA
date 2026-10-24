import { useState,useId,useEffect,useRef } from 'react';
import { useApplicationDraft } from '../hooks/useApplicationDraft';
import { useAuth } from '../hooks/useAuth';
import { ResumeManager } from '../components/users/ResumeManager';
import type { CandidateProfileState } from '../hooks/useCandidateProfile';
import type { Application,ApplicationData } from '../types/application';
import type { ResumeMetadata } from '../types/profile';
import { KIND_LABELS } from '../types/opportunity';
import { downloadDraftResume } from '../services/applicationService';
import { CandidateCatalogStatus, CandidatePersonalFields } from '../components/users/CandidatePersonalFields';
import { focusFirstInvalid, formatBirthDate, formatSex, validateApplicationFields } from '../utils/candidateValidation';
import '../styles/users/candidateEditor.css';
interface ApplicationFormProps { opportunityKey:string;candidateState:CandidateProfileState;onSubmitted:(value:Application)=>void;onExit:()=>void; onBeforeLeave:(save:(()=>Promise<unknown>)|null)=>void }
/** Four-step editor with real database autosave; the profile is never updated by editing form fields. */
export function ApplicationForm({opportunityKey,candidateState,onSubmitted,onExit,onBeforeLeave}:ApplicationFormProps) {
  const form=useApplicationDraft(opportunityKey,onSubmitted);const fieldId=useId();
  const container=useRef<HTMLDivElement>(null);
  const {session}=useAuth();
  const [document,setDocument]=useState<ResumeMetadata|null>(null);const [leaving,setLeaving]=useState(false);
  const storedDraft=form.draft;const saveBeforeLeave=form.flush;const resumeBusy=candidateState.busy;
  useEffect(()=>{onBeforeLeave(storedDraft?()=>resumeBusy?Promise.reject(new Error('Espera a que termine la operación del CV.')):saveBeforeLeave():null);return()=>onBeforeLeave(null);},[storedDraft,saveBeforeLeave,onBeforeLeave,resumeBusy]);
  useEffect(()=>{if(form.error)focusFirstInvalid(container.current);},[form.error,form.step]);
  if(form.loading)return <div className="session-status" role="status">Cargando tu borrador…</div>;
  if(!form.draft)return <div className="session-status"><p role="alert">{form.error}</p><button onClick={()=>void form.reload()}>Reintentar</button><button onClick={onExit}>Volver</button></div>;
  const draft=form.draft;const required=['EMPLOYMENT','INTERNSHIP'].includes(draft.opportunity.kind);
  const selected=form.resumeId===document?.id?document:form.resumeId===candidateState.resume?.id?candidateState.resume:form.resumeId===draft.resume?.id?draft.resume:null;
  /** One selection path keeps uploaded and existing profile documents in the same autosaved draft. */
  const selectResume=(file:ResumeMetadata|null):void=>{setDocument(file);form.chooseResume(file?.id??null);form.setFields({...form.fields,resumeId:''});};
  const experience=(field:keyof ApplicationData['experience'],label:string,maxLength:number,textarea=false) => <div className={'ff '+(textarea?'full':'')} key={field}>
    <label htmlFor={fieldId+'-'+field}>{label}</label>
    {textarea?<textarea id={fieldId+'-'+field} name={'experience.'+field} maxLength={maxLength} value={form.data.experience[field]}
      aria-invalid={Boolean(form.fields['experience.'+field])} aria-describedby={form.fields['experience.'+field]?fieldId+'-'+field+'-error':undefined}
      onBlur={()=>form.setFields({...form.fields,['experience.'+field]:validateApplicationFields(form.data,candidateState.catalogs,2,form.resumeId,required)['experience.'+field]??''})}
      onChange={event=>form.edit({...form.data,experience:{...form.data.experience,[field]:event.target.value}})}/>
      :<input id={fieldId+'-'+field} name={'experience.'+field} maxLength={maxLength} value={form.data.experience[field]}
        aria-invalid={Boolean(form.fields['experience.'+field])} aria-describedby={form.fields['experience.'+field]?fieldId+'-'+field+'-error':undefined}
        onBlur={()=>form.setFields({...form.fields,['experience.'+field]:validateApplicationFields(form.data,candidateState.catalogs,2,form.resumeId,required)['experience.'+field]??''})}
        onChange={event=>form.edit({...form.data,experience:{...form.data.experience,[field]:event.target.value}})}/>}
    {form.fields['experience.'+field]&&<p id={fieldId+'-'+field+'-error'} className="application-field-error" role="alert">{form.fields['experience.'+field]}</p>}
  </div>;
  const next=():void=>{
    const errors=validateApplicationFields(form.data,candidateState.catalogs,form.step,form.resumeId,required);
    form.setFields(errors);if(Object.keys(errors).length){
      if(form.step===4){const first=Object.keys(errors)[0];void form.changeStep(first.startsWith('personal.')?1:first.startsWith('experience.')?2:3);}
      focusFirstInvalid(container.current);return;
    }
    if(form.step<4)void form.changeStep(form.step+1);else void form.submit();
  };
  const exit=async():Promise<void>=>{setLeaving(true);try{await form.flush();onExit();}catch{ /* The draft hook displays failures and retains edits. */ }finally{setLeaving(false);}};
  const unavailable=draft.opportunity.status!=='OPEN'||Boolean(draft.opportunity.archivedAt)||Boolean(draft.opportunity.expiresAt&&Date.parse(draft.opportunity.expiresAt)<=Date.now());
  return <div ref={container} className="screen application-form">
    <div className="form-prog-bar"><div className="form-prog-fill" style={{width:form.step*25+'%'}}/></div>
    <div className="form-shell"><aside className="form-aside"><p className="fa-hd">Tu postulación</p>
      {['Datos personales','Experiencia','Documentos','Confirmar'].map((label,index)=><div className="step-item" key={label}><div className={'step-n '+(form.step>index+1?'done':form.step===index+1?'cur':'pend')}>{index+1}</div><div className="step-info"><div className="step-lbl">{label}</div></div></div>)}
      <div className="fa-vac"><div className="fa-vac-lbl">{KIND_LABELS[draft.opportunity.kind]}</div><div className="fa-vac-title">{draft.opportunity.title}</div><div className="fa-vac-org">{draft.opportunity.organization?.name}</div></div>
      <button type="button" className="btn-back-f" disabled={form.submitting||leaving} onClick={()=>void exit()}>Guardar y salir</button>
    </aside><div className="form-content-wrap"><fieldset className="form-pages" disabled={form.submitting}>
      <p className="autosave-row" role="status">{form.saving?'Guardando…':form.saved?'Borrador guardado':'Cambios pendientes de guardar'}</p>
      <CandidateCatalogStatus loading={candidateState.catalogsLoading} error={candidateState.catalogsError} onRetry={candidateState.reloadCatalogs} />
      {form.error&&<div role="alert" className="application-error">{form.error} {form.conflict?<><p>Recargar reemplaza las ediciones locales por la versión guardada.</p><button type="button" onClick={()=>void form.reload()}>Recargar borrador</button></>:<button type="button" onClick={()=>void form.flush().catch(()=>undefined)}>Reintentar guardado</button>}</div>}
      {unavailable&&<p role="alert">Esta vacante ya no recibe postulaciones. Puedes conservar o descartar tu borrador.</p>}
      {form.step===1&&<div className="form-page"><div className="fp-hd"><h3>Información personal</h3><p>Estos datos se guardarán en esta postulación.</p></div><div className="fg2">
        <div className="ff"><label htmlFor={fieldId+'-email'}>Correo de la cuenta</label><input id={fieldId+'-email'} type="email" value={session?.user.email??draft.professionalProfile?.email??''} readOnly/></div>
        <CandidatePersonalFields values={form.data.personal} catalogs={candidateState.catalogs} required disabled={form.submitting} className="ff" prefix="personal."
          errors={Object.fromEntries(Object.entries(form.fields).filter(([key])=>key.startsWith('personal.')).map(([key,value])=>[key.slice(9),value]))}
          onChange={(field,value)=>{form.edit({...form.data,personal:{...form.data.personal,[field]:value,...(field==='department'?{municipality:''}:{})}});form.setFields({...form.fields,['personal.'+field]:'',...(field==='department'?{'personal.municipality':''}:{})});}}
          onBlur={field=>form.setFields({...form.fields,['personal.'+field]:validateApplicationFields(form.data,candidateState.catalogs,1,form.resumeId,required)['personal.'+field]??''})} />
      </div></div>}
      {form.step===2&&<div className="form-page"><div className="fp-hd"><h3>Experiencia y motivación</h3><p>La experiencia previa es opcional.</p></div><div className="fg2">
        {experience('lastRole','Último cargo ocupado',100)}{experience('lastOrg','Organización anterior',150)}
        {experience('motivation','¿Por qué deseas participar? *',5000,true)}{experience('skills','Habilidades clave (separadas por coma)',5000)}
      </div></div>}
      {form.step===3&&<div className="form-page"><div className="fp-hd"><h3>Documentos de postulación</h3><p>{required?'Adjunta un CV para completar esta postulación.':'El CV es opcional para esta oportunidad.'}</p></div>
        <ResumeManager state={candidateState} onUploaded={selectResume}
          application={{selected,required,error:form.fields.resumeId,
            onSelect:selectResume,
            onDownload:async()=>{const saved=await form.flush();return downloadDraftResume(saved.id);}}}/>
      </div>}
      {form.step===4&&<div className="form-page"><div className="fp-hd"><h3>Revisa tu postulación</h3><p>Verifica los datos antes de enviarlos.</p></div>
        <div className="review-block"><div className="rb-hd"><span>Datos personales</span><button onClick={()=>void form.changeStep(1)}>Editar</button></div><p>{form.data.personal.firstName} {form.data.personal.lastName}</p><p>{session?.user.email??draft.professionalProfile?.email} · {form.data.personal.phone}</p><p>Fecha de nacimiento: {formatBirthDate(form.data.personal.birthDate)} · Sexo: {formatSex(form.data.personal.sex)}</p><p>{form.data.personal.municipality}, {form.data.personal.department}</p><p>{form.data.personal.profession} · {form.data.personal.educationLevel}</p></div>
        <div className="review-block"><div className="rb-hd"><span>Experiencia y motivación</span><button onClick={()=>void form.changeStep(2)}>Editar</button></div><p>{form.data.experience.lastRole||'Sin experiencia previa indicada'} · {form.data.experience.lastOrg}</p><p>{form.data.experience.skills}</p><p className="application-prewrap">{form.data.experience.motivation}</p></div>
        <div className="review-block"><div className="rb-hd"><span>Documento</span><button onClick={()=>void form.changeStep(3)}>Editar</button></div><p>{selected?.originalName??'Sin CV'}</p>{form.fields.resumeId&&<p role="alert">{form.fields.resumeId}</p>}</div>
      </div>}
    </fieldset><div className="form-footer"><button type="button" className="btn-back-f" disabled={form.step===1||form.submitting} onClick={()=>void form.changeStep(form.step-1)}>← Anterior</button><span className="prog-txt">Paso {form.step} de 4</span>
      <button type="button" className="btn-next-f" disabled={form.submitting||form.conflict||candidateState.busy||(unavailable&&form.step===4)} onClick={next}>{form.submitting?'Enviando…':form.step===4?'Enviar postulación ✓':'Continuar →'}</button>
    </div></div></div>
  </div>;
}
