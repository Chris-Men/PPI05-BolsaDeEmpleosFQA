import { useContext } from 'react';
import { AuthContext } from '../state/authContext';
import { sessionStore } from '../services/sessionStore';

/** Provides current identity and lifecycle actions to authenticated screens. */
export function useAuth() {
  const state = useContext(AuthContext);
  if (!state) throw new Error('El proveedor de sesión no está disponible.');
  return { ...state, login: sessionStore.login, register: sessionStore.register,
    logout: sessionStore.logout, retry: sessionStore.retry };
}
