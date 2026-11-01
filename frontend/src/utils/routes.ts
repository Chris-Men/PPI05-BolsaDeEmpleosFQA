import { matchPath } from 'react-router';
import type { ScreenName } from '../types/models';
import type { AdminMenuName } from '../types/admin';
import type { CurrentAccess } from '../types/auth';
import type { OpportunityKind } from '../types/opportunity';

/** Stable public paths; credentials and editable form data never belong in routes. */
export const screenPaths = {
  home: '/', jobs: '/empleos', volunteers: '/voluntariado', students: '/estudiantes/horas-sociales',
  nosotros: '/nosotros', help: '/ayuda', collaborators: '/colaboradores', profile: '/perfil',
  login: '/login', register: '/registro', 'forgot-password': '/forgot-password', 'reset-password': '/reset-password',
} as const;

/** Menu labels remain presentation data; navigation uses canonical paths. */
export const adminPaths: Record<AdminMenuName, string> = {
  Dashboard: '/admin', 'Nueva Vacante': '/admin/vacantes/nueva', 'Administrar Vacantes': '/admin/vacantes',
  Postulaciones: '/admin/postulaciones', Organizaciones: '/admin/organizaciones', Categorías: '/admin/categorias',
  Estadísticas: '/admin/estadisticas', Usuarios: '/admin/usuarios', Configuración: '/admin/configuracion',
  Respaldos: '/admin/respaldos', Ayuda: '/admin/ayuda',
};

export const profilePaths = {
  overview: '/perfil', personal: '/perfil/datos-personales', applications: '/perfil/postulaciones',
  notifications: '/perfil/notificaciones', settings: '/perfil/configuracion',
} as const;
export type ProfileSection = keyof typeof profilePaths;

/** Role checks deliberately reject administrative accounts with an additional candidate role. */
export const isCandidate = (session: Pick<CurrentAccess, 'roles'> | null): boolean =>
  Boolean(session?.roles.length && session.roles.every(role => role === 'CANDIDATE'));
export const isAdministrator = (session: Pick<CurrentAccess, 'roles'> | null): boolean =>
  Boolean(session?.roles.some(role => role === 'ADMINISTRATOR' || role === 'SUPER_ADMIN'));
export const validOpportunityKey = (key: string): boolean => /^(job|volunteer)-[1-9]\d*$/.test(key) && Number(key.split('-')[1]) <= 2147483647;
export const validRouteId = (id: string): boolean => /^[1-9]\d*$/.test(id) && Number(id) <= 2147483647;

/** A safe return target can only address this application's own routes. */
export const safeReturnTo = (value: string | null): string | null => {
  if (!value?.startsWith('/') || value.startsWith('//') || value.includes('\\') || Array.from(value).some(character => character.charCodeAt(0) <= 32)) return null;
  const url = new URL(value, 'https://fqa.example');
  return url.origin === 'https://fqa.example' && !['/login', '/registro'].includes(url.pathname) ? url.pathname + url.search : null;
};

/** All four kinds keep their existing public listing and detail presentation. */
export const opportunityPath = (kind: OpportunityKind, key?: string): string => {
  const base = kind === 'VOLUNTEER' ? '/voluntariado' : kind === 'SOCIAL_HOURS' ? '/estudiantes/horas-sociales'
    : kind === 'INTERNSHIP' ? '/estudiantes/practicas' : '/empleos';
  return key ? base + '/' + encodeURIComponent(key) : base;
};

export interface AppRoute {
  screen: ScreenName;
  parent: string;
  adminMenu?: AdminMenuName;
  profileSection?: ProfileSection;
  opportunityKey?: string;
  applicationId?: number;
  organizationId?: number;
  kind?: OpportunityKind;
  editing?: boolean;
  requiresAccount?: boolean;
  candidateOnly?: boolean;
}
interface RouteDefinition { path: string; route: AppRoute }
const route = (path: string, screen: ScreenName, extra: Partial<AppRoute> = {}): RouteDefinition =>
  ({ path, route: { screen, parent: '/', ...extra } });

