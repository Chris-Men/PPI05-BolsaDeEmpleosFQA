import { apiRequest } from './api';
import type { AuthenticationResponse, CurrentAccess, LoginRequest, RegisterCandidateRequest } from '../types/auth';

/** Registers a candidate; the refresh credential is handled only by the browser. */
export const registerCandidate = (payload: RegisterCandidateRequest): Promise<AuthenticationResponse> =>
  apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) });

/** Authenticates without storing passwords or tokens in Web Storage. */
export const loginAccount = (payload: LoginRequest): Promise<AuthenticationResponse> =>
  apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(payload) });

/** Refreshes the HttpOnly session credential. */
export const refreshAccount = (): Promise<AuthenticationResponse> =>
  apiRequest('/auth/refresh', { method: 'POST' });

/** Loads the current server-side identity and permissions. */
export const getCurrentAccess = (): Promise<CurrentAccess> =>
  apiRequest('/auth/me', { authenticated: true });

/** Revokes the current browser session or all account sessions. */
export const logoutAccount = (all: boolean): Promise<void> =>
  apiRequest(all ? '/auth/logout-all' : '/auth/logout', { method: 'POST', authenticated: all, retryAuthentication: false });

/** Deletes the authenticated account under the session lock without recursive token renewal. */
export const deleteOwnAccount = (): Promise<void> =>
  apiRequest('/auth/me', { method: 'DELETE', authenticated: true, retryAuthentication: false,
    body: JSON.stringify({ confirmDeletion: true }) });
