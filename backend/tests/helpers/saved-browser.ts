import { randomUUID } from 'node:crypto';
import { mkdtemp, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import bcrypt from 'bcrypt';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { prisma } from '../../src/config/prisma.js';
import { ROLE_NAMES, ROLE_PERMISSIONS, type RoleCode } from '../../src/constants/authorization.constants.js';
import { OPPORTUNITY_KINDS } from '../../src/constants/opportunity.constants.js';
import { ORGANIZATION_STATUS_NAMES } from '../../src/constants/organization.constants.js';
import { createOpportunity, changeOpportunityStatus } from '../../src/services/opportunity.service.js';
import type { AccessContext } from '../../src/types/authorization.types.js';

/** Creates disposable fixtures for real browser persistence checks, exclusively on a test database. */
async function main(): Promise<void> {
  if (env.NODE_ENV !== 'test' || !new URL(env.DATABASE_URL).pathname.endsWith('_test')) {
    throw new Error('La revisión visual requiere una base independiente _test.');
  }
  env.RESUME_STORAGE_DIRECTORY = await mkdtemp(join(tmpdir(), 'fqa-saved-browser-test-'));
  env.RESUME_STORAGE_DRIVER = 'filesystem';
  const runId = 'saved-browser-' + randomUUID();
  const emails: string[] = [];
  const passwordHash = await bcrypt.hash('Guardados de prueba 2026', 12);
  /** Test accounts have their own namespaced addresses and hashed, disposable credentials. */
  const account = async (role: RoleCode, label: string): Promise<AccessContext> => {
    const user = await prisma.user.create({ data: {
      email: `${runId}-${label}@example.test`, passwordHash, status: { connect: { name: 'Activo' } },
      profile: { create: { firstName: 'Candidato', lastName: label } },
      userRoles: { create: { roles: { connect: { name: ROLE_NAMES[role] } } } },
    } });
    emails.push(user.email);
    return { userId: user.id, roles: [role], permissions: [...ROLE_PERMISSIONS[role]] };
  };
  const candidate = await account('CANDIDATE', 'principal');
  await account('CANDIDATE', 'otra-cuenta');
  const admin = await account('ADMINISTRATOR', 'administrador');
  const organization = await prisma.organizations.create({ data: {
    name: runId, organizationStatuses: { connect: { name: ORGANIZATION_STATUS_NAMES.ACTIVE } },
  } });
  const category = await prisma.jobCategories.create({ data: { name: runId, slug: runId } });
  const employment = await prisma.employmentTypes.findFirstOrThrow();
  const vacancies: Awaited<ReturnType<typeof createOpportunity>>[] = [];
  const spares: typeof vacancies = [];
  for (const kind of OPPORTUNITY_KINDS) {
    for (let index = 0; index < 4; index += 1) {
      const value = await createOpportunity({
        kind, title: `Guardado ${kind} ${index}`, description: 'Vacante aislada para comprobar guardados persistentes.',
        organizationId: organization.id, categoryId: category.id, department: 'San Salvador', municipality: 'San Salvador',
        modality: 'REMOTE', slots: 3, employmentTypeId: kind === 'EMPLOYMENT' ? employment.id : undefined,
        socialHours: kind === 'SOCIAL_HOURS' ? 80 : undefined, duration: kind === 'INTERNSHIP' ? '3 meses' : undefined,
        expiresAt: '2099-12-31',
      }, admin);
      const vacancy = await changeOpportunityStatus(value.key, 'OPEN', admin);
      vacancies.push(vacancy);
      if (index === 3) { spares.push(vacancy); continue; }
      const createdAt = new Date(Date.UTC(2020, 0, vacancies.length));
      const id = Number(value.key.split('-')[1]);
      if (kind === 'VOLUNTEER') await prisma.savedVolunteerOpportunities.create({ data: { userId: candidate.userId, volunteerOpportunityId: id, createdAt } });
      else await prisma.savedJobs.create({ data: { userId: candidate.userId, jobId: id, createdAt } });
    }
  }
  const unavailable = vacancies[0]!;
  await changeOpportunityStatus(unavailable.key, 'CLOSED', admin);
  await prisma.savedJobs.updateMany({ where: { userId: candidate.userId, jobId: Number(unavailable.key.split('-')[1]) }, data: { createdAt: new Date() } });
  const app = createApp();
  /** Restores this fixture's original bookmarks so an interrupted visual run is safely repeatable. */
  app.post('/__test/reset', async (_request, response) => {
    await prisma.savedJobs.deleteMany({ where: { userId: candidate.userId } });
    await prisma.savedVolunteerOpportunities.deleteMany({ where: { userId: candidate.userId } });
    for (let index = 0; index < vacancies.length; index += 1) {
      const vacancy = vacancies[index]!;
      if (spares.some(spare => spare.key === vacancy.key)) continue;
      const id = Number(vacancy.key.split('-')[1]);
      const createdAt = index === 0 ? new Date() : new Date(Date.UTC(2020, 0, index + 1));
      if (vacancy.kind === 'VOLUNTEER') await prisma.savedVolunteerOpportunities.create({ data: { userId: candidate.userId, volunteerOpportunityId: id, createdAt } });
      else await prisma.savedJobs.create({ data: { userId: candidate.userId, jobId: id, createdAt } });
    }
    response.sendStatus(204);
  });
  app.get('/__test/fixture', (_request, response) => response.json({ runId, candidateEmail: emails[0], otherEmail: emails[1], spares, unavailableKey: unavailable.key, total: 12 }));
  /** Removes only accounts and vacancies created by this fixture, including namespaced UI registrations. */
  app.post('/__test/cleanup', async (_request, response) => {
    const users = await prisma.user.findMany({ where: { email: { startsWith: runId + '-' } }, select: { id: true, email: true } });
    const ids = users.map(user => user.id);
    await prisma.jobs.deleteMany({ where: { organizationId: organization.id } });
    await prisma.volunteerOpportunities.deleteMany({ where: { organizationId: organization.id } });
    await prisma.auditLogs.deleteMany({ where: { userId: { in: ids } } });
    await prisma.emailOutbox.deleteMany({ where: { recipientEmail: { in: users.map(user => user.email) } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.organizations.delete({ where: { id: organization.id } });
    await prisma.jobCategories.delete({ where: { id: category.id } });
    await rmdir(env.RESUME_STORAGE_DIRECTORY!);
    await prisma.$disconnect();
    response.sendStatus(204);
    server.close();
  });
  const server = app.listen(3001, '0.0.0.0', () => console.info('API de guardados aislada disponible en el puerto 3001.'));
}

void main().catch(() => { console.error('No fue posible preparar la revisión de guardados.'); process.exitCode = 1; });
