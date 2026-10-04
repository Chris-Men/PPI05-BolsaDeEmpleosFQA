import type { CandidateProfileData } from '../types/profile';
import type { PersonalFormData } from '../types/models';

/** Prefills a new application once; subsequent inputs stay local to that application. */
export const profileToPersonalForm = (profile: CandidateProfileData): PersonalFormData => ({
  name: profile.firstName, lastname: profile.lastName, email: profile.email, phone: profile.phone ?? '',
  municipio: profile.municipality ?? '', dept: profile.department ?? '', level: profile.educationLevel ?? '',
  profession: profile.profession ?? '',
});
