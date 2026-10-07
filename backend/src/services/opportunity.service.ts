import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { PERMISSIONS } from '../constants/authorization.constants.js';
import { OPPORTUNITY_STATUS_NAMES, type OpportunityStatus, type OpportunityType } from '../constants/opportunity.constants.js';
import { ORGANIZATION_STATUS_NAMES } from '../constants/organization.constants.js';
import type { AccessContext } from '../types/authorization.types.js';
import type { CreateOpportunityDTO, OpportunityQuery, UpdateOpportunityDTO } from '../validation/opportunity.schema.js';
import { AppError } from '../utils/app-error.js';
import { assertVacancyAccess, mutateVacancy, vacancySlug } from './vacancy-policy.service.js';

/** Shared projection excludes candidates, files, user identities and internal audit records. */
const commonSelect = {
  id: true, title: true, slug: true, description: true, organizationId: true, categoryId: true, modality: true,
  slots: true, contact: true, requirements: true, responsibilities: true, benefits: true,
  createdAt: true, publishedAt: true, expiresAt: true, archivedAt: true,
  organizations: { select: { id: true, name: true, description: true, organizationStatuses: { select: { name: true } } } },
  jobCategories: { select: { id: true, name: true, isActive: true } },
  locations: { select: { department: true, municipality: true } },
};
/** Job-specific data retain contract and experience independently of kind and modality. */
const jobSelect = { ...commonSelect, kind: true, salaryMin: true, salaryMax: true, socialHours: true, duration: true,
  employmentTypeId: true, experienceLevelId: true,
  employmentTypes: { select: { id: true, name: true } }, experienceLevels: { select: { id: true, name: true } },
  jobStatuses: { select: { name: true } },
} satisfies Prisma.JobsSelect;
/** Volunteer registrations remain in their original relation. */
const volunteerSelect = { ...commonSelect, volunteerStatuses: { select: { name: true } } } satisfies Prisma.VolunteerOpportunitiesSelect;
/** Both persistence variants map to a discriminated public contract. */
type JobRow = Prisma.JobsGetPayload<{ select: typeof jobSelect }>;
type VolunteerRow = Prisma.VolunteerOpportunitiesGetPayload<{ select: typeof volunteerSelect }>;

/** Stable state conversion never treats an unknown historical label as published. */
const statusFor = (name: string): OpportunityStatus | 'UNKNOWN' =>
  (Object.keys(OPPORTUNITY_STATUS_NAMES) as OpportunityStatus[]).find((key) => OPPORTUNITY_STATUS_NAMES[key] === name) ?? 'UNKNOWN';
