import { apiRequest } from './api';
import type { Application,ApplicationDraft,ApplicationData,ApplicationFilters,ApplicationStatistics,ApplicationStatus,NotificationPage } from '../types/application';
import type { Page } from '../types/opportunity';
/** All application operations use authenticated transport with normal session renewal. */
const query = (filters:object):string => { const params=new URLSearchParams(); Object.entries(filters).forEach(([key,value])=>{if(value!==undefined && value!=='')params.set(key,String(value));}); return params.size?'?'+params.toString():''; };
const body = (payload:unknown) => ({authenticated:true,body:JSON.stringify(payload)});
export const createApplicationDraft = (opportunityKey:string) => apiRequest<ApplicationDraft>('/application-drafts',{...body({opportunityKey}),method:'POST'});
export const getApplicationDraft = (id:string) => apiRequest<ApplicationDraft>('/application-drafts/'+encodeURIComponent(id),{authenticated:true});
export const listApplicationDrafts = (page=1) => apiRequest<Page<ApplicationDraft>>('/application-drafts'+query({page,pageSize:20}),{authenticated:true});
export const saveApplicationDraft = (id:string,payload:{version:number;currentStep:number;data:ApplicationData;resumeId:number|null}) => apiRequest<ApplicationDraft>('/application-drafts/'+encodeURIComponent(id),{...body(payload),method:'PATCH'});
export const deleteApplicationDraft = (id:string) => apiRequest<void>('/application-drafts/'+encodeURIComponent(id),{authenticated:true,method:'DELETE'});
export const submitApplication = (draftId:string,version:number) => apiRequest<Application>('/applications',{...body({draftId,version}),method:'POST'});
export const listApplications = (filters:ApplicationFilters={},admin=false) => apiRequest<Page<Application>>((admin?'/admin':'')+'/applications'+query(filters),{authenticated:true});
export const getApplication = (id:number,admin=false) => apiRequest<Application>((admin?'/admin':'')+'/applications/'+id,{authenticated:true});
export const withdrawApplication = (id:number,version:number) => apiRequest<Application>('/applications/'+id+'/withdraw',{...body({version}),method:'PATCH'});
export const decideApplication = (id:number,version:number,status:Extract<ApplicationStatus,'IN_REVIEW'|'SELECTED'|'REJECTED'>,reason?:string) => apiRequest<Application>('/admin/applications/'+id+'/status',{...body({version,status,reason}),method:'PATCH'});
export const getApplicationStatistics = (filters:ApplicationFilters={}) => apiRequest<ApplicationStatistics>('/admin/applications/statistics'+query(filters),{authenticated:true});
export const downloadApplicationResume = (id:number,admin=false) => apiRequest<Blob>((admin?'/admin':'')+'/applications/'+id+'/resume/download',{authenticated:true,responseType:'blob'});
export const downloadDraftResume = (id:string) => apiRequest<Blob>('/application-drafts/'+encodeURIComponent(id)+'/resume/download',{authenticated:true,responseType:'blob'});
export const getNotifications = (page=1) => apiRequest<NotificationPage>('/notifications'+query({page,pageSize:20}),{authenticated:true});
export const markNotificationRead = (id:number) => apiRequest<void>('/notifications/'+id+'/read',{authenticated:true,method:'PATCH'});
export const markAllNotificationsRead = () => apiRequest<void>('/notifications/read-all',{authenticated:true,method:'PATCH'});
/** Blob URLs are short-lived; downloaded bytes always come from an authorized backend request. */
export const saveDownloadedResume = async (request:Promise<Blob>,name:string):Promise<void> => {const blob=await request;const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=name;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
