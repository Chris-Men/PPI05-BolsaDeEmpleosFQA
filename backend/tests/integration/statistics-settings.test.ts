import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import bcrypt from 'bcrypt';
import { prisma } from '../../src/config/prisma.js';
import { env } from '../../src/config/env.js';
import { createApp } from '../../src/app.js';
import { ROLE_NAMES, ROLE_PERMISSIONS, PERMISSIONS, type RoleCode } from '../../src/constants/authorization.constants.js';
import { DEFAULT_SITE_SETTINGS, SITE_SETTINGS_KEY } from '../../src/constants/site-settings.constants.js';
import { ORGANIZATION_STATUS_NAMES } from '../../src/constants/organization.constants.js';
import { seedSiteSettings, writeSiteSettings } from '../../src/services/site-settings.service.js';
import { seedAccountCatalogs } from '../../src/services/catalog.service.js';
import type { getStatistics, getDashboardStatistics } from '../../src/services/statistics.service.js';
import type { StoredSiteSettings } from '../../src/validation/site-settings.schema.js';
import type { RegistrationResponse } from '../../src/types/auth.types.js';
import { startTestServer, stopTestServer, type TestServer } from '../helpers/http.js';

type Statistics = Awaited<ReturnType<typeof getStatistics>>;
type Dashboard = Awaited<ReturnType<typeof getDashboardStatistics>>;
interface Identity { id: number; token: string }
const runId = 'stats-settings-' + randomUUID();
const identities = new Map<RoleCode, Identity>();
let api: TestServer; let organizationId: number; let inactiveOrganizationId: number; let categoryId: number;
let previousSettings: Awaited<ReturnType<typeof prisma.systemSettings.findUnique>>;
let jobIds: number[] = []; const volunteerIds: number[] = []; let fileId: number;
let legacyStatusId: number; let baseline: Dashboard;
let secondCandidateId: number;
const period = '?from=2030-01-02&to=2030-01-02';

