import { useCallback,useEffect,useRef,useState } from 'react';
import { createApplicationDraft,getApplicationDraft,saveApplicationDraft,submitApplication } from '../services/applicationService';
import { ApiError } from '../services/api';
import { emptyApplicationData,type ApplicationData,type ApplicationDraft,type Application } from '../types/application';
/** Serialized autosaves preserve new keystrokes while earlier network requests finish. */
export function useApplicationDraft(key:string,onSubmitted:(value:Application)=>void) {
  const [draft,setDraft]=useState<ApplicationDraft|null>(null);
  const [data,setData]=useState<ApplicationData>(emptyApplicationData);
  const [step,setStep]=useState(1); const [resumeId,setResumeId]=useState<number|null>(null);
  const [revision,setRevision]=useState(0);const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState('');const [fields,setFields]=useState<Record<string,string>>({});
  const [conflict,setConflict]=useState(false); const [saved,setSaved]=useState(true);
  const mounted=useRef(true); const pending=useRef<Promise<ApplicationDraft>|null>(null);
  const sending=useRef(false);
  const state=useRef({draft:null as ApplicationDraft|null,data:emptyApplicationData(),step:1,resumeId:null as number|null,revision:0,savedRevision:0,conflict:false});
  const report=useCallback((failure:unknown):void=>{
    if(!mounted.current)return;
    setError(failure instanceof Error?failure.message:'No fue posible guardar la postulación.');
    if(failure instanceof ApiError){
      const errors=Object.fromEntries(failure.validationErrors.map(field=>[field.field.replace(/^data\./,''),field.message]));setFields(errors);
      const first=Object.keys(errors)[0];
      if(first){const next=first.startsWith('personal.')?1:first.startsWith('experience.')?2:3;state.current.step=next;setStep(next);}
      if(failure.status===409){state.current.conflict=true;setConflict(true);}
    }
  },[]);
  const initialize=useCallback((value:ApplicationDraft):void=>{
    state.current={draft:value,data:value.data,step:value.currentStep,resumeId:value.resume?.id??null,revision:0,savedRevision:0,conflict:false};
    setDraft(value);setData(value.data);setStep(value.currentStep);setResumeId(value.resume?.id??null);setError('');setFields({});setConflict(false);setSaved(true);
  },[]);
  useEffect(()=>{
    mounted.current=true;let current=true;setLoading(true);
    void createApplicationDraft(key).then(value=>{if(current)initialize(value);}).catch((failure:unknown)=>{if(current)report(failure);}).finally(()=>{if(current)setLoading(false);});
    return()=>{current=false;mounted.current=false;};
  },[key,initialize,report]);
  const save=useCallback(async():Promise<ApplicationDraft>=>{
    while(pending.current)await pending.current;
    const current=state.current;
    if(!current.draft)throw new Error('Espera a que cargue el formulario.');
    if(current.conflict)throw new Error('Recarga el borrador para resolver el conflicto.');
    if(current.revision===current.savedRevision)return current.draft;
    const version=current.draft.version;const savedRevision=current.revision;
    const request=saveApplicationDraft(current.draft.id,{version,currentStep:current.step,data:current.data,resumeId:current.resumeId});
    pending.current=request; if(mounted.current)setSaving(true);
    try{
      const result=await request;state.current.draft=result;state.current.savedRevision=savedRevision;
      if(mounted.current){setDraft(result);setSaved(state.current.revision===savedRevision);setError('');}
      return result;
    }catch(failure:unknown){report(failure);throw failure;}
    finally{pending.current=null;if(mounted.current)setSaving(false);}
  },[report]);
  /** Flushes every queued edit before a step change, navigation or submission. */
  const flush=useCallback(async():Promise<ApplicationDraft>=>{
    let value=await save();
    while(state.current.revision!==state.current.savedRevision)value=await save();
    return value;
  },[save]);
  const edit=useCallback((next:ApplicationData):void=>{
    state.current.data=next;state.current.revision++;setData(next);setRevision(state.current.revision);setSaved(false);
  },[]);
  const chooseResume=useCallback((id:number|null):void=>{
    state.current.resumeId=id;state.current.revision++;setResumeId(id);setRevision(state.current.revision);setSaved(false);
  },[]);
  const changeStep=async(next:number):Promise<void>=>{
    state.current.step=next;state.current.revision++;setStep(next);setRevision(state.current.revision);setSaved(false);
    try{await flush();}catch{ /* Saving errors remain visible and edits stay in memory. */ }
  };
  useEffect(()=>{if(!revision||conflict)return;const timer=setTimeout(()=>{void save().catch(()=>undefined);},800);return()=>clearTimeout(timer);},[revision,conflict,save]);
  useEffect(()=>{const warn=(event:BeforeUnloadEvent):void=>{if(state.current.revision!==state.current.savedRevision){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
  const reload=async():Promise<void>=>{
    try{setLoading(true); if(pending.current)await pending.current.catch(()=>undefined); if(state.current.draft)initialize(await getApplicationDraft(state.current.draft.id));else initialize(await createApplicationDraft(key));}catch(failure:unknown){report(failure);}finally{if(mounted.current)setLoading(false);}
  };
  const submit=async():Promise<void>=>{
    if(sending.current)return;sending.current=true;setSubmitting(true);setFields({});setError('');
    try{const value=await flush();const result=await submitApplication(value.id,value.version);if(mounted.current)onSubmitted(result);}
    catch(failure:unknown){report(failure);}
    finally{sending.current=false;if(mounted.current)setSubmitting(false);}
  };
  return {draft,data,step,resumeId,loading,saving,submitting,error,fields,conflict,saved,edit,chooseResume,changeStep,flush,submit,reload,setFields};
}
