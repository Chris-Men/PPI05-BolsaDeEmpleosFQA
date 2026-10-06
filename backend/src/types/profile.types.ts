import type { UpdateProfileDTO } from '../validation/profile.schema.js';

/** Safe resume metadata; storage keys and absolute paths are never exposed. */
export interface ResumeMetadata {
  id: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

/** Candidate-owned profile data, including relational professional history. */
export interface CandidateProfile extends Required<Omit<UpdateProfileDTO, 'workExperiences' | 'educations'>> {
  email: string;
  workExperiences: NonNullable<UpdateProfileDTO['workExperiences']>;
  educations: NonNullable<UpdateProfileDTO['educations']>;
}
