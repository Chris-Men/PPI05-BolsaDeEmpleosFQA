import { apiRequest } from './api';
import type { CandidateProfileData, ProfileUpdate, ResumeMetadata } from '../types/profile';

/** Loads the authenticated candidate's persistent profile. */
export const getProfile = (signal?: AbortSignal): Promise<CandidateProfileData> =>
  apiRequest('/profile/me', { authenticated: true, signal });
/** Updates only explicitly submitted fields and collections. */
export const updateProfile = (payload: ProfileUpdate): Promise<CandidateProfileData> =>
  apiRequest('/profile/me', { authenticated: true, method: 'PATCH', body: JSON.stringify(payload) });
/** Loads the active document without exposing storage paths. */
export const getResume = (): Promise<ResumeMetadata | null> => apiRequest('/profile/me/resume', { authenticated: true });
/** The browser sets the multipart boundary and the backend validates bytes. */
export const uploadResume = (file: File): Promise<ResumeMetadata> => {
  const body = new FormData(); body.append('file', file);
  return apiRequest('/profile/me/resume', { authenticated: true, method: 'PUT', body });
};
/** Detaches the active CV while preserving application history on the server. */
export const deleteResume = (): Promise<void> => apiRequest('/profile/me/resume', { authenticated: true, method: 'DELETE' });
/** Downloads via authenticated HTTP rather than a public storage URL. */
export const downloadResume = (): Promise<Blob> => apiRequest('/profile/me/resume/download', { authenticated: true, responseType: 'blob' });
