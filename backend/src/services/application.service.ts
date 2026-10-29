import { randomUUID } from 'node:crypto';
import { Prisma, type Files } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { PERMISSIONS } from '../constants/authorization.constants.js';
import { APPLICATION_STATUS_NAMES, applicationStatusFor, type ApplicationStatus } from '../constants/application.constants.js';
import { OPPORTUNITY_STATUS_NAMES } from '../constants/opportunity.constants.js';
import type { AccessContext } from '../types/authorization.types.js';
import type { CandidateProfile } from '../types/profile.types.js';
import { applicationDataSchema, finalApplicationDataSchema, type ApplicationFilters, type UpdateDraft, type ApplicationDecision } from '../validation/application.schema.js';
import { AppError } from '../utils/app-error.js';
import { assertCandidateAccess, readProfile } from './profile.service.js';
import { assertVacancyAccess } from './vacancy-policy.service.js';
import { readApplicationOpportunity, type Opportunity } from './opportunity.service.js';
import { selectedCount } from './application-capacity.service.js';
import { getResumeStorage } from './resume-storage.service.js';
import { MAX_RESUME_BYTES } from './resume.service.js';
import { enqueueApplicationConfirmation, enqueueApplicationDecision } from './email.service.js';

/** Conflicting writers retry serializable transactions, never silently retry a stale client version. */
export const applicationTransaction = async <T>(operation: (database: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 }); }
    catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (['P2034','P2002'].includes(error.code) && attempt < 2) continue;
        if (['P2034','P2002','P2025','P2003'].includes(error.code)) throw new AppError(409, 'Los datos cambiaron. Recarga e inténtalo de nuevo.');
      }
      throw error;
    }
  }
  throw new AppError(409, 'No fue posible completar la operación.');
};
/** JSON snapshots contain safe DTOs rather than Prisma records or storage paths. */
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const resumeMetadata = (file: Files | null) => file ? ({
  id: file.id, originalName: file.originalName ?? 'curriculum.pdf', mimeType: file.mimeType ?? 'application/pdf',
  sizeBytes: file.sizeBytes ?? 0, createdAt: file.createdAt?.toISOString() ?? '',
}) : null;
/** Exactly one source is set by the server; opportunity keys never collide. */
const target = (key: string): Prisma.ApplicationsWhereInput => key.startsWith('job-')
  ? { jobId: Number(key.split('-')[1]) } : { volunteerRegistrations: { volunteerOpportunityId: Number(key.split('-')[1]) } };
const includes = { applicationStatuses: true, files: true, users: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
  applicationFiles: { include: { files: true }, orderBy: { id: 'asc' as const } },
  volunteerRegistrations: { select: { volunteerOpportunityId: true } },
  applicationStatusHistory: { orderBy: { id: 'asc' as const } },
} satisfies Prisma.ApplicationsInclude;
type ApplicationRow = Prisma.ApplicationsGetPayload<{ include: typeof includes }>;
/** Older attempts may keep their CV only in the existing attachment relation. */
const submittedResume = (row:ApplicationRow):Files|null => row.files ?? row.applicationFiles.find(attachment=>attachment.files.fileType==='RESUME')?.files ?? null;
const draftInclude = { files: true } satisfies Prisma.ApplicationDraftsInclude;
type DraftRow = Prisma.ApplicationDraftsGetPayload<{ include: typeof draftInclude }>;
const applicationKey = (row: ApplicationRow): string => {
  if (row.jobId && !row.volunteerRegistrations) return 'job-' + row.jobId;
  if (!row.jobId && row.volunteerRegistrations) return 'volunteer-' + row.volunteerRegistrations.volunteerOpportunityId;
  throw new AppError(409, 'La postulación histórica no tiene un origen válido.');
};
const draftKey = (row: DraftRow): string => row.jobId ? 'job-' + row.jobId : 'volunteer-' + row.volunteerOpportunityId;
/** Snapshot values were created by the server; legacy records explicitly have no submitted snapshot. */
const profileSnapshot = (value: Prisma.JsonValue | null): CandidateProfile | null => value && typeof value === 'object' && !Array.isArray(value) && 'firstName' in value
  ? { birthDate: null, sex: null, ...value } as unknown as CandidateProfile : null;
