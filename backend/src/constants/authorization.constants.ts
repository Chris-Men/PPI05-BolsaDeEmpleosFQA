/** Stable role codes used by the API; database labels remain in Spanish. */
export const ROLE_NAMES = {
  CANDIDATE: 'Candidato',
  ADMINISTRATOR: 'Administrador',
  SUPER_ADMIN: 'Super Admin',
} as const;

/** Supported account roles. Public registration always assigns CANDIDATE. */
export type RoleCode = keyof typeof ROLE_NAMES;

/** Granular operations; own-resource permissions also require an ownership check. */
export const PERMISSIONS = {
  PROFILE_READ_OWN: 'profiles.read.own',
  PROFILE_UPDATE_OWN: 'profiles.update.own',
  PROFILE_RESUME_UPLOAD_OWN: 'profiles.resume.upload.own',
  APPLICATION_CREATE_OWN: 'applications.create.own',
  APPLICATION_READ_OWN: 'applications.read.own',
  APPLICATION_RESUME_UPLOAD_OWN: 'applications.resume.upload.own',
  CANDIDATE_CREATE: 'candidates.create',
  CANDIDATE_READ: 'candidates.read',
  PROFILE_RESUME_READ_ANY: 'profiles.resume.read.any',
  APPLICATION_RESUME_READ_ANY: 'applications.resume.read.any',
  OPPORTUNITY_CREATE: 'opportunities.create',
  APPLICATION_READ_ANY: 'applications.read.any',
  APPLICATION_SELECT: 'applications.select',
  ORGANIZATION_CREATE: 'organizations.create',
  ADMINISTRATOR_CREATE: 'administrators.create',
  ADMINISTRATOR_DELETE: 'administrators.delete',
  SESSION_REVOKE_ANY: 'sessions.revoke.any',
  DATABASE_BACKUP: 'database.backup',
  DATABASE_RESTORE: 'database.restore',
} as const;

/** Permission names persisted in the permissions catalog. */
export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Administrative operations shared explicitly with Super Admin. */
const administratorPermissions: readonly PermissionCode[] = [
  PERMISSIONS.CANDIDATE_CREATE,
  PERMISSIONS.CANDIDATE_READ,
  PERMISSIONS.PROFILE_RESUME_READ_ANY,
  PERMISSIONS.APPLICATION_RESUME_READ_ANY,
  PERMISSIONS.OPPORTUNITY_CREATE,
  PERMISSIONS.APPLICATION_READ_ANY,
  PERMISSIONS.APPLICATION_SELECT,
  PERMISSIONS.ORGANIZATION_CREATE,
];

/** Operations reserved to Super Admin, even if another role is misconfigured. */
export const SUPER_ADMIN_PERMISSIONS: readonly PermissionCode[] = [
  PERMISSIONS.ADMINISTRATOR_CREATE,
  PERMISSIONS.ADMINISTRATOR_DELETE,
  PERMISSIONS.SESSION_REVOKE_ANY,
  PERMISSIONS.DATABASE_BACKUP,
  PERMISSIONS.DATABASE_RESTORE,
];

/** Canonical grants; organizations are records, not login roles. */
export const ROLE_PERMISSIONS: Readonly<Record<RoleCode, readonly PermissionCode[]>> = {
  CANDIDATE: [
    PERMISSIONS.PROFILE_READ_OWN,
    PERMISSIONS.PROFILE_UPDATE_OWN,
    PERMISSIONS.PROFILE_RESUME_UPLOAD_OWN,
    PERMISSIONS.APPLICATION_CREATE_OWN,
    PERMISSIONS.APPLICATION_READ_OWN,
    PERMISSIONS.APPLICATION_RESUME_UPLOAD_OWN,
  ],
  ADMINISTRATOR: administratorPermissions,
  SUPER_ADMIN: [...administratorPermissions, ...SUPER_ADMIN_PERMISSIONS],
};

/** Resolves a persisted role label without accepting arbitrary role strings. */
export const roleCodeFor = (name: string): RoleCode | undefined =>
  (Object.keys(ROLE_NAMES) as RoleCode[]).find((code) => ROLE_NAMES[code] === name);

/** Narrows database permission names to supported operations. */
export const isPermissionCode = (name: string): name is PermissionCode =>
  Object.values(PERMISSIONS).some((permission) => permission === name);
