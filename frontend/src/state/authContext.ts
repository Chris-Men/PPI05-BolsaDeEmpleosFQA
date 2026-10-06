import { createContext } from 'react';
import type { SessionSnapshot } from '../services/sessionStore';

/** Context shared by the provider and the typed consumer hook. */
export const AuthContext = createContext<SessionSnapshot | null>(null);