const statusCatalog = async (database: Prisma.TransactionClient) => new Map((await database.applicationStatuses.findMany()).map(row => [row.id, row.name]));
const mapApplication = async (row: ApplicationRow, database: Prisma.TransactionClient, catalog: Map<number, string>) => {
  const key = applicationKey(row);
  const snapshot = row.opportunitySnapshot && typeof row.opportunitySnapshot === 'object' && !Array.isArray(row.opportunitySnapshot) && 'key' in row.opportunitySnapshot
    ? row.opportunitySnapshot as unknown as Opportunity : await readApplicationOpportunity(key, database);
  const parsed = applicationDataSchema.safeParse(row.submittedData);
  const profile = profileSnapshot(row.profileSnapshot);
  const data = parsed.success ? parsed.data : null;
  return { id: row.id, userId: row.userId, referenceNumber: row.referenceNumber, attemptNumber: row.attemptNumber, version: row.version,
    opportunityKey: key, opportunity: snapshot, data, professionalProfile: profile,
    candidateName: data ? data.personal.firstName + ' ' + data.personal.lastName : [row.users.profile?.firstName, row.users.profile?.lastName].filter(Boolean).join(' '),
    candidateEmail: profile?.email ?? row.users.email, status: applicationStatusFor(row.applicationStatuses.name),
    statusLabel: row.applicationStatuses.name, resume: resumeMetadata(submittedResume(row)), createdAt: row.createdAt?.toISOString() ?? null, legacy: !data,
    history: row.applicationStatusHistory.map(history => ({
      id: history.id, oldStatus: history.oldStatusId ? applicationStatusFor(catalog.get(history.oldStatusId) ?? '') : null,
      status: applicationStatusFor(catalog.get(history.newStatusId) ?? ''), reason: history.reason,
      createdAt: history.createdAt?.toISOString() ?? null, changedBy: history.changedBy,
    })),
  };
};
const mapDraft = async (row: DraftRow, database: Prisma.TransactionClient) => ({
  id: row.id, opportunityKey: draftKey(row), opportunity: await readApplicationOpportunity(draftKey(row), database),
  data: applicationDataSchema.parse(row.data), professionalProfile: profileSnapshot(row.profileSnapshot),
  currentStep: row.currentStep, version: row.version, resume: resumeMetadata(row.files),
  updatedAt: row.updatedAt.toISOString(),
});
export type Application = Awaited<ReturnType<typeof mapApplication>>;
export type ApplicationDraft = Awaited<ReturnType<typeof mapDraft>>;
/** Final eligibility always executes within the same transaction as the application write. */
const available = async (database: Prisma.TransactionClient, key: string): Promise<Opportunity> => {
  const opportunity = await readApplicationOpportunity(key, database, true);
  if (opportunity.slots !== null && await selectedCount(database, key) >= opportunity.slots) throw new AppError(409, 'La vacante ya no tiene cupos disponibles.');
  return opportunity;
};
const latestAttempt = (database: Prisma.TransactionClient, key: string, userId: number) =>
  database.applications.findFirst({ where: { ...target(key), userId }, include: { applicationStatuses: true }, orderBy: { attemptNumber: 'desc' } });
