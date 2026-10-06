/** Supported API role codes, shared by every authentication screen. */
export type RoleCode = 'CANDIDATE' | 'ADMINISTRATOR' | 'SUPER_ADMIN';

/** Public account data; credentials never belong in frontend state. */
export interface AuthUser {
  id: number; fullName: string; email: string; role: string; status: string; createdAt: string;
}

/** Current permissions are resolved by the backend, not JWT claims. */
export interface CurrentAccess {
  userId: number; roles: RoleCode[]; permissions: string[];
  user: AuthUser; sessionExpiresAt: string;
}

/** Public login, registration and refresh contract. */
export interface AuthenticationResponse extends CurrentAccess {
  accessToken: string; tokenType: 'Bearer'; expiresIn: number;
}

/** Input for a public candidate account. */
export interface RegisterCandidateRequest { fullName: string; email: string; password: string }

/** Input for an existing account. */
export interface LoginRequest { email: string; password: string }
