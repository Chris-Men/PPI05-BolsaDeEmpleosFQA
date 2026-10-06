/** Public account information returned after registration, without credentials. */
export interface RegisteredUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

/** Registration result containing the account and its initial access token. */
export interface RegistrationResponse {
  user: RegisteredUser;
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}