const allowAttempt = async (database: Prisma.TransactionClient, key: string, userId: number) => {
  const latest = await latestAttempt(database, key, userId);
  if (latest && applicationStatusFor(latest.applicationStatuses.name) !== 'WITHDRAWN') throw new AppError(409, 'Ya tienes una postulación para esta vacante. Consúltala en Mis postulaciones.');
  return (latest?.attemptNumber ?? 0) + 1;
};
const ownedDraft = async (database: Prisma.TransactionClient, id: string, actor: AccessContext): Promise<DraftRow> => {
  const draft = await database.applicationDrafts.findFirst({ where: { id, userId: actor.userId }, include: draftInclude });
  if (!draft) throw new AppError(404, 'El borrador no existe.');
  return draft;
};
/** Existing drafts are returned intact, even after the vacancy stops receiving applications. */
export const createDraft = async (key: string, actor: AccessContext): Promise<ApplicationDraft> => {
  assertCandidateAccess(actor, PERMISSIONS.APPLICATION_CREATE_OWN);
  return applicationTransaction(async database => {
    const id = Number(key.split('-')[1]); const job = key.startsWith('job-');
    const existing = await database.applicationDrafts.findFirst({ where: { userId: actor.userId, ...(job ? { jobId: id } : { volunteerOpportunityId: id }) }, include: draftInclude });
    if (existing) return mapDraft(existing, database);
    await available(database, key); await allowAttempt(database, key, actor.userId);
    const profile = await readProfile(actor.userId, database);
    const document = await database.userProfile.findUniqueOrThrow({ where: { userId: actor.userId }, select: { resumeFileId: true } });
    const experience = profile.workExperiences[0];
    const data = { personal: { firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone ?? '',
      birthDate: profile.birthDate ?? '', sex: profile.sex ?? '',
      department: profile.department ?? '', municipality: profile.municipality ?? '', profession: profile.profession ?? '', educationLevel: profile.educationLevel ?? '' },
      experience: { lastRole: experience?.position ?? '', lastOrg: experience?.companyName ?? '', skills: profile.skills.join(', '), motivation: '' } };
    const row = await database.applicationDrafts.create({ data: { userId: actor.userId, ...(job ? { jobId: id } : { volunteerOpportunityId: id }),
      resumeId: document.resumeFileId, data: json(data), profileSnapshot: json(profile) }, include: draftInclude });
    return mapDraft(row, database);
  });
};
export const getDraft = async (id: string, actor: AccessContext): Promise<ApplicationDraft> => {
  assertCandidateAccess(actor, PERMISSIONS.APPLICATION_READ_OWN);
  return mapDraft(await ownedDraft(prisma, id, actor), prisma);
};
export const listDrafts = async (actor: AccessContext, page=1, pageSize=20) => {
  assertCandidateAccess(actor, PERMISSIONS.APPLICATION_READ_OWN);
  return prisma.$transaction(async database => {
    const where={userId:actor.userId};
    const [rows,total]=await Promise.all([database.applicationDrafts.findMany({ where, include:draftInclude,
      orderBy:[{updatedAt:'desc'},{id:'desc'}],skip:(page-1)*pageSize,take:pageSize}),database.applicationDrafts.count({where})]);
    return {items:await Promise.all(rows.map(row=>mapDraft(row,database))),total,page,pageSize};
  },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
};
/** Draft references may keep an earlier owned CV; storage validation is deferred until final submission. */
const assertResume = async (database: Prisma.TransactionClient, id: number, actor: AccessContext): Promise<Files> => {
  const file = await database.files.findFirst({ where: { id, userId: actor.userId, fileType: 'RESUME' } });
  if (!file || file.mimeType !== 'application/pdf' || !file.originalName || !file.sizeBytes || file.sizeBytes > MAX_RESUME_BYTES) {
    throw new z.ZodError([{ code: 'custom', path: ['resumeId'], message: 'Selecciona un CV propio válido.' }]);
  }
  return file;
};
export const updateDraft = async (id: string, payload: UpdateDraft, actor: AccessContext): Promise<ApplicationDraft> => {
  assertCandidateAccess(actor, PERMISSIONS.APPLICATION_CREATE_OWN);
  return applicationTransaction(async database => {
    const before = await ownedDraft(database, id, actor);
    if (before.version !== payload.version) throw new AppError(409, 'El borrador cambió en otra sesión. Recarga antes de guardar.');
    if (payload.resumeId !== null) await assertResume(database, payload.resumeId, actor);
    const row = await database.applicationDrafts.update({ where: { id }, data: {
      data: json(payload.data), currentStep: payload.currentStep, resumeId: payload.resumeId, version: { increment: 1 },
    }, include: draftInclude });
    return mapDraft(row, database);
  });
};
export const deleteDraft = async (id: string, actor: AccessContext): Promise<void> => {
  assertCandidateAccess(actor, PERMISSIONS.APPLICATION_CREATE_OWN);
  await applicationTransaction(async database => { await ownedDraft(database, id, actor); await database.applicationDrafts.delete({ where: { id } }); });
};
/** Submission, status history, notification and encrypted outbox entry commit or roll back together. */
export const submitApplication = async (draftId: string, version: number, actor: AccessContext): Promise<Application> => {
  assertCandidateAccess(actor, PERMISSIONS.APPLICATION_CREATE_OWN);
  return applicationTransaction(async database => {
    const sent = await database.applications.findUnique({ where: { submissionKey: draftId }, include: includes });
    if (sent) { if (sent.userId !== actor.userId) throw new AppError(404, 'El borrador no existe.'); return mapApplication(sent, database, await statusCatalog(database)); }
    const draft = await ownedDraft(database, draftId, actor);
    if (draft.version !== version) throw new AppError(409, 'El borrador cambió. Recarga antes de enviar.');
    const data = finalApplicationDataSchema.parse(draft.data);
    const key = draftKey(draft); const opportunity = await available(database, key);
    const attemptNumber = await allowAttempt(database, key, actor.userId);
    if (['EMPLOYMENT','INTERNSHIP'].includes(opportunity.kind) && !draft.resumeId) {
      throw new z.ZodError([{ code: 'custom', path: ['resumeId'], message: 'Esta vacante requiere un CV.' }]);
    }
    if (draft.resumeId) {
      const file = await assertResume(database, draft.resumeId, actor);
      const storage = getResumeStorage();
      try { await storage.get(file.filePath); } catch { throw new AppError(503, 'El CV no está disponible. Tu borrador se conserva.'); }
    }
    const user = await database.user.findUniqueOrThrow({ where: { id: actor.userId }, select: { email: true } });
    const profile = profileSnapshot(draft.profileSnapshot);
    let registrationId: number | undefined;
    if (draft.volunteerOpportunityId) {
      const registration = await database.volunteerRegistrations.upsert({ where: { volunteerOpportunityId_userId: {
        volunteerOpportunityId: draft.volunteerOpportunityId, userId: actor.userId } },
        update: {}, create: { volunteerOpportunityId: draft.volunteerOpportunityId, userId: actor.userId } });
      registrationId = registration.id;
    }
    const row = await database.applications.create({ data: {
      userId: actor.userId, jobId: draft.jobId, volunteerRegistrationId: registrationId, attemptNumber, submissionKey: draftId,
      referenceNumber: 'FQA-' + new Date().getUTCFullYear() + '-' + randomUUID(),
      submittedData: json(data), profileSnapshot: profile ? json({ ...profile, email: user.email }) : Prisma.JsonNull, opportunitySnapshot: json(opportunity), resumeId: draft.resumeId,
      statusId: (await database.applicationStatuses.findUniqueOrThrow({ where: { name: APPLICATION_STATUS_NAMES.PENDING } })).id,
    }, include: includes });
    await database.applicationStatusHistory.create({ data: { applicationId: row.id, changedBy: actor.userId, newStatusId: row.statusId } });
    await database.auditLogs.create({ data: { userId: actor.userId, entityType: 'Application', entityId: row.id, action: 'SUBMIT', changes: { opportunityKey: key, attemptNumber } } });
    const eventKey = 'application:' + row.id + ':submitted';
    await database.notifications.create({ data: { userId: actor.userId, applicationId: row.id, eventKey,
      title: 'Postulación recibida', message: 'Recibimos tu postulación a ' + opportunity.title + '. Referencia: ' + row.referenceNumber } });
    await enqueueApplicationConfirmation(database, { eventKey, recipientEmail: user.email, candidateName: data.personal.firstName + ' ' + data.personal.lastName,
      opportunityTitle: opportunity.title, opportunityType: emailKind(opportunity.kind), referenceNumber: row.referenceNumber });
    await database.applicationDrafts.delete({ where: { id: draftId } });
    return mapApplication(await database.applications.findUniqueOrThrow({ where: { id: row.id }, include: includes }), database, await statusCatalog(database));
  });
};
const emailKind = (kind: Opportunity['kind']) => ({ EMPLOYMENT: 'EMPLEO', VOLUNTEER: 'VOLUNTARIADO', SOCIAL_HOURS: 'HORAS_SOCIALES', INTERNSHIP: 'PRACTICA' } as const)[kind];
/** Filters run in PostgreSQL; candidate identities are always constrained by the authenticated owner. */
const filterWhere = (query: ApplicationFilters, actor: AccessContext, admin: boolean): Prisma.ApplicationsWhereInput => {
  const and: Prisma.ApplicationsWhereInput[] = [];
  if (query.kind) and.push(query.kind === 'VOLUNTEER' ? { volunteerRegistrationId: { not: null } } : { jobs: { kind: query.kind } });
  if (query.opportunityKey) and.push(target(query.opportunityKey));
  if (query.organizationId) and.push({ OR: [{ jobs: { organizationId: query.organizationId } }, { volunteerRegistrations: { volunteerOpportunities: { organizationId: query.organizationId } } }] });
  if (query.search) and.push({ OR: [
    { referenceNumber: { contains: query.search, mode: 'insensitive' } },
    { users: { OR: [{ email: { contains: query.search, mode: 'insensitive' } }, { profile: { OR: [{ firstName: { contains: query.search, mode: 'insensitive' } }, { lastName: { contains: query.search, mode: 'insensitive' } }] } }] } },
    { jobs: { title: { contains: query.search, mode: 'insensitive' } } },
    { volunteerRegistrations: { volunteerOpportunities: { title: { contains: query.search, mode: 'insensitive' } } } },
    { submittedData: { path: ['personal','firstName'], string_contains: query.search } },
    { submittedData: { path: ['personal','lastName'], string_contains: query.search } },
  ] });
  return { ...(admin ? (query.candidateId ? { userId: query.candidateId } : {}) : { userId: actor.userId }),
    ...(query.status ? { applicationStatuses: { name: APPLICATION_STATUS_NAMES[query.status] } } : {}),
    ...(query.from || query.to ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to + 'T23:59:59.999Z') } : {}) } } : {}),
    AND: and };
};
const assertRead = (actor: AccessContext, admin: boolean): void => {
  if (admin) assertVacancyAccess(actor, PERMISSIONS.APPLICATION_READ_ANY);
  else assertCandidateAccess(actor, PERMISSIONS.APPLICATION_READ_OWN);
};
const authorizedApplication = async (database: Prisma.TransactionClient, id: number, actor: AccessContext, admin: boolean) => {
  const row = await database.applications.findFirst({ where: { id, ...(admin ? {} : { userId: actor.userId }) }, include: includes });
  if (!row) throw new AppError(404, 'La postulación no existe.');
  return row;
};
export const listApplications = async (query: ApplicationFilters, actor: AccessContext, admin = false) => {
  assertRead(actor, admin);
  return prisma.$transaction(async database => {
    const where = filterWhere(query, actor, admin);
    const [rows, total, catalog] = await Promise.all([
      database.applications.findMany({ where, include: includes, orderBy: [{ createdAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      database.applications.count({ where }), statusCatalog(database),
    ]);
    return { items: await Promise.all(rows.map(row => mapApplication(row, database, catalog))), total, page: query.page, pageSize: query.pageSize };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
};
export const getApplication = async (id: number, actor: AccessContext, admin = false): Promise<Application> => {
  assertRead(actor, admin);
  return mapApplication(await authorizedApplication(prisma, id, actor, admin), prisma, await statusCatalog(prisma));
};
/** Terminal decisions cannot be edited; optimistic versions prevent two administrators overwriting each other. */
export const changeApplicationStatus = async (id: number, status: Exclude<ApplicationStatus, 'PENDING'>, version: number, reason: string | undefined, actor: AccessContext): Promise<Application> => {
  const admin = status !== 'WITHDRAWN';
  if (admin) assertVacancyAccess(actor, PERMISSIONS.APPLICATION_SELECT);
  else assertCandidateAccess(actor, PERMISSIONS.APPLICATION_WITHDRAW_OWN);
  return applicationTransaction(async database => {
    const before = await authorizedApplication(database, id, actor, admin);
    if (before.version !== version) throw new AppError(409, 'El estado cambió. Recarga antes de continuar.');
    if (!['PENDING','IN_REVIEW'].includes(applicationStatusFor(before.applicationStatuses.name))) throw new AppError(409, 'La postulación ya finalizó.');
    if (status === 'IN_REVIEW' && applicationStatusFor(before.applicationStatuses.name) !== 'PENDING') throw new AppError(409, 'La postulación ya está en revisión.');
    const key = applicationKey(before);
    const current = await readApplicationOpportunity(key, database);
    if (status === 'SELECTED') {
      if (current.archivedAt) throw new AppError(409, 'No puedes seleccionar candidatos de una vacante archivada.');
      if (current.slots !== null && await selectedCount(database, key) >= current.slots) throw new AppError(409, 'No quedan cupos disponibles.');
    }
    const row = await database.applications.update({ where: { id }, data: { version: { increment: 1 },
      applicationStatuses: { connect: { name: APPLICATION_STATUS_NAMES[status] } } }, include: includes });
    await database.applicationStatusHistory.create({ data: { applicationId: id, changedBy: actor.userId, oldStatusId: before.statusId, newStatusId: row.statusId, reason: reason || null } });
    await database.auditLogs.create({ data: { userId: actor.userId, entityType: 'Application', entityId: id, action: status, changes: { from: before.applicationStatuses.name, to: row.applicationStatuses.name } } });
    if (status === 'SELECTED' && current.slots !== null && await selectedCount(database, key) >= current.slots && current.status !== 'CLOSED') {
      const data = { statusId: current.kind === 'VOLUNTEER'
        ? (await database.volunteerStatuses.findUniqueOrThrow({ where: { name: OPPORTUNITY_STATUS_NAMES.CLOSED } })).id
        : (await database.jobStatuses.findUniqueOrThrow({ where: { name: OPPORTUNITY_STATUS_NAMES.CLOSED } })).id };
      if (current.kind === 'VOLUNTEER') await database.volunteerOpportunities.update({ where: { id: current.id }, data });
      else await database.jobs.update({ where: { id: current.id }, data });
      await database.auditLogs.create({ data: { userId: actor.userId, entityType: current.kind === 'VOLUNTEER' ? 'VolunteerOpportunity' : 'Job', entityId: current.id, action: 'CLOSE', changes: { reason: 'CAPACITY_FULL', applicationId: id } } });
    }
    const result = await mapApplication(row, database, await statusCatalog(database));
    const eventKey = 'application:' + id + ':version:' + row.version;
    await database.notifications.create({ data: { userId: row.userId, applicationId: id, eventKey,
      title: 'Estado de postulación actualizado', message: result.opportunity.title + ': ' + row.applicationStatuses.name + (reason ? '. ' + reason : '') } });
    if (status === 'SELECTED' || status === 'REJECTED') await enqueueApplicationDecision(database, {
      eventKey, recipientEmail: row.users.email, candidateName: result.candidateName, opportunityTitle: result.opportunity.title,
      opportunityType: emailKind(result.opportunity.kind), referenceNumber: row.referenceNumber, reason,
    }, status === 'SELECTED' ? 'APPROVED' : 'REJECTED');
    return mapApplication(await database.applications.findUniqueOrThrow({ where: { id }, include: includes }), database, await statusCatalog(database));
  });
};
/** Aggregates use all filtered records, never a truncated frontend page. */
export const applicationStatistics = async (query: ApplicationFilters, actor: AccessContext) => {
  assertVacancyAccess(actor, PERMISSIONS.APPLICATION_READ_ANY);
  return prisma.$transaction(async database => {
    const where = filterWhere(query, actor, true);
    const [groups, candidates, withResume, catalog] = await Promise.all([
      database.applications.groupBy({ by: ['statusId'], where, _count: true }),
      database.applications.groupBy({ by: ['userId'], where }), database.applications.count({ where: { AND: [where, { OR: [{ resumeId: { not: null } }, { applicationFiles: { some: { files: { fileType: 'RESUME' } } } }] }] } }),
      statusCatalog(database),
    ]);
    return { total: groups.reduce((sum, group) => sum + group._count, 0), candidates: candidates.length, withResume,
      states: groups.map(group => ({ status: applicationStatusFor(catalog.get(group.statusId) ?? ''), count: group._count })) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
};
/** Downloads return immutable submitted bytes; document ownership is never inferred from a public file ID. */
export const downloadApplicationResume = async (id: number | string, actor: AccessContext, admin = false, draft = false) => {
  if (admin) { assertVacancyAccess(actor, PERMISSIONS.APPLICATION_READ_ANY); assertVacancyAccess(actor, PERMISSIONS.APPLICATION_RESUME_READ_ANY); }
  else assertCandidateAccess(actor, PERMISSIONS.APPLICATION_READ_OWN);
  const row = draft ? await ownedDraft(prisma, String(id), actor) : await authorizedApplication(prisma, Number(id), actor, admin);
  const file = 'applicationFiles' in row ? submittedResume(row) : row.files;
  if (!file) throw new AppError(404, 'Esta postulación no tiene CV.');
  const storage = getResumeStorage();
  try { return { name: file.originalName ?? 'curriculum.pdf', content: await storage.get(file.filePath) }; }
  catch { throw new AppError(503, 'No fue posible descargar el documento. Inténtalo más tarde.'); }
};
/** Service-level decision entry point also accepts only the validated administrative states. */
export const decideApplication = (id: number, payload: ApplicationDecision, actor: AccessContext) =>
  changeApplicationStatus(id, payload.status, payload.version, payload.reason, actor);
