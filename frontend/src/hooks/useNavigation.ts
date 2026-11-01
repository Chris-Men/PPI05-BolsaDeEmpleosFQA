import { useContext, useEffect, useId, useRef } from 'react';
import { NavigationContext, type NavigationGuard } from '../state/navigationContext';

/** All screen, filter and modal navigation shares one browser-history coordinator. */
export function useNavigation() {
  const value = useContext(NavigationContext);
  if (!value) throw new Error('La navegación requiere su proveedor.');
  return value;
}

/** Also protects local dialog closure, which does not create its own browser route. */
export function useUnsavedChanges(dirty: boolean, busy = false, flush?: () => Promise<unknown>) {
  const navigation = useNavigation(); const id = useId();
  const current = useRef<NavigationGuard>({ dirty, busy, flush });
  current.current = { dirty, busy, flush };
  const { register, clear, leave } = navigation;
  useEffect(() => { register(id, current.current); }, [register, id, dirty, busy, flush]);
  useEffect(() => () => register(id, null), [register, id]);
  return { commit: () => clear(id), leave: (callback: () => void) => leave(id, callback) };
}
