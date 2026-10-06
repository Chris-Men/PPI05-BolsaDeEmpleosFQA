import { useCallback, useEffect, useRef, useState } from 'react';
import { getProfile, getResume, updateProfile, uploadResume, deleteResume } from '../services/profileService';
import { sessionStore } from '../services/sessionStore';
import type { CandidateProfileData, ProfileUpdate, ResumeMetadata } from '../types/profile';

/** Shared account-scoped state for the profile editor and application document step. */
export interface CandidateProfileState {
  profile: CandidateProfileData | null; resume: ResumeMetadata | null;
  loading: boolean; resumeLoading: boolean; busy: boolean;
  error: string; resumeError: string;
  reload: () => Promise<void>; reloadResume: () => Promise<void>;
  save: (payload: ProfileUpdate) => Promise<void>;
  upload: (file: File) => Promise<void>; remove: () => Promise<void>;
}

/** One instance lives in the account-keyed application shell; late responses cannot leak across accounts. */
export function useCandidateProfile(enabled: boolean): CandidateProfileState {
  const [profile, setProfile] = useState<CandidateProfileData | null>(null);
  const [resume, setResume] = useState<ResumeMetadata | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [resumeLoading, setResumeLoading] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resumeError, setResumeError] = useState('');
  const mounted = useRef(true);
  const mutation = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  /** Loads independent profile data so unavailable storage does not block editing. */
  const reload = useCallback(async (): Promise<void> => {
    if (!enabled) return;
    setLoading(true); setError('');
    try { const result = await getProfile(); if (mounted.current) setProfile(result); }
    catch (failure: unknown) { if (mounted.current) setError(failure instanceof Error ? failure.message : 'No fue posible cargar tu perfil.'); }
    finally { if (mounted.current) setLoading(false); }
  }, [enabled]);
  /** Metadata can be retried independently of professional profile information. */
  const reloadResume = useCallback(async (): Promise<void> => {
    if (!enabled) return;
    setResumeLoading(true); setResumeError('');
    try { const result = await getResume(); if (mounted.current) setResume(result); }
    catch (failure: unknown) { if (mounted.current) setResumeError(failure instanceof Error ? failure.message : 'No fue posible cargar tu CV.'); }
    finally { if (mounted.current) setResumeLoading(false); }
  }, [enabled]);
  useEffect(() => { void reload(); void reloadResume(); }, [reload, reloadResume]);

  /** Serializes user mutations, preserving existing data until a successful response. */
  const mutate = async (operation: () => Promise<void>): Promise<void> => {
    if (mutation.current) throw new Error('Espera a que termine la operación actual.');
    mutation.current = true; setBusy(true);
    try { await operation(); }
    finally { mutation.current = false; if (mounted.current) setBusy(false); }
  };
  return { profile, resume, loading, resumeLoading, busy, error, resumeError, reload, reloadResume,
    save: (payload) => mutate(async () => {
      const result = await updateProfile(payload);
      if (mounted.current) { setProfile(result); sessionStore.updateCandidateName(result.firstName, result.lastName); }
    }),
    upload: (file) => mutate(async () => { const result = await uploadResume(file); if (mounted.current) { setResume(result); setResumeError(''); } }),
    remove: () => mutate(async () => { await deleteResume(); if (mounted.current) { setResume(null); setResumeError(''); } }),
  };
}
