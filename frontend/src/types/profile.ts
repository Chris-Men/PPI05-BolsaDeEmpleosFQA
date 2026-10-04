/** Editable professional history; null end dates indicate ongoing entries. */
export interface WorkExperience {
  companyName: string; position: string; description: string | null;
  startDate: string; endDate: string | null;
}
/** Education dates match the API's YYYY-MM-DD contract. */
export interface Education {
  institution: string; degree: string; startDate: string; endDate: string | null;
}
/** Profile snapshot owned by the authenticated candidate. */
export interface CandidateProfileData {
  email: string; firstName: string; lastName: string; phone: string | null;
  department: string | null; municipality: string | null; profession: string | null;
  educationLevel: string | null; professionalSummary: string | null;
  workExperiences: WorkExperience[]; educations: Education[]; skills: string[];
}
/** The account email and document references cannot be edited through the profile. */
export type ProfileUpdate = Partial<Omit<CandidateProfileData, 'email'>>;
/** Safe document metadata, independent of the storage provider. */
export interface ResumeMetadata {
  id: number; originalName: string; mimeType: string; sizeBytes: number; createdAt: string;
}
