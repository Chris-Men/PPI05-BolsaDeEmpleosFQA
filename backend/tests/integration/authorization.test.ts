import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import bcrypt from 'bcrypt';
import express from 'express';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import {
  PERMISSIONS, ROLE_NAMES, ROLE_PERMISSIONS, type PermissionCode, type RoleCode,
} from '../../src/constants/authorization.constants.js';
import { authenticate, requirePermission } from '../../src/middleware/authorization.middleware.js';
import { errorHandler } from '../../src/middleware/error.middleware.js';
import { debugRouter } from '../../src/routes/debug.routes.js';
import { seedAccountCatalogs } from '../../src/services/catalog.service.js';
import { tokenService } from '../../src/services/token.service.js';
import type { AccessContext } from '../../src/types/authorization.types.js';
import { startTestServer, stopTestServer, type TestServer } from '../helpers/http.js';

const runId = randomUUID();
const createdUsers: number[] = [];
const createdOrganizations: number[] = [];
const createdOrganizationStatuses: number[] = [];
const createdUserStatuses: number[] = [];
const createdRoles: number[] = [];

/** Test account metadata; tokens remain in memory and never appear in output. */
interface Identity { id: number; token: string; sessionId?: string }
const identities = new Map<RoleCode, Identity>();
let passwordHash: string;

/** Creates only isolated test accounts using the seeded role labels. */
const createIdentity = async (roleNames: string[]): Promise<Identity> => {
  const user = await prisma.user.create({
    data: {
      email: `${runId}-${randomUUID()}@example.test`,
      passwordHash,
      status: { connect: { name: 'Activo' } },
      userRoles: { create: roleNames.map((name) => ({ roles: { connect: { name } } })) },
    },
    select: { id: true },
  });
  createdUsers.push(user.id);
  const session = await prisma.authSession.create({ data: { userId: user.id, expiresAt: new Date(Date.now() + 3600000) } });
  return { id: user.id, sessionId: session.id, token: tokenService.createAccessToken(String(user.id), 'UNTRUSTED_CLAIM', session.id) };
};

/** Requires a fixture prepared by this suite. */
const identityFor = (role: RoleCode): Identity => {
  const identity = identities.get(role);
  assert.ok(identity);
  return identity;
};