/** This table is shared by the real browser router and pure matching tests. */
export const routeDefinitions: RouteDefinition[] = [
  ...Object.entries(screenPaths).filter(([name]) => !['students', 'profile', 'jobs', 'volunteers'].includes(name)).map(([name, path]) => route(path, name as ScreenName)),
  ...(['EMPLOYMENT', 'VOLUNTEER', 'SOCIAL_HOURS', 'INTERNSHIP'] as const).flatMap(kind => {
    const base = opportunityPath(kind);
    const screen = kind === 'EMPLOYMENT' ? 'jobs' : kind === 'VOLUNTEER' ? 'volunteers' : 'students';
    return [route(base, screen, { kind }), route(base + '/:opportunityKey', kind === 'EMPLOYMENT' ? 'detail' : screen, { parent: base, kind })];
  }),
  ...Object.entries(profilePaths).map(([section, path]) => route(path, 'profile', {
    profileSection: section as ProfileSection, requiresAccount: true, candidateOnly: !['overview', 'settings'].includes(section),
  })),
  route('/perfil/postulaciones/:applicationId', 'profile', { parent: profilePaths.applications, profileSection: 'applications', requiresAccount: true, candidateOnly: true }),
  route('/perfil/notificaciones/postulaciones/:applicationId', 'profile', { parent: profilePaths.notifications, profileSection: 'notifications', requiresAccount: true, candidateOnly: true }),
  route('/postular/:opportunityKey', 'form', { parent: profilePaths.applications, requiresAccount: true, candidateOnly: true }),
  route('/postulaciones/:applicationId/confirmacion', 'confirm', { parent: profilePaths.applications, requiresAccount: true, candidateOnly: true }),
  ...Object.entries(adminPaths).map(([menu, path]) => route(path, 'home', { parent: '/admin', adminMenu: menu as AdminMenuName, requiresAccount: true })),
  route('/admin/vacantes/:opportunityKey', 'home', { parent: adminPaths['Administrar Vacantes'], adminMenu: 'Administrar Vacantes', requiresAccount: true }),
  route('/admin/vacantes/:opportunityKey/editar', 'home', { parent: adminPaths['Administrar Vacantes'], adminMenu: 'Administrar Vacantes', requiresAccount: true, editing: true }),
  route('/admin/postulaciones/:applicationId', 'home', { parent: adminPaths.Postulaciones, adminMenu: 'Postulaciones', requiresAccount: true }),
  route('/admin/organizaciones/:organizationId', 'home', { parent: adminPaths.Organizaciones, adminMenu: 'Organizaciones', requiresAccount: true }),
];

/** Invalid identifiers are never sent to the API or interpreted as another view. */
export function resolveRoute(pathname: string): AppRoute {
  for (const definition of routeDefinitions) {
    const matched = matchPath({ path: definition.path, end: true }, pathname);
    if (!matched) continue;
    const { opportunityKey, applicationId, organizationId } = matched.params;
    if (opportunityKey && !validOpportunityKey(opportunityKey) || applicationId && !validRouteId(applicationId) || organizationId && !validRouteId(organizationId)) break;
    return { ...definition.route, ...(opportunityKey ? { opportunityKey } : {}),
      ...(applicationId ? { applicationId: Number(applicationId) } : {}), ...(organizationId ? { organizationId: Number(organizationId) } : {}) };
  }
  return { screen: 'not-found', parent: '/' };
}

/** Legacy bookmarks retain their intent, but navigation itself belongs to the router. */
export function legacyDestination(pathname: string, search: string): string | null {
  if (pathname === '/estudiantes') return '/estudiantes/horas-sociales' + search;
  if (!['/', '/login', '/registro'].includes(pathname)) return null;
  const query = new URLSearchParams(search);
  const saved = query.get('guardar'); const application = query.get('postular'); const id = query.get('postulacion');
  if (saved && validOpportunityKey(saved) && pathname === '/') return '/perfil?guardar=' + encodeURIComponent(saved);
  if (application && validOpportunityKey(application)) {
    const target = '/postular/' + encodeURIComponent(application);
    return pathname === '/' ? target : pathname + '?returnTo=' + encodeURIComponent(target);
  }
  if (id && validRouteId(id)) {
    const target = '/perfil/postulaciones/' + id;
    return pathname === '/' ? target : pathname + '?returnTo=' + encodeURIComponent(target);
  }
  return null;
}

/** Successful authentication consumes only an internal, role-compatible return route. */
export function authenticationDestination(search: string, session: Pick<CurrentAccess, 'roles'> | null): string {
  const query = new URLSearchParams(search); const saved = query.get('guardar');
  if (saved && validOpportunityKey(saved) && isCandidate(session)) return '/perfil?guardar=' + encodeURIComponent(saved);
  const target = safeReturnTo(query.get('returnTo'));
  if (target && !(resolveRoute(new URL(target, 'https://fqa.example').pathname).candidateOnly && !isCandidate(session))) return target;
  return isAdministrator(session) ? '/admin' : '/';
}
