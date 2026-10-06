/** Administrative sections preserved for the future authenticated area. */
export type AdminMenuName =
  | 'Dashboard'
  | 'Nueva Postulación'
  | 'Administrar Postulaciones'
  | 'CV Recibidos'
  | 'Organizaciones'
  | 'Categorías'
  | 'Estadísticas'
  | 'Usuarios'
  | 'Configuración';

/** Minimal administrator identity consumed by the preserved dashboard UI. */
export interface AdminIdentity {
  name: string;
  email: string;
  role: string;
  initial: string;
}
