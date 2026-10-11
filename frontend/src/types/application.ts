import type { Opportunity, OpportunityKind, Page } from './opportunity';
import type { CandidateProfileData, ResumeMetadata } from './profile';
/** State codes match the backend catalog; legacy states are read-only. */
export type ApplicationStatus = 'PENDING'|'IN_REVIEW'|'SELECTED'|'REJECTED'|'WITHDRAWN'|'UNKNOWN';
export const APPLICATION_LABELS: Record<ApplicationStatus,string> = { PENDING:'Pendiente', IN_REVIEW:'En revisión', SELECTED:'Seleccionada', REJECTED:'Rechazada', WITHDRAWN:'Retirada', UNKNOWN:'Estado histórico' };
/** Only application-specific editable fields are sent to draft updates. */
export interface ApplicationData {
  personal: { firstName:string;lastName:string;phone:string;department:string;municipality:string;profession:string;educationLevel:string };
  experience: { lastRole:string;lastOrg:string;skills:string;motivation:string };
}
export interface ApplicationHistory { id:number; oldStatus:ApplicationStatus|null; status:ApplicationStatus;reason:string|null;createdAt:string|null;changedBy:number }
export interface Application {
  id:number;userId:number;referenceNumber:string;attemptNumber:number;version:number;opportunityKey:string;opportunity:Opportunity;
  data:ApplicationData|null;professionalProfile:CandidateProfileData|null;candidateName:string;candidateEmail:string;status:ApplicationStatus;
  statusLabel:string;resume:ResumeMetadata|null;createdAt:string|null;legacy:boolean;history:ApplicationHistory[];
}
export interface ApplicationDraft {
  id:string;opportunityKey:string;opportunity:Opportunity;data:ApplicationData;professionalProfile:CandidateProfileData|null;
  currentStep:number;version:number;resume:ResumeMetadata|null;updatedAt:string;
}
export interface ApplicationFilters { page?:number;pageSize?:number;kind?:OpportunityKind;status?:Exclude<ApplicationStatus,'UNKNOWN'>;opportunityKey?:string;search?:string;organizationId?:number;candidateId?:number;from?:string;to?:string }
export interface ApplicationStatistics { total:number;candidates:number;withResume:number;states:Array<{status:ApplicationStatus;count:number}> }
export interface CandidateNotification { id:number;applicationId:number|null;title:string;message:string;readAt:string|null;createdAt:string|null }
export interface NotificationPage extends Page<CandidateNotification> { unreadCount:number }
/** Blank draft shape is replaced by server prefill before editing begins. */
export const emptyApplicationData = (): ApplicationData => ({ personal:{firstName:'',lastName:'',phone:'',department:'',municipality:'',profession:'',educationLevel:''}, experience:{lastRole:'',lastOrg:'',skills:'',motivation:''} });