/** Produces one safe DTO without leaking internal status catalogs or registration counts publicly. */
const mapOpportunity = (row: JobRow | VolunteerRow) => {
  const job = 'kind' in row ? row : null;
  const kind: OpportunityType = job ? job.kind : 'VOLUNTEER';
  return {
    key: `${job ? 'job' : 'volunteer'}-${row.id}`, id: row.id, kind, title: row.title, slug: row.slug, description: row.description,
    organizationId: row.organizationId, organization: row.organizations ? { id: row.organizations.id, name: row.organizations.name, description: row.organizations.description } : null,
    categoryId: row.categoryId, category: row.jobCategories ? { id: row.jobCategories.id, name: row.jobCategories.name } : null,
    department: row.locations?.department ?? null, municipality: row.locations?.municipality ?? null,
    modality: row.modality, salaryMin: job?.salaryMin == null ? null : Number(job.salaryMin), salaryMax: job?.salaryMax == null ? null : Number(job.salaryMax),
    employmentTypeId: job?.employmentTypeId ?? null, employmentType: job?.employmentTypes?.name ?? null,
    experienceLevelId: job?.experienceLevelId ?? null, experienceLevel: job?.experienceLevels?.name ?? null,
    slots: row.slots, socialHours: job?.socialHours ?? null, duration: job?.duration ?? null, contact: row.contact,
    requirements: row.requirements, responsibilities: row.responsibilities, benefits: row.benefits,
    status: statusFor('jobStatuses' in row ? row.jobStatuses.name : row.volunteerStatuses.name),
    createdAt: row.createdAt?.toISOString() ?? null, publishedAt: row.publishedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null, archivedAt: row.archivedAt?.toISOString() ?? null,
  };
};
/** Returned vacancy payload after type-specific persistence is normalized. */
export type Opportunity = ReturnType<typeof mapOpportunity>;
/** Finds either source inside the caller's transaction. */
const findRow = async (key: string, database: Prisma.TransactionClient = prisma): Promise<JobRow | VolunteerRow> => {
  const id = Number(key.split('-')[1]);
  const row = key.startsWith('job-')
    ? await database.jobs.findUnique({ where: { id }, select: jobSelect })
    : await database.volunteerOpportunities.findUnique({ where: { id }, select: volunteerSelect });
  if (!row) throw new AppError(404, 'La vacante no existe.');
  return row;
};
/** The public contract includes only published, current, non-archived, eligible records. */
const publicWhere = (now: Date) => ({
  archivedAt: null, publishedAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  organizations: { organizationStatuses: { name: ORGANIZATION_STATUS_NAMES.ACTIVE } },
  jobCategories: { isActive: true },
});
/** Filters each source in SQL, then merges bounded prefixes for correctly ordered mixed-source pages. */
export const listOpportunities = async (query: OpportunityQuery, actor?: AccessContext) => {
  if (actor) assertVacancyAccess(actor, PERMISSIONS.OPPORTUNITY_READ);
  const now = new Date();
  const common = {
    ...(actor ? (query.status === 'ARCHIVED' ? {} : { archivedAt: null }) : publicWhere(now)),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.organizationId ? { organizationId: query.organizationId } : {}),
    ...(query.search ? { AND: [{ OR: [{ title: { contains: query.search, mode: 'insensitive' as const } }, { organizations: { name: { contains: query.search, mode: 'insensitive' as const } } }] }] } : {}),
    ...(query.location ? { locations: { OR: [{ department: { contains: query.location, mode: 'insensitive' as const } }, { municipality: { contains: query.location, mode: 'insensitive' as const } }] } } : {}),
  };
  const state = actor ? query.status : 'OPEN';
  const jobWhere: Prisma.JobsWhereInput = { ...common,
    ...(state ? { jobStatuses: { name: OPPORTUNITY_STATUS_NAMES[state] } } : {}),
    ...(query.kind && query.kind !== 'VOLUNTEER' ? { kind: query.kind } : {}),
    ...(query.salaryMax != null ? { AND: [ ...(common.AND ?? []), { OR: [{ salaryMax: { lte: query.salaryMax } }, { salaryMax: null, salaryMin: { lte: query.salaryMax } }] }] } : {}),
  };
  const volunteerWhere: Prisma.VolunteerOpportunitiesWhereInput = { ...common,
    ...(state ? { volunteerStatuses: { name: OPPORTUNITY_STATUS_NAMES[state] } } : {}),
  };
  const includeJobs = query.kind !== 'VOLUNTEER';
  const includeVolunteers = (!query.kind || query.kind === 'VOLUNTEER') && query.salaryMax == null;
  const prefix = query.page * query.pageSize;
  return prisma.$transaction(async (database) => {
    const [jobs, volunteers, jobCount, volunteerCount] = await Promise.all([
      includeJobs ? database.jobs.findMany({ where: jobWhere, select: { id: true, createdAt: true }, orderBy: [{ createdAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }], take: prefix }) : [],
      includeVolunteers ? database.volunteerOpportunities.findMany({ where: volunteerWhere, select: { id: true, createdAt: true }, orderBy: [{ createdAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }], take: prefix }) : [],
      includeJobs ? database.jobs.count({ where: jobWhere }) : 0,
      includeVolunteers ? database.volunteerOpportunities.count({ where: volunteerWhere }) : 0,
    ]);
    // Merge identities only: long descriptions and lists are loaded just for the requested page.
    const ranked = [
      ...jobs.map((row) => ({ ...row, key: 'job-' + row.id, volunteer: false })),
      ...volunteers.map((row) => ({ ...row, key: 'volunteer-' + row.id, volunteer: true })),
    ].sort((a, b) => (b.createdAt?.toISOString() ?? '').localeCompare(a.createdAt?.toISOString() ?? '') || b.id - a.id || a.key.localeCompare(b.key))
      .slice(prefix - query.pageSize, prefix);
    const jobIds = ranked.filter((row) => !row.volunteer).map((row) => row.id);
    const volunteerIds = ranked.filter((row) => row.volunteer).map((row) => row.id);
    const [jobRows, volunteerRows] = await Promise.all([
      jobIds.length ? database.jobs.findMany({ where: { id: { in: jobIds } }, select: jobSelect }) : [],
      volunteerIds.length ? database.volunteerOpportunities.findMany({ where: { id: { in: volunteerIds } }, select: volunteerSelect }) : [],
    ]);
    const byKey = new Map([...jobRows.map(mapOpportunity), ...volunteerRows.map(mapOpportunity)].map((value) => [value.key, value]));
    return { items: ranked.map((row) => byKey.get(row.key)!), total: jobCount + volunteerCount, page: query.page, pageSize: query.pageSize };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
};
/** Revalidates visibility on detail requests, including expiration after a listing was loaded. */
export const getOpportunity = async (key: string, actor?: AccessContext): Promise<Opportunity> => {
  if (actor) assertVacancyAccess(actor, PERMISSIONS.OPPORTUNITY_READ);
  const row = await findRow(key);
  const value = mapOpportunity(row);
  if (!actor && (value.status !== 'OPEN' || !row.publishedAt || row.publishedAt > new Date() || row.archivedAt ||
    (row.expiresAt && row.expiresAt <= new Date()) || row.organizations?.organizationStatuses.name !== ORGANIZATION_STATUS_NAMES.ACTIVE || !row.jobCategories?.isActive)) {
    throw new AppError(404, 'La vacante no está disponible.');
  }
  return value;
};
/** Required publication fields become per-field errors; partial drafts remain editable. */
const validatePublication = (value: Opportunity, row: JobRow | VolunteerRow): void => {
  const issues: z.ZodIssue[] = [];
  const requireField = (valid: boolean, field: string, message: string): void => { if (!valid) issues.push({ code: 'custom', path: [field], message }); };
  requireField(value.description.length >= 20, 'description', 'Para publicar, escribe al menos 20 caracteres de descripción.');
  requireField(row.organizations?.organizationStatuses.name === ORGANIZATION_STATUS_NAMES.ACTIVE, 'organizationId', 'Selecciona una organización activa.');
  requireField(row.jobCategories?.isActive === true, 'categoryId', 'Selecciona una categoría activa.');
  requireField(Boolean(value.department && value.municipality), 'municipality', 'Completa departamento y municipio.');
  requireField(!row.expiresAt || row.expiresAt > new Date(), 'expiresAt', 'La fecha de cierre debe ser futura.');
  if (value.kind === 'EMPLOYMENT') requireField(value.employmentTypeId != null, 'employmentTypeId', 'Selecciona la jornada o contrato.');
  if (value.kind === 'SOCIAL_HOURS') requireField(value.socialHours != null, 'socialHours', 'Indica las horas sociales.');
  if (value.kind === 'INTERNSHIP') requireField(Boolean(value.duration), 'duration', 'Indica la duración de la práctica.');
  if (issues.length) throw new z.ZodError(issues);
};
/** Explicit references cannot target a missing record, even for incomplete drafts. */
const prepareData = async (payload: CreateOpportunityDTO | UpdateOpportunityDTO, before: Opportunity | null, database: Prisma.TransactionClient) => {
  const kind = before?.kind ?? ('kind' in payload ? payload.kind : 'EMPLOYMENT');
  if (kind !== 'EMPLOYMENT' && (payload.salaryMin != null || payload.salaryMax != null || payload.employmentTypeId != null)) throw new AppError(400, 'El salario y contrato solo corresponden a empleos.');
  if (kind !== 'SOCIAL_HOURS' && payload.socialHours != null) throw new AppError(400, 'Las horas sociales solo corresponden a ese tipo de vacante.');
  if (kind !== 'INTERNSHIP' && payload.duration) throw new AppError(400, 'La duración corresponde a las prácticas.');
  if (kind === 'VOLUNTEER' && payload.experienceLevelId != null) throw new AppError(400, 'El nivel de experiencia no corresponde a voluntariado.');
  for (const [field, exists] of [
    ['organizationId', payload.organizationId == null || Boolean(await database.organizations.findUnique({ where: { id: payload.organizationId } }))],
    ['categoryId', payload.categoryId == null || Boolean(await database.jobCategories.findUnique({ where: { id: payload.categoryId } }))],
    ['employmentTypeId', payload.employmentTypeId == null || Boolean(await database.employmentTypes.findUnique({ where: { id: payload.employmentTypeId } }))],
    ['experienceLevelId', payload.experienceLevelId == null || Boolean(await database.experienceLevels.findUnique({ where: { id: payload.experienceLevelId } }))],
  ] as const) { if (!exists) throw new z.ZodError([{ code: 'custom', path: [field], message: 'El registro seleccionado no existe.' }]); }
  const department = payload.department === undefined ? before?.department : payload.department;
  const municipality = payload.municipality === undefined ? before?.municipality : payload.municipality;
  let locationId: number | null | undefined;
  if (payload.department !== undefined || payload.municipality !== undefined) {
    if (Boolean(department) !== Boolean(municipality)) throw new z.ZodError([{ code: 'custom', path: [department ? 'municipality' : 'department'], message: 'Completa departamento y municipio, o deja ambos vacíos.' }]);
    locationId = null;
    if (department && municipality) {
      const location = await database.locations.findFirst({ where: { department: { equals: department, mode: 'insensitive' }, municipality: { equals: municipality, mode: 'insensitive' } }, orderBy: { id: 'asc' } })
        ?? await database.locations.create({ data: { department, municipality } });
      locationId = location.id;
    }
  }
  const min = payload.salaryMin === undefined ? before?.salaryMin : payload.salaryMin;
  const max = payload.salaryMax === undefined ? before?.salaryMax : payload.salaryMax;
  if (min != null && max != null && min > max) throw new z.ZodError([{ code: 'custom', path: ['salaryMax'], message: 'El salario máximo debe ser mayor o igual al mínimo.' }]);
  return {
    title: payload.title, description: payload.description, organizationId: payload.organizationId, categoryId: payload.categoryId, locationId,
    modality: payload.modality, slots: payload.slots, contact: payload.contact || (payload.contact === undefined ? undefined : null),
    requirements: payload.requirements, responsibilities: payload.responsibilities, benefits: payload.benefits,
    expiresAt: payload.expiresAt === undefined ? undefined : payload.expiresAt === null ? null : new Date(payload.expiresAt + 'T23:59:59.999Z'),
  };
};
/** Audit stays inside the business transaction; no candidate details are included. */
const audit = (database: Prisma.TransactionClient, actor: AccessContext, action: string, before: Opportunity | null, after: Opportunity) =>
  database.auditLogs.create({ data: { userId: actor.userId, entityType: after.kind === 'VOLUNTEER' ? 'VolunteerOpportunity' : 'Job', entityId: after.id, action, changes: { before, after } } });
/** Creates only drafts; publishing is a separate, privileged transition. */
export const createOpportunity = async (payload: CreateOpportunityDTO, actor: AccessContext): Promise<Opportunity> => {
  assertVacancyAccess(actor, PERMISSIONS.OPPORTUNITY_CREATE);
  return mutateVacancy(async (database) => {
    const data = await prepareData(payload, null, database);
    const slug = vacancySlug(payload.title).slice(0, 140) + '-' + randomUUID();
    const state = payload.kind === 'VOLUNTEER'
      ? await database.volunteerStatuses.findUnique({ where: { name: OPPORTUNITY_STATUS_NAMES.DRAFT } })
      : await database.jobStatuses.findUnique({ where: { name: OPPORTUNITY_STATUS_NAMES.DRAFT } });
    if (!state) throw new AppError(503, 'Los catálogos de vacantes no están preparados. Ejecuta el seed.');
    const row = payload.kind === 'VOLUNTEER'
      ? await database.volunteerOpportunities.create({ data: { ...data, title: payload.title, description: payload.description ?? '', slug, statusId: state.id }, select: volunteerSelect })
      : await database.jobs.create({ data: { ...data, title: payload.title, description: payload.description ?? '', slug, kind: payload.kind, salaryMin: payload.salaryMin, salaryMax: payload.salaryMax, socialHours: payload.socialHours, duration: payload.duration, employmentTypeId: payload.employmentTypeId, experienceLevelId: payload.experienceLevelId, statusId: state.id }, select: jobSelect });
    const result = mapOpportunity(row);
    await audit(database, actor, 'CREATE', null, result);
    return result;
  });
};
/** Editing preserves omitted data, table identity, application history and current lifecycle. */
export const updateOpportunity = async (key: string, payload: UpdateOpportunityDTO, actor: AccessContext): Promise<Opportunity> => {
  assertVacancyAccess(actor, PERMISSIONS.OPPORTUNITY_UPDATE);
  return mutateVacancy(async (database) => {
    const before = mapOpportunity(await findRow(key, database));
    if (before.archivedAt) throw new AppError(409, 'Las vacantes archivadas no se pueden editar.');
    const data = await prepareData(payload, before, database);
    const row = before.kind === 'VOLUNTEER'
      ? await database.volunteerOpportunities.update({ where: { id: before.id }, data, select: volunteerSelect })
      : await database.jobs.update({ where: { id: before.id }, data: { ...data, salaryMin: payload.salaryMin, salaryMax: payload.salaryMax, socialHours: payload.socialHours, duration: payload.duration, employmentTypeId: payload.employmentTypeId, experienceLevelId: payload.experienceLevelId }, select: jobSelect });
    const after = mapOpportunity(row);
    if (after.status === 'OPEN') validatePublication(after, row);
    if (before.kind !== 'VOLUNTEER') {
      const revision = await database.jobRevisions.aggregate({ where: { jobId: before.id }, _max: { revisionNumber: true } });
      await database.jobRevisions.create({ data: { jobId: before.id, changedBy: actor.userId, revisionNumber: (revision._max.revisionNumber ?? 0) + 1, title: after.title, description: after.description } });
    }
    await audit(database, actor, 'UPDATE', before, after);
    return after;
  });
};
/** Publish/close/archive are atomic and idempotent; archiving never deletes related applications. */
export const changeOpportunityStatus = async (key: string, status: 'OPEN' | 'CLOSED' | 'ARCHIVED', actor: AccessContext): Promise<Opportunity> => {
  assertVacancyAccess(actor, status === 'ARCHIVED' ? PERMISSIONS.OPPORTUNITY_ARCHIVE : PERMISSIONS.OPPORTUNITY_STATUS_UPDATE);
  return mutateVacancy(async (database) => {
    const original = await findRow(key, database);
    const before = mapOpportunity(original);
    if (before.status === status) return before;
    if (before.archivedAt) throw new AppError(409, 'La vacante ya está archivada.');
    if (status === 'CLOSED' && before.status !== 'OPEN') throw new AppError(409, 'Solo puedes cerrar una vacante publicada.');
    if (status === 'OPEN') validatePublication(before, original);
    const data = { publishedAt: status === 'OPEN' ? (original.publishedAt ?? new Date()) : undefined, archivedAt: status === 'ARCHIVED' ? new Date() : undefined };
    const row = before.kind === 'VOLUNTEER'
      ? await database.volunteerOpportunities.update({ where: { id: before.id }, data: { ...data, volunteerStatuses: { connect: { name: OPPORTUNITY_STATUS_NAMES[status] } } }, select: volunteerSelect })
      : await database.jobs.update({ where: { id: before.id }, data: { ...data, jobStatuses: { connect: { name: OPPORTUNITY_STATUS_NAMES[status] } } }, select: jobSelect });
    const after = mapOpportunity(row);
    await audit(database, actor, status === 'OPEN' ? 'PUBLISH' : status === 'CLOSED' ? 'CLOSE' : 'ARCHIVE', before, after);
    return after;
  });
};
