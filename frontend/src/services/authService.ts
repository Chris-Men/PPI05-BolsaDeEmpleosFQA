import { apiRequest } from './api';

/** Payload accepted by the public candidate registration endpoint. */
export interface RegisterCandidateRequest {
  fullName: string;
  email: string;
  password: string;
}

/** Public account information returned after candidate registration. */
export interface RegisteredUser {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

/** Response returned after a candidate account is created. */
export interface RegistrationResponse {
  user: RegisteredUser;
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

/** Registers a candidate without accepting role or privilege fields. */
export const registerCandidate = (
  payload: RegisterCandidateRequest,
): Promise<RegistrationResponse> =>
  apiRequest<RegistrationResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