describe('Autorización HTTP con permisos reales en PostgreSQL', () => {
  let api: TestServer;
  let policyApi: TestServer;
  let connected = false;

  before(async () => {
    assert.equal(process.env.NODE_ENV, 'test');
    assert.ok(process.env.TEST_DATABASE_URL);
    assert.equal(process.env.DATABASE_URL, process.env.TEST_DATABASE_URL);
    await prisma.$connect();
    connected = true;
    passwordHash = await bcrypt.hash('Clave exclusiva de las pruebas 2026', 12);
    for (const code of Object.keys(ROLE_NAMES) as RoleCode[]) {
      identities.set(code, await createIdentity([ROLE_NAMES[code]]));
    }
    api = await startTestServer(createApp());
    // Test-only handlers exercise the actual guards without implementing future modules.
    const policyApp = express();
    for (const permission of Object.values(PERMISSIONS)) {
      policyApp.get(`/permission/${permission}`, authenticate, requirePermission(permission),
        (_request, response) => { response.sendStatus(204); });
    }
    policyApp.get('/missing-authentication', requirePermission(PERMISSIONS.CANDIDATE_CREATE),
      (_request, response) => { response.sendStatus(204); });
    policyApp.use('/debug', debugRouter);
    policyApp.use(errorHandler);
    policyApi = await startTestServer(policyApp);
  });

  after(async () => {
    try {
      if (api) await stopTestServer(api.server);
      if (policyApi) await stopTestServer(policyApi.server);
      if (connected) {
        // Cleanup is limited to fixture identifiers, never resets or shared user deletes.
        await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
        await prisma.organizations.deleteMany({ where: { id: { in: createdOrganizations } } });
        await prisma.organizationStatuses.deleteMany({ where: { id: { in: createdOrganizationStatuses } } });
        await prisma.userStatus.deleteMany({ where: { id: { in: createdUserStatuses } } });
        await prisma.role.deleteMany({ where: { id: { in: createdRoles } } });
        await seedAccountCatalogs(prisma);
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  /** Issues authenticated requests without printing bearer credentials on failures. */
  const requestAs = (baseUrl: string, path: string, identity: Identity): Promise<Response> =>
    fetch(baseUrl + path, { headers: { Authorization: `Bearer ${identity.token}` } });

  /** Exercises a granular operation against the real middleware and database. */
  const checkPermission = (identity: Identity, permission: PermissionCode): Promise<Response> =>
    requestAs(policyApi.baseUrl, `/permission/${permission}`, identity);

  it('persiste tres roles y veintinueve permisos sin cambiar IDs al repetir el seed', async () => {
    const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
    const permissions = await prisma.permissions.findMany({ orderBy: { name: 'asc' } });
    const grants = await prisma.rolePermissions.findMany({ orderBy: [{ roleId: 'asc' }, { permissionId: 'asc' }] });
    assert.deepEqual(roles.map(({ name }) => name), ['Administrador', 'Candidato', 'Super Admin']);
    assert.equal(permissions.length, 29);
    assert.equal(grants.length, 44);
    await seedAccountCatalogs(prisma);
    await seedAccountCatalogs(prisma);
    assert.deepEqual(await prisma.role.findMany({ orderBy: { name: 'asc' } }), roles);
    assert.deepEqual(await prisma.permissions.findMany({ orderBy: { name: 'asc' } }), permissions);
    assert.deepEqual(await prisma.rolePermissions.findMany({
      orderBy: [{ roleId: 'asc' }, { permissionId: 'asc' }],
    }), grants);
  });

  it('retira el rol Organización y sus asignaciones sin eliminar usuarios ni organizaciones', async () => {
    const role = await prisma.role.create({ data: { name: 'Organización' } });
    createdRoles.push(role.id);
    const identity = await createIdentity([role.name]);
    const status = await prisma.organizationStatuses.create({ data: { name: runId } });
    createdOrganizationStatuses.push(status.id);
    const organization = await prisma.organizations.create({
      data: { name: runId, statusId: status.id },
    });
    createdOrganizations.push(organization.id);
    await seedAccountCatalogs(prisma);
    assert.equal(await prisma.role.findUnique({ where: { id: role.id } }), null);
    assert.equal(await prisma.userRoles.count({ where: { userId: identity.id } }), 0);
    assert.ok(await prisma.user.findUnique({ where: { id: identity.id } }));
    assert.ok(await prisma.organizations.findUnique({ where: { id: organization.id } }));
    assert.equal((await checkPermission(identity, PERMISSIONS.OPPORTUNITY_CREATE)).status, 403);
  });

  it('rechaza visitantes y protege incluso rutas con middleware de autenticación omitido', async () => {
    const headerVariants: Record<string, string>[] = [
      {}, { Authorization: 'Bearer invalid' }, { Authorization: 'Basic invalid' },
    ];
    for (const headers of headerVariants) {
      const response = await fetch(api.baseUrl + '/api/auth/me', { headers });
      assert.equal(response.status, 401);
    }
    assert.equal((await fetch(policyApi.baseUrl + '/missing-authentication')).status, 401);
    assert.equal((await fetch(policyApi.baseUrl + '/debug/users')).status, 401);
  });

  it('devuelve permisos propios actuales e ignora un claim JWT que dice Super Admin', async () => {
    const candidate = identityFor('CANDIDATE');
    const forgedRole = {
      id: candidate.id, token: tokenService.createAccessToken(String(candidate.id), 'SUPER_ADMIN', candidate.sessionId!),
    };
    const response = await requestAs(api.baseUrl, '/api/auth/me', forgedRole);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json() as AccessContext;
    assert.deepEqual(Object.keys(body).sort(), ['permissions', 'roles', 'sessionExpiresAt', 'user', 'userId']);
    assert.equal(body.userId, candidate.id);
    assert.deepEqual(body.roles, ['CANDIDATE']);
    assert.deepEqual(body.permissions, [...ROLE_PERMISSIONS.CANDIDATE].sort());
    assert.equal((await checkPermission(forgedRole, PERMISSIONS.DATABASE_RESTORE)).status, 403);
  });

  it('aplica la matriz completa a los tres roles a través de HTTP', async () => {
    const expected: Record<RoleCode, readonly PermissionCode[]> = {
      CANDIDATE: [
        'accounts.delete.own',
        'profiles.read.own', 'profiles.update.own', 'profiles.resume.upload.own',
        'applications.create.own', 'applications.read.own', 'applications.resume.upload.own',
      ],
      ADMINISTRATOR: [
        'accounts.delete.own', 'candidates.status.update', 'candidates.delete',
        'candidates.create', 'candidates.read', 'profiles.resume.read.any',
        'applications.resume.read.any', 'opportunities.create', 'applications.read.any',
        'applications.select', 'organizations.create', 'organizations.read', 'organizations.update', 'organizations.status.update',
      ],
      SUPER_ADMIN: [
        'accounts.delete.own', 'candidates.status.update', 'candidates.delete', 'users.status.update', 'users.restore',
        'candidates.create', 'candidates.read', 'profiles.resume.read.any',
        'applications.resume.read.any', 'opportunities.create', 'applications.read.any',
        'applications.select', 'organizations.create', 'organizations.read', 'organizations.update', 'organizations.status.update', 'administrators.create',
        'administrators.delete', 'database.backup', 'database.restore', 'sessions.revoke.any', 'users.read', 'users.update',
      ],
    };
    for (const role of Object.keys(expected) as RoleCode[]) {
      for (const permission of Object.values(PERMISSIONS)) {
        const response = await checkPermission(identityFor(role), permission);
        assert.equal(response.status, expected[role].includes(permission) ? 204 : 403,
          `${role}: ${permission}`);
      }
    }
    assert.equal((await requestAs(policyApi.baseUrl, '/debug/users', identityFor('ADMINISTRATOR'))).status, 403);
    assert.equal((await requestAs(policyApi.baseUrl, '/debug/users', identityFor('SUPER_ADMIN'))).status, 200);
  });

  it('la revocación de un permiso tiene efecto sin renovar el token', async () => {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: 'Candidato' } });
    const permission = await prisma.permissions.findUniqueOrThrow({
      where: { name: PERMISSIONS.PROFILE_UPDATE_OWN },
    });
    try {
      await prisma.rolePermissions.delete({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      });
      assert.equal((await checkPermission(identityFor('CANDIDATE'), PERMISSIONS.PROFILE_UPDATE_OWN)).status, 403);
    } finally {
      await seedAccountCatalogs(prisma);
    }
    assert.equal((await checkPermission(identityFor('CANDIDATE'), PERMISSIONS.PROFILE_UPDATE_OWN)).status, 204);
  });

  it('revoca roles inmediatamente y combina los permisos de asignaciones múltiples', async () => {
    const identity = await createIdentity(['Candidato', 'Administrador']);
    assert.equal((await checkPermission(identity, PERMISSIONS.PROFILE_UPDATE_OWN)).status, 204);
    assert.equal((await checkPermission(identity, PERMISSIONS.CANDIDATE_CREATE)).status, 204);
    await prisma.userRoles.deleteMany({ where: { userId: identity.id, roles: { name: 'Administrador' } } });
    assert.equal((await checkPermission(identity, PERMISSIONS.CANDIDATE_CREATE)).status, 403);
    assert.equal((await checkPermission(identity, PERMISSIONS.PROFILE_UPDATE_OWN)).status, 204);
  });

  it('deniega privilegios sensibles mal asignados y el seed elimina el grant indebido', async () => {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: 'Administrador' } });
    const permission = await prisma.permissions.findUniqueOrThrow({
      where: { name: PERMISSIONS.DATABASE_BACKUP },
    });
    try {
      await prisma.rolePermissions.create({ data: { roleId: role.id, permissionId: permission.id } });
      assert.equal((await checkPermission(identityFor('ADMINISTRATOR'), PERMISSIONS.DATABASE_BACKUP)).status, 403);
      const response = await requestAs(api.baseUrl, '/api/auth/me', identityFor('ADMINISTRATOR'));
      const access = await response.json() as AccessContext;
      assert.equal(access.permissions.includes(PERMISSIONS.DATABASE_BACKUP), false);
    } finally {
      await seedAccountCatalogs(prisma);
    }
    assert.equal(await prisma.rolePermissions.count({
      where: { roleId: role.id, permissionId: permission.id },
    }), 0);
  });

  it('ignora roles desconocidos aunque tengan permisos asociados', async () => {
    const role = await prisma.role.create({ data: { name: 'Prueba-' + runId } });
    createdRoles.push(role.id);
    const permission = await prisma.permissions.findUniqueOrThrow({ where: { name: PERMISSIONS.CANDIDATE_CREATE } });
    await prisma.rolePermissions.create({ data: { roleId: role.id, permissionId: permission.id } });
    const identity = await createIdentity([role.name]);
    assert.equal((await checkPermission(identity, PERMISSIONS.CANDIDATE_CREATE)).status, 403);
  });

  it('rechaza cuentas inactivas o eliminadas aunque el JWT no haya vencido', async () => {
    const identity = await createIdentity(['Administrador']);
    const status = await prisma.userStatus.create({ data: { name: 'Inactivo-' + runId } });
    createdUserStatuses.push(status.id);
    await prisma.user.update({ where: { id: identity.id }, data: { statusId: status.id } });
    assert.equal((await requestAs(api.baseUrl, '/api/auth/me', identity)).status, 401);
    await prisma.user.delete({ where: { id: identity.id } });
    assert.equal((await requestAs(api.baseUrl, '/api/auth/me', identity)).status, 401);
  });
});
