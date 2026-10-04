import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { prisma } from '../../src/config/prisma.js';
import type { Prisma } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { PERMISSIONS, ROLE_NAMES } from '../../src/constants/authorization.constants.js';
import { cleanupResumes, uploadResume } from '../../src/services/resume.service.js';
import { getResumeStorage, type ResumeStorage } from '../../src/services/resume-storage.service.js';
import { getCandidateProfile, updateCandidateProfile } from '../../src/services/profile.service.js';
import { authorizationService } from '../../src/services/authorization.service.js';
import { seedAccountCatalogs } from '../../src/services/catalog.service.js';
import type { CandidateProfile, ResumeMetadata } from '../../src/types/profile.types.js';
import type { RegistrationResponse } from '../../src/types/auth.types.js';
import { startTestServer, stopTestServer, type TestServer } from '../helpers/http.js';

const runId = randomUUID();
const password = 'Contraseña de pruebas 2026';
const userIds: number[] = [];
let api: TestServer;
let candidate: RegistrationResponse;
let other: RegistrationResponse;
let administratorToken: string;
let organizationId: number | undefined;
const catalogIds: { category?: number; employment?: number; experience?: number; status?: number; location?: number; applicationStatus?: number } = {};
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');

/** Authenticated JSON request against the isolated integration server. */
const request = (method: string, path: string, token?: string, body?: unknown): Promise<Response> => fetch(api.baseUrl + '/api' + path, {
  method, headers: { 'Content-Type': 'application/json', 'X-FQA-Request': '1', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
});
/** Uses real multipart encoding; no supplied owner or document ID is accepted. */
const sendFile = (content = pdf, name = 'curriculum.pdf', mime = 'application/pdf', token = candidate.accessToken, extra = false): Promise<Response> => {
  const body = new FormData(); body.append('file', new Blob([content], { type: mime }), name);
  if (extra) body.append('userId', String(other.userId));
  return fetch(api.baseUrl + '/api/profile/me/resume', { method: 'PUT',
    headers: { Authorization: 'Bearer ' + token, 'X-FQA-Request': '1' }, body });
};

describe('Perfil y CV persistentes del candidato', () => {
  before(async () => {
    assert.equal(env.NODE_ENV, 'test'); assert.ok(env.DATABASE_URL.includes('_test'));
    assert.ok(env.RESUME_STORAGE_DIRECTORY?.includes('fqa-resume-test-'));
    api = await startTestServer(createApp());
    await seedAccountCatalogs(prisma);
    const register = async (label: string): Promise<RegistrationResponse> => {
      const response = await request('POST', '/auth/register', undefined, { fullName: 'Candidato Prueba', email: `${runId}-${label}@example.test`, password });
      assert.equal(response.status, 201); const body = await response.json() as RegistrationResponse; userIds.push(body.userId); return body;
    };
    candidate = await register('candidate'); other = await register('other');
    const source = await prisma.user.findUniqueOrThrow({ where: { id: candidate.userId } });
    const admin = await prisma.user.create({ data: { email: `${runId}-admin@example.test`, passwordHash: source.passwordHash,
      status: { connect: { name: 'Activo' } }, userRoles: { create: { roles: { connect: { name: ROLE_NAMES.ADMINISTRATOR } } } } } });
    userIds.push(admin.id);
    const response = await request('POST', '/auth/login', undefined, { email: admin.email, password });
    administratorToken = (await response.json() as RegistrationResponse).accessToken;
  });
  after(async () => {
    await prisma.auditLogs.deleteMany({ where: { userId: { in: userIds } } });
    const files = await prisma.files.findMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    for (const file of files) await getResumeStorage().remove(file.filePath);
    if (organizationId) await prisma.organizations.delete({ where: { id: organizationId } });
    if (catalogIds.category) await prisma.jobCategories.delete({ where: { id: catalogIds.category } });
    if (catalogIds.employment) await prisma.employmentTypes.delete({ where: { id: catalogIds.employment } });
    if (catalogIds.experience) await prisma.experienceLevels.delete({ where: { id: catalogIds.experience } });
    if (catalogIds.status) await prisma.jobStatuses.delete({ where: { id: catalogIds.status } });
    if (catalogIds.location) await prisma.locations.delete({ where: { id: catalogIds.location } });
    if (catalogIds.applicationStatus) await prisma.applicationStatuses.delete({ where: { id: catalogIds.applicationStatus } });
    await stopTestServer(api.server); await prisma.$disconnect();
  });

  it('rechaza visitantes, administradores y campos de identidad ajena', async () => {
    assert.equal((await request('GET', '/profile/me')).status, 401);
    assert.equal((await request('GET', '/profile/me', administratorToken)).status, 403);
    assert.equal((await request('PATCH', '/profile/me', candidate.accessToken, { userId: other.userId })).status, 400);
    assert.equal((await sendFile(pdf, 'cv.pdf', 'application/pdf', administratorToken)).status, 403);
  });

  it('persiste datos y colecciones; conserva omitidos y elimina solo los enviados vacíos', async () => {
    const payload = { firstName: 'Ana', lastName: 'Rivera', phone: '70000000', department: 'San Salvador', municipality: 'San Salvador',
      profession: 'Docente', educationLevel: 'Universitario', professionalSummary: 'Educación comunitaria',
      workExperiences: [{ companyName: 'Fundación', position: 'Docente', description: 'Formación', startDate: '2023-01-01', endDate: null }],
      educations: [{ institution: 'Universidad', degree: 'Educación', startDate: '2018-01-01', endDate: '2022-12-01' }],
      skills: ['Comunicación', ' comunicación ', 'Excel'] };
    const response = await request('PATCH', '/profile/me', candidate.accessToken, payload); assert.equal(response.status, 200);
    const profile = await response.json() as CandidateProfile;
    assert.equal(profile.firstName, 'Ana'); assert.equal(profile.skills.length, 2);
    const reloaded = await request('GET', '/profile/me', candidate.accessToken); assert.deepEqual(await reloaded.json(), profile);
    const changed = await request('PATCH', '/profile/me', candidate.accessToken, { phone: null, educations: [] });
    const partial = await changed.json() as CandidateProfile;
    assert.equal(partial.phone, null); assert.deepEqual(partial.educations, []); assert.equal(partial.workExperiences.length, 1);
    const identity = await request('GET', '/auth/me', candidate.accessToken);
    assert.equal((await identity.json() as RegistrationResponse).user.fullName, 'Ana Rivera');
    const independent = await request('GET', '/profile/me', other.accessToken);
    assert.equal((await independent.json() as CandidateProfile).firstName, 'Candidato');
  });

  it('valida fechas y revierte cambios cuando falla la auditoría', async () => {
    const invalid = await request('PATCH', '/profile/me', candidate.accessToken, { firstName: 'No guardar',
      educations: [{ institution: 'Universidad', degree: 'Carrera', startDate: '2025-02-29', endDate: null }] });
    assert.equal(invalid.status, 400);
    const actor = await authorizationService.getAccessContext(candidate.userId);
    const before = await getCandidateProfile(actor);
    const failingTransaction = <T>(operation: (database: Prisma.TransactionClient) => Promise<T>,
      options: { isolationLevel: Prisma.TransactionIsolationLevel }): Promise<T> => prisma.$transaction(async (database) => {
        const failingDatabase = new Proxy(database, { get(target, property, receiver) {
          if (property === 'auditLogs') return new Proxy(target.auditLogs, { get(delegate, method, delegateReceiver) {
            if (method === 'create') return async () => { throw new Error('Auditoría de prueba indisponible'); };
            return Reflect.get(delegate, method, delegateReceiver);
          } });
          return Reflect.get(target, property, receiver);
        } });
        return operation(failingDatabase);
      }, options);
    await assert.rejects(updateCandidateProfile({ firstName: 'No guardar', skills: [] }, actor, failingTransaction), /Auditoría/);
    assert.deepEqual(await getCandidateProfile(actor), before);
  });

  it('sube y descarga bytes exactos, sin rutas internas ni acceso entre candidatos', async () => {
    const response = await sendFile(); assert.equal(response.status, 200);
    const document = await response.json() as ResumeMetadata;
    assert.equal(document.originalName, 'curriculum.pdf'); assert.equal(document.sizeBytes, pdf.length);
    assert.equal('filePath' in document, false);
    const download = await request('GET', '/profile/me/resume/download', candidate.accessToken);
    assert.equal(download.status, 200); assert.match(download.headers.get('content-disposition') ?? '', /attachment/);
    assert.equal(download.headers.get('cache-control'), 'no-store');
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), pdf);
    assert.equal(await (await request('GET', '/profile/me/resume', other.accessToken)).json(), null);
    assert.equal((await request('GET', '/profile/me/resume/download', other.accessToken)).status, 404);
  });

  it('rechaza bytes inválidos, MIME incorrecto, campos extra, vacío y exceso conservando el CV', async () => {
    const before = await (await request('GET', '/profile/me/resume', candidate.accessToken)).json();
    for (const [bytes, name, mime] of [[Buffer.from('invalid'), 'cv.pdf', 'application/pdf'], [pdf, 'cv.doc', 'application/pdf'],
      [pdf, 'cv.pdf', 'text/plain'], [Buffer.alloc(0), 'cv.pdf', 'application/pdf']] as const) {
      assert.equal((await sendFile(bytes, name, mime)).status, 400);
    }
    assert.equal((await sendFile(pdf, 'cv.pdf', 'application/pdf', candidate.accessToken, true)).status, 400);
    assert.equal((await sendFile(Buffer.alloc(5 * 1024 * 1024 + 1))).status, 413);
    assert.deepEqual(await (await request('GET', '/profile/me/resume', candidate.accessToken)).json(), before);
  });

  it('acepta exactamente 5 MiB y mantiene el perfil disponible sin almacenamiento configurado', async () => {
    const maximum = Buffer.alloc(5 * 1024 * 1024, 32); pdf.copy(maximum); Buffer.from('%%EOF').copy(maximum, maximum.length - 5);
    const response = await sendFile(maximum); assert.equal(response.status, 200);
    assert.equal((await response.json() as ResumeMetadata).sizeBytes, maximum.length);
    assert.equal((await sendFile()).status, 200);
    const driver = env.RESUME_STORAGE_DRIVER;
    env.RESUME_STORAGE_DRIVER = undefined;
    try {
      assert.equal((await request('GET', '/profile/me/resume', candidate.accessToken)).status, 503);
      assert.equal((await request('GET', '/profile/me', candidate.accessToken)).status, 200);
      assert.equal((await request('GET', '/health')).status, 200);
    } finally { env.RESUME_STORAGE_DRIVER = driver; }
  });

  it('compensa fallos de transacción y almacenamiento sin sustituir el CV anterior', async () => {
    const actor = await authorizationService.getAccessContext(candidate.userId); const stored = getResumeStorage();
    const input = { originalname: 'cv.pdf', mimetype: 'application/pdf', buffer: pdf, size: pdf.length } as Express.Multer.File;
    const before = await (await request('GET', '/profile/me/resume', candidate.accessToken)).json();
    let created: string | undefined; let removed: string | undefined;
    const probe: ResumeStorage = { put: async (key, bytes) => { created = key; await stored.put(key, bytes); },
      remove: async (key) => { removed = key; await stored.remove(key); }, get: (key) => stored.get(key), listOlderThan: (date) => stored.listOlderThan(date) };
    await assert.rejects(uploadResume(input, { ...actor, userId: -1 }, probe));
    assert.equal(removed, created); assert.ok(created); await assert.rejects(stored.get(created));
    await assert.rejects(uploadResume(input, actor, { ...probe, put: async () => { throw new Error('storage failed'); } }), /documento anterior se conserva/);
    assert.deepEqual(await (await request('GET', '/profile/me/resume', candidate.accessToken)).json(), before);
  });

  it('reemplaza y elimina el activo; limpia huérfanos y conserva documentos históricos', async () => {
    const prior = await (await request('GET', '/profile/me/resume', candidate.accessToken)).json() as ResumeMetadata;
    const priorRow = await prisma.files.findUniqueOrThrow({ where: { id: prior.id } });
    // Model real application references so cleanup cannot silently discard submitted documents.
    const organization = await prisma.organizations.create({ data: { name: runId,
      organizationStatuses: { connect: { name: 'Activo' } } } }); organizationId = organization.id;
    const category = await prisma.jobCategories.create({ data: { name: runId, slug: runId } }); catalogIds.category = category.id;
    const employment = await prisma.employmentTypes.create({ data: { name: runId } }); catalogIds.employment = employment.id;
    const experience = await prisma.experienceLevels.create({ data: { name: runId } }); catalogIds.experience = experience.id;
    const status = await prisma.jobStatuses.create({ data: { name: runId } }); catalogIds.status = status.id;
    const location = await prisma.locations.create({ data: { department: runId, municipality: 'Prueba' } }); catalogIds.location = location.id;
    const applicationStatus = await prisma.applicationStatuses.create({ data: { name: runId } }); catalogIds.applicationStatus = applicationStatus.id;
    const job = await prisma.jobs.create({ data: { organizationId: organization.id, categoryId: category.id,
      employmentTypeId: employment.id, experienceLevelId: experience.id, statusId: status.id, locationId: location.id,
      title: 'Vacante de prueba', slug: runId, description: 'Descripción' } });
    const application = await prisma.applications.create({ data: { jobId: job.id, userId: candidate.userId,
      statusId: applicationStatus.id, resumeId: prior.id, referenceNumber: runId } });
    await prisma.applicationFiles.create({ data: { applicationId: application.id, fileId: prior.id } });
    const historical = await prisma.files.create({ data: { userId: candidate.userId, fileType: 'RESUME', filePath: randomUUID() + '.pdf',
      originalName: null, createdAt: new Date(0) } });
    await getResumeStorage().put(historical.filePath, pdf);
    const response = await sendFile(Buffer.concat([pdf.subarray(0, -5), Buffer.from('otra versión\n%%EOF')]), 'nuevo.pdf');
    assert.equal(response.status, 200); const active = await response.json() as ResumeMetadata; assert.notEqual(active.id, prior.id);
    assert.equal((await request('DELETE', '/profile/me/resume', candidate.accessToken)).status, 204);
    assert.equal(await (await request('GET', '/profile/me/resume', candidate.accessToken)).json(), null);
    assert.equal((await request('DELETE', '/profile/me/resume', candidate.accessToken)).status, 204);
    await cleanupResumes(getResumeStorage(), new Date(Date.now() + 2 * 60 * 60_000));
    assert.ok(await prisma.files.findUnique({ where: { id: prior.id } }));
    assert.deepEqual(await getResumeStorage().get(priorRow.filePath), pdf);
    assert.equal(await prisma.files.findUnique({ where: { id: active.id } }), null);
    await prisma.applicationFiles.deleteMany({ where: { applicationId: application.id } });
    await cleanupResumes(getResumeStorage(), new Date(Date.now() + 2 * 60 * 60_000));
    assert.ok(await prisma.files.findUnique({ where: { id: prior.id } }));
    await prisma.applications.delete({ where: { id: application.id } });
    await cleanupResumes(getResumeStorage(), new Date(Date.now() + 2 * 60 * 60_000));
    assert.equal(await prisma.files.findUnique({ where: { id: prior.id } }), null);
    await assert.rejects(getResumeStorage().get(priorRow.filePath));
    assert.ok(await prisma.files.findUnique({ where: { id: historical.id } }));
    assert.deepEqual(await getResumeStorage().get(historical.filePath), pdf);
    const orphan = randomUUID() + '.pdf'; await getResumeStorage().put(orphan, pdf);
    await cleanupResumes(getResumeStorage(), new Date(Date.now() + 2 * 60 * 60_000));
    await assert.rejects(getResumeStorage().get(orphan));
  });

  it('los permisos y el estado de cuenta se revalidan sin renovar el token', async () => {
    const permission = await prisma.permissions.findUniqueOrThrow({ where: { name: PERMISSIONS.PROFILE_UPDATE_OWN } });
    const role = await prisma.role.findUniqueOrThrow({ where: { name: ROLE_NAMES.CANDIDATE } });
    await prisma.rolePermissions.delete({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } } });
    try { assert.equal((await request('PATCH', '/profile/me', candidate.accessToken, { phone: '70001111' })).status, 403); }
    finally { await seedAccountCatalogs(prisma); }
    await prisma.user.update({ where: { id: other.userId }, data: { deletedAt: new Date() } });
    assert.equal((await request('GET', '/profile/me', other.accessToken)).status, 401);
  });
});
