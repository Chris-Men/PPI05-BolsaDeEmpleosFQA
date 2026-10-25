import { randomUUID } from 'node:crypto';
import { mkdtemp, rmdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import bcrypt from 'bcrypt';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { prisma } from '../../src/config/prisma.js';
import { ROLE_NAMES } from '../../src/constants/authorization.constants.js';
import { SITE_SETTINGS_KEY } from '../../src/constants/site-settings.constants.js';
import { ORGANIZATION_STATUS_NAMES } from '../../src/constants/organization.constants.js';
import { startStatisticsExportWorker } from '../../src/services/statistics-export.service.js';

/** Disposable browser API cannot start against development or production data. */
async function main(): Promise<void> {
  if (env.NODE_ENV !== 'test' || !new URL(env.DATABASE_URL).pathname.endsWith('_test')) throw new Error('Se requiere una base independiente _test.');
  env.RESUME_STORAGE_DIRECTORY = await mkdtemp(join(tmpdir(), 'fqa-statistics-browser-'));
  env.RESUME_STORAGE_DRIVER = 'filesystem';
  env.STATISTICS_EXPORT_DIRECTORY = await mkdtemp(join(tmpdir(), 'fqa-excel-browser-'));
  const runId = 'statistics-browser-' + randomUUID(); const ids: number[] = [];
  const previous = await prisma.systemSettings.findUnique({ where: { settingKey: SITE_SETTINGS_KEY } });
  const passwordHash = await bcrypt.hash('Estadisticas de navegador 2026', 12);
  const accounts: Record<string, string> = {};
  for (const [role, name] of Object.entries(ROLE_NAMES)) {
    const user = await prisma.user.create({ data: { email: runId + '-' + role.toLowerCase() + '@example.test', passwordHash,
      status: { connect: { name: 'Activo' } }, profile: { create: { firstName: 'Prueba', lastName: role } }, userRoles: { create: { roles: { connect: { name } } } } } });
    ids.push(user.id); accounts[role] = user.email;
  }
  const organization = await prisma.organizations.create({ data: { name: runId, organizationStatuses: { connect: { name: ORGANIZATION_STATUS_NAMES.ACTIVE } } } });
  const inactive = await prisma.organizations.create({ data: { name: runId + '-inactive', organizationStatuses: { connect: { name: ORGANIZATION_STATUS_NAMES.INACTIVE } } } });
  const categories = await prisma.jobCategories.createManyAndReturn({ data: Array.from({ length: 12 }, (_, index) => ({ name: 'Categoría de prueba ' + index + ' ' + runId.slice(-8), slug: runId + '-category-' + index })), select: { id: true } });
  const jobState = await prisma.jobStatuses.findUniqueOrThrow({ where: { name: 'Publicada' } });
  const volunteerState = await prisma.volunteerStatuses.findUniqueOrThrow({ where: { name: 'Publicada' } });
  const kinds = ['EMPLOYMENT', 'SOCIAL_HOURS', 'INTERNSHIP'] as const;
  const jobs = await prisma.jobs.createManyAndReturn({ data: Array.from({ length: 108 }, (_, index) => ({ title: 'Vacante de estadísticas ' + index, slug: runId + index,
    description: 'Oportunidad de prueba.', kind: kinds[index % 3], organizationId: organization.id, categoryId: categories[index % 13]?.id ?? null, statusId: jobState.id, publishedAt: new Date('2030-01-02T12:00:00Z') })), select: { id: true, kind: true } });
  await prisma.volunteerOpportunities.createMany({ data: Array.from({ length: 4 }, (_, index) => ({ title: 'Voluntariado de estadísticas ' + index, slug: runId + '-vol-' + index,
    description: 'Oportunidad de prueba.', organizationId: organization.id, categoryId: categories[0]!.id, statusId: volunteerState.id, publishedAt: new Date('2030-01-02T12:00:00Z') })) });
  const candidate = await prisma.user.findFirstOrThrow({ where: { email: accounts.CANDIDATE } });
  await prisma.userProfile.update({ where: { userId: candidate.id }, data: { birthDate: new Date('2000-10-24'), sex: 'UNDISCLOSED', educationLevel: 'Técnico', department: 'San Salvador' } });
  const volunteer = await prisma.volunteerOpportunities.findFirstOrThrow({ where: { organizationId: organization.id } });
  const registration = await prisma.volunteerRegistrations.create({ data: { userId: candidate.id, volunteerOpportunityId: volunteer.id } });
  const states = await prisma.applicationStatuses.findMany();
  const at = new Date('2030-01-02T12:00:00Z');
  for (const [index, name] of ['Seleccionada', 'En revisión', 'Rechazada', 'Retirada', 'Pendiente'].entries()) {
    await prisma.applications.create({ data: { userId: candidate.id, statusId: states.find(state => state.name === name)!.id,
      referenceNumber: randomUUID(), createdAt: at, ...(index === 4 ? { volunteerRegistrationId: registration.id } : { jobId: jobs[index]!.id }) } });
  }
  const app = createApp();
  let stopExports = startStatisticsExportWorker();
  /** Browser-only controls make queue/reload checks deterministic without changing real API behavior. */
  app.post('/__test/export-worker', async (request, response) => { await stopExports(); if (request.body.enabled === true) stopExports = startStatisticsExportWorker(); response.sendStatus(204); });
  app.post('/__test/expire-export', async (request, response) => {
    await prisma.statisticsExport.updateMany({ where: { id: Number(request.body.id), userId: { in: ids } }, data: { expiresAt: new Date(0) } }); response.sendStatus(204);
  });
  app.get('/__test/fixture', (_request, response) => response.json({ accounts, opportunities: 112, organizations: 2 }));
  /** Cleanup preserves all unrelated rows and restores the original configuration document exactly. */
  app.post('/__test/cleanup', async (_request, response) => {
    await stopExports();
    await prisma.jobs.deleteMany({ where: { organizationId: organization.id } });
    await prisma.volunteerOpportunities.deleteMany({ where: { organizationId: organization.id } });
    await prisma.auditLogs.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.organizations.deleteMany({ where: { id: { in: [organization.id, inactive.id] } } });
    await prisma.jobCategories.deleteMany({ where: { id: { in: categories.map(category => category.id) } } });
    if (previous) await prisma.systemSettings.update({ where: { settingKey: SITE_SETTINGS_KEY }, data: { settingValue: previous.settingValue, updatedAt: previous.updatedAt } });
    else await prisma.systemSettings.deleteMany({ where: { settingKey: SITE_SETTINGS_KEY } });
    await rmdir(env.RESUME_STORAGE_DIRECTORY!); await rm(env.STATISTICS_EXPORT_DIRECTORY!, { recursive: true, force: true }); await prisma.$disconnect(); response.sendStatus(204); server.close();
  });
  const server = app.listen(3001, '0.0.0.0', () => console.info('API de estadísticas y configuración aislada preparada.'));
}
void main().catch(() => { console.error('No se pudo preparar la revisión visual aislada.'); process.exitCode = 1; });
