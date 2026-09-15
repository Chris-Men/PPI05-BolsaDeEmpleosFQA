import type { Dispatch, SetStateAction } from 'react';

/** Screens available from the public application navigation. */
export type ScreenName =
  | 'home'
  | 'jobs'
  | 'detail'
  | 'form'
  | 'confirm'
  | 'volunteers'
  | 'students'
  | 'nosotros'
  | 'profile'
  | 'login'
  | 'register';

/** Candidate information used by the local profile demo. */
export interface CurrentUser {
  email: string;
  role: 'candidate';
  name: string;
  initial: string;
}

/** Demonstration employment opportunity. */
export interface Job {
  id: number;
  title: string;
  org: string;
  location: string;
  area: string;
  type: string;
  salary: string;
  date: string;
  closing?: string;
  isFqa?: boolean;
  isNew?: boolean;
  isHot?: boolean;
  isUrgent?: boolean;
  views: number;
  compat: number;
  desc: string;
  responsibilities: string[];
  requirements: string[];
  offers: string[];
}

/** Demonstration volunteer opportunity. */
export interface VolunteerSpot {
  id: number;
  title: string;
  org: string;
  slots: number;
  location: string;
  area: string;
  desc: string;
  orgInfo: string;
  contact: string;
}

/** Category of a student opportunity. */
export type StudentOpportunityType = 'social' | 'practica';

/** Demonstration opportunity intended for students. */
export interface StudentSpot {
  id: number;
  tipo: StudentOpportunityType;
  title: string;
  org: string;
  location: string;
  area: string;
  desc: string;
  horas?: number;
  duracion?: string;
  contact: string;
}

/** Locally simulated application shown in candidate-facing screens. */
export interface CandidateApplication {
  id: string;
  jobId: number;
  jobTitle: string;
  orgName: string;
  candidateName: string;
  candidateEmail: string;
  phone: string;
  cvName: string;
  status: string;
  date: string;
}

/** Personal fields used by the demonstration application flow. */
export interface PersonalFormData {
  name: string;
  lastname: string;
  email: string;
  phone: string;
  municipio: string;
  dept: string;
  level: string;
  profession: string;
}

/** Experience fields used by the demonstration application flow. */
export interface ExperienceFormData {
  lastRole: string;
  lastOrg: string;
  years: string;
  salary: string;
  motivation: string;
  skills: string;
}

/** Target supported by the local application flow. */
export type ApplicationTarget = Job | VolunteerSpot | StudentSpot;

/** Contact details displayed after a volunteer or student application. */
export interface SuccessContact {
  title: string;
  org: string;
  contact: string;
}

/** Item selected for removal from the candidate profile. */
export interface RetireSelection {
  kind: 'job' | 'volunteer' | 'student';
  id: string | number;
  title: string;
}

/** Navigates between the screens managed by the application shell. */
export type NavigateTo = (screen: ScreenName, data?: Job | null) => void;

/** Reusable React state setter. */
export type StateSetter<T> = Dispatch<SetStateAction<T>>;