/** Tokens remain in memory; no identity or environment value is printed by assertions. */
const actor = (role: RoleCode = 'SUPER_ADMIN'): Identity => { const value = identities.get(role); assert.ok(value); return value; };
const request = (method: string, route: string, identity?: Identity, body?: unknown) => fetch(api.baseUrl + '/api' + route, {
  method, headers: { 'Content-Type': 'application/json', 'X-FQA-Request': '1', ...(identity ? { Authorization: 'Bearer ' + identity.token } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
});
/** Status assertions avoid dumping authenticated response objects. */
const json = async <T>(response: Response, status = 200): Promise<T> => { assert.equal(response.status, status); return await response.json() as T; };
const document = () => request('GET', '/admin/site-settings', actor()).then(response => json<StoredSiteSettings>(response));
const statistics = (query = period) => request('GET', '/admin/statistics' + query, actor()).then(response => json<Statistics>(response));

describe('estadísticas completas y configuración persistente', () => {
  before(async () => {
    assert.equal(env.NODE_ENV, 'test'); assert.ok(new URL(env.DATABASE_URL).pathname.endsWith('_test'));
    previousSettings = await prisma.systemSettings.findUnique({ where: { settingKey: SITE_SETTINGS_KEY } });
    await seedSiteSettings(prisma); api = await startTestServer(createApp());
    const password = 'Estadisticas de prueba 2026'; const passwordHash = await bcrypt.hash(password, 12);
    for (const role of Object.keys(ROLE_NAMES) as RoleCode[]) {
      const user = await prisma.user.create({ data: { email: runId + '-' + role.toLowerCase() + '@example.test', passwordHash, status: { connect: { name: 'Activo' } },
        profile: { create: { firstName: 'Prueba', lastName: role } }, userRoles: { create: { roles: { connect: { name: ROLE_NAMES[role] } } } } } });
      const auth = await json<RegistrationResponse>(await request('POST', '/auth/login', undefined, { email: user.email, password }));
      identities.set(role, { id: user.id, token: auth.accessToken });
    }
    secondCandidateId = (await prisma.user.create({ data: { email: runId + '-other@example.test', passwordHash, status: { connect: { name: 'Activo' } }, userRoles: { create: { roles: { connect: { name: ROLE_NAMES.CANDIDATE } } } } } })).id;
    baseline = await json<Dashboard>(await request('GET', '/admin/statistics/dashboard', actor()));
    organizationId = (await prisma.organizations.create({ data: { name: runId, organizationStatuses: { connect: { name: ORGANIZATION_STATUS_NAMES.ACTIVE } } } })).id;
    inactiveOrganizationId = (await prisma.organizations.create({ data: { name: runId + '-inactive', organizationStatuses: { connect: { name: ORGANIZATION_STATUS_NAMES.INACTIVE } } } })).id;
    categoryId = (await prisma.jobCategories.create({ data: { name: runId, slug: runId } })).id;
    const kinds = ['EMPLOYMENT', 'SOCIAL_HOURS', 'INTERNSHIP'] as const;
    const state = await prisma.jobStatuses.findUniqueOrThrow({ where: { name: 'Publicada' } });
    const rows = await prisma.jobs.createManyAndReturn({ data: Array.from({ length: 105 }, (_, index) => ({
      title: runId + '-' + index, slug: runId + '-' + index, description: 'Fixture de agregados.', kind: kinds[index % 3], statusId: state.id,
      organizationId, categoryId, publishedAt: new Date('2030-01-02T06:00:00Z'), createdAt: new Date(Date.UTC(2035, 0, index + 1)),
      ...(index === 0 ? { archivedAt: new Date() } : {}),
    })), select: { id: true } });
    jobIds = rows.map(row => row.id);
    const volunteerState = await prisma.volunteerStatuses.findUniqueOrThrow({ where: { name: 'Cerrada' } });
    const boundaries = ['2030-01-02T05:59:59.999Z', '2030-01-02T06:00:00Z', '2030-01-03T05:59:59.999Z', '2030-01-03T06:00:00Z'];
    for (let index = 0; index < boundaries.length; index++) {
      const row = await prisma.volunteerOpportunities.create({ data: { title: runId + '-vol-' + index, slug: runId + '-vol-' + index, description: 'Fixture voluntariado.',
        organizationId, categoryId, publishedAt: new Date(boundaries[index]!), createdAt: null, statusId: volunteerState.id } });
      volunteerIds.push(row.id);
    }
    fileId = (await prisma.files.create({ data: { userId: actor('CANDIDATE').id, fileType: 'RESUME', filePath: randomUUID() + '.pdf', originalName: 'fixture.pdf', mimeType: 'application/pdf', sizeBytes: 100 } })).id;
    const selected = await prisma.applicationStatuses.findUniqueOrThrow({ where: { name: 'Seleccionada' } });
    const withdrawn = await prisma.applicationStatuses.findUniqueOrThrow({ where: { name: 'Retirada' } });
    const pending = await prisma.applicationStatuses.findUniqueOrThrow({ where: { name: 'Pendiente' } });
    legacyStatusId = (await prisma.applicationStatuses.create({ data: { name: 'Legacy ' + randomUUID().slice(0, 12) } })).id;
    const primaryUser = actor('CANDIDATE').id;
    const registration = await prisma.volunteerRegistrations.create({ data: { userId: primaryUser, volunteerOpportunityId: volunteerIds[1]! } });
    const at = new Date('2030-01-02T12:00:00Z');
    await prisma.applications.create({ data: { jobId: jobIds.at(-1)!, userId: primaryUser, attemptNumber: 1, statusId: withdrawn.id, referenceNumber: randomUUID(), createdAt: at } });
    await prisma.applications.create({ data: { jobId: jobIds.at(-1)!, userId: primaryUser, attemptNumber: 2, statusId: selected.id, resumeId: fileId, referenceNumber: randomUUID(), createdAt: at } });
    await prisma.applications.create({ data: { jobId: jobIds.at(-1)!, userId: secondCandidateId, statusId: pending.id, referenceNumber: randomUUID(), createdAt: at } });
    const legacy = await prisma.applications.create({ data: { volunteerRegistrationId: registration.id, userId: primaryUser, statusId: legacyStatusId, referenceNumber: randomUUID(), createdAt: at } });
    await prisma.applicationFiles.create({ data: { applicationId: legacy.id, fileId } });
    for (const date of [boundaries[0]!, boundaries[3]!]) await prisma.applications.create({ data: { jobId: jobIds[1]!, userId: primaryUser, attemptNumber: date === boundaries[0] ? 1 : 2, statusId: pending.id, referenceNumber: randomUUID(), createdAt: new Date(date) } });
  });
  after(async () => {
    await seedAccountCatalogs(prisma);
    const ids = [...identities.values()].map(value => value.id).concat(secondCandidateId || []);
    await prisma.jobs.deleteMany({ where: { id: { in: jobIds } } });
    await prisma.volunteerOpportunities.deleteMany({ where: { id: { in: volunteerIds } } });
    await prisma.auditLogs.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.organizations.deleteMany({ where: { id: { in: [organizationId, inactiveOrganizationId].filter(Boolean) } } });
    if (categoryId) await prisma.jobCategories.delete({ where: { id: categoryId } });
    if (legacyStatusId) await prisma.applicationStatuses.delete({ where: { id: legacyStatusId } });
    if (previousSettings) await prisma.systemSettings.update({ where: { settingKey: SITE_SETTINGS_KEY }, data: { settingValue: previousSettings.settingValue, updatedAt: previousSettings.updatedAt } });
    else await prisma.systemSettings.deleteMany({ where: { settingKey: SITE_SETTINGS_KEY } });
    if (api) await stopTestServer(api.server); await prisma.$disconnect();
  });

  it('agrega más de 100 vacantes y respeta límites inclusivos del día salvadoreño', async () => {
    const result = await statistics(); assert.equal(result.publishedOpportunities, 107);
    assert.deepEqual(result.byKind.map(item => [item.kind, item.count]), [['EMPLOYMENT',35],['VOLUNTEER',2],['SOCIAL_HOURS',35],['INTERNSHIP',35]]);
    assert.equal(result.organizations, baseline.organizations + 2); assert.equal(result.applications, 4); assert.equal(result.applicants, 2);
    assert.equal(result.selectionRate, 25); assert.equal(result.applicationsPerOpportunity, 2);
    assert.equal(result.states.find(item => item.status === 'UNKNOWN')?.count, 1);
    assert.equal(result.states.find(item => item.status === 'WITHDRAWN')?.count, 1);
    assert.equal(result.range.timeZone, 'America/El_Salvador');
  });
  it('el dashboard incluye archivadas, CV históricos y candidatos distintos por vacante', async () => {
    const result = await json<Dashboard>(await request('GET', '/admin/statistics/dashboard', actor()));
    assert.equal(result.opportunities, baseline.opportunities + 109); assert.equal(result.organizations, baseline.organizations + 2);
    assert.equal(result.applications, baseline.applications + 6); assert.equal(result.withResume, baseline.withResume + 2);
    assert.equal(result.applicants, baseline.applicants + 2); assert.equal(result.recentOpportunities.length, 10);
    assert.equal(new Set(result.recentOpportunities.map(item => item.key)).size, 10);
    assert.equal(result.recentOpportunities.find(item => item.key === 'job-' + jobIds.at(-1))?.candidates, 2);
    assert.ok(result.recentOpportunities.every(item => !('userId' in item) && !('email' in item)));
  });
  it('rangos vacíos mantienen organizaciones acumuladas y las consultas inválidas no se aceptan', async () => {
    const result = await statistics('?from=2099-01-01&to=2099-01-02');
    assert.equal(result.applications, 0); assert.equal(result.publishedOpportunities, 0); assert.equal(result.selectionRate, 0); assert.equal(result.applicationsPerOpportunity, 0);
    assert.equal(result.organizations, baseline.organizations + 2);
    for (const query of ['', '?from=2023-02-29&to=2024-01-01', '?from=2026-02-01&to=2026-01-01', period + '&userId=1']) assert.equal((await request('GET', '/admin/statistics' + query, actor())).status, 400);
    assert.equal((await request('GET', '/admin/statistics/dashboard?from=2026-01-01', actor())).status, 400);
  });
  it('guarda el contenido completo y su auditoría, y el seed conserva las personalizaciones', async () => {
    const before = await document(); const configuration = structuredClone(DEFAULT_SITE_SETTINGS); configuration.inicio.titulo = 'Contenido persistente ' + runId;
    const response = await request('PUT', '/admin/site-settings', actor(), { version: before.version, configuration });
    const saved = await json<StoredSiteSettings>(response); assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(saved.version, before.version + 1); await seedSiteSettings(prisma);
    assert.deepEqual(await document(), saved); assert.deepEqual(await json(await request('GET', '/site-settings')), configuration);
    assert.equal(await prisma.auditLogs.count({ where: { userId: actor().id, entityType: 'SiteSettings', action: 'UPDATE' } }), 1);
    assert.equal((await request('PUT', '/admin/site-settings', actor(), { version: before.version, configuration })).status, 409);
  });
  it('dos editores concurrentes no sobrescriben sus versiones y restaurar aumenta la versión', async () => {
    const before = await document(); const configuration = structuredClone(before.configuration); configuration.inicio.titulo = 'Edición concurrente';
    const results = await Promise.all(Array.from({ length: 2 }, () => request('PUT', '/admin/site-settings', actor(), { version: before.version, configuration })));
    assert.deepEqual(results.map(item => item.status).sort(), [200,409]);
    const saved = await document();
    const restored = await json<StoredSiteSettings>(await request('POST', '/admin/site-settings/reset', actor(), { version: saved.version }));
    assert.equal(restored.version, saved.version + 1); assert.deepEqual(restored.configuration, DEFAULT_SITE_SETTINGS);
    assert.equal((await request('POST', '/admin/site-settings/reset', actor(), { version: saved.version })).status, 409);
  });
  it('rechaza contratos retirados y conserva la versión ante errores de validación o DB', async () => {
    const before = await document();
    for (const configuration of [{ ...before.configuration, plataforma: {} }, { ...before.configuration, publicaciones: {} }, { ...before.configuration, redes: { ...before.configuration.redes, youtube: 'javascript:alert(1)' } }]) {
      assert.equal((await request('PUT', '/admin/site-settings', actor(), { version: before.version, configuration })).status, 400);
    }
    const changed = structuredClone(before.configuration); changed.inicio.titulo = 'No debe persistirse';
    await assert.rejects(writeSiteSettings(before.version, changed, { userId: 2_147_483_647, roles: ['SUPER_ADMIN'], permissions: [...ROLE_PERMISSIONS.SUPER_ADMIN] }));
    assert.deepEqual(await document(), before);
    const original = prisma.$transaction;
    prisma.$transaction = async () => { throw new Error('Fallo controlado'); };
    try { assert.equal((await request('PUT', '/admin/site-settings', actor(), { version: before.version, configuration: changed })).status, 500); }
    finally { prisma.$transaction = original; }
    assert.deepEqual(await document(), before);
  });
  it('aplica sesiones, permisos vigentes y la frontera Super Admin incluso con grants indebidos', async () => {
    const before = await document();
    assert.equal((await request('GET', '/admin/statistics' + period)).status, 401);
    assert.equal((await request('GET', '/admin/site-settings')).status, 401);
    assert.equal((await request('GET', '/admin/statistics' + period, actor('CANDIDATE'))).status, 403);
    assert.equal((await request('GET', '/admin/site-settings', actor('ADMINISTRATOR'))).status, 200);
    assert.equal((await request('PUT', '/admin/site-settings', actor('ADMINISTRATOR'), before)).status, 403);
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: ROLE_NAMES.ADMINISTRATOR } });
    const update = await prisma.permissions.findUniqueOrThrow({ where: { name: PERMISSIONS.SITE_SETTINGS_UPDATE } });
    await prisma.rolePermissions.create({ data: { roleId: adminRole.id, permissionId: update.id } });
    try { assert.equal((await request('PUT', '/admin/site-settings', actor('ADMINISTRATOR'), before)).status, 403); }
    finally { await seedAccountCatalogs(prisma); }
    const stats = await prisma.permissions.findUniqueOrThrow({ where: { name: PERMISSIONS.STATISTICS_READ } });
    await prisma.rolePermissions.deleteMany({ where: { roleId: adminRole.id, permissionId: stats.id } });
    try { assert.equal((await request('GET', '/admin/statistics' + period, actor('ADMINISTRATOR'))).status, 403); }
    finally { await seedAccountCatalogs(prisma); }
    const readSettings = await prisma.permissions.findUniqueOrThrow({ where: { name: PERMISSIONS.SITE_SETTINGS_READ } });
    await prisma.rolePermissions.deleteMany({ where: { roleId: adminRole.id, permissionId: readSettings.id } });
    try { assert.equal((await request('GET', '/admin/site-settings', actor('ADMINISTRATOR'))).status, 403); }
    finally { await seedAccountCatalogs(prisma); }
    const superRole = await prisma.role.findUniqueOrThrow({ where: { name: ROLE_NAMES.SUPER_ADMIN } });
    await prisma.rolePermissions.deleteMany({ where: { roleId: superRole.id, permissionId: update.id } });
    try { assert.equal((await request('POST', '/admin/site-settings/reset', actor(), { version: before.version })).status, 403); }
    finally { await seedAccountCatalogs(prisma); }
  });
});
