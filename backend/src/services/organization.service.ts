import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { PERMISSIONS, type PermissionCode } from '../constants/authorization.constants.js';
import { ORGANIZATION_STATUS_NAMES, type OrganizationStatusCode } from '../constants/organization.constants.js';
import type { AccessContext } from '../types/authorization.types.js';
import type { ManagedOrganization, OrganizationListResponse } from '../types/organization.types.js';
import type { CreateOrganizationDTO, ListOrganizationsQuery, UpdateOrganizationDTO } from '../validation/organization.schema.js';
import { AppError } from '../utils/app-error.js';
import { assertPermission } from './authorization.service.js';

/** Explicit projection excludes historical memberships and other related resources. */
const organizationSelect = {
  id: true, name: true, description: true, email: true, createdAt: true,
  organizationStatuses: { select: { name: true } },
} satisfies Prisma.OrganizationsSelect;
/** Storage projection before converting catalog labels and dates to the public contract. */
type OrganizationRow = Prisma.OrganizationsGetPayload<{ select: typeof organizationSelect }>;

/** Enforces both the administrative role boundary and the current operation grant. */
export const assertOrganizationAccess = (actor: AccessContext, permission: PermissionCode): void => {
  if (!actor.roles.some((role) => role === 'ADMINISTRATOR' || role === 'SUPER_ADMIN')) {
    throw new AppError(403, 'Solo los administradores pueden gestionar organizaciones.');
  }
  assertPermission(actor, permission);
};

/** Maps catalog labels without silently misclassifying an unsupported historical state. */
const toManagedOrganization = (row: OrganizationRow): ManagedOrganization => {
  const status = (Object.keys(ORGANIZATION_STATUS_NAMES) as OrganizationStatusCode[])
    .find((code) => ORGANIZATION_STATUS_NAMES[code] === row.organizationStatuses.name);
  if (!status) throw new AppError(500, 'El estado de la organización no está configurado.');
  return {
    id: row.id, name: row.name, description: row.description, email: row.email,
    status, createdAt: row.createdAt?.toISOString() ?? null,
  };
};

/** Reads the requested record inside the caller's transaction when provided. */
const findOrganization = async (
  id: number, database: Prisma.TransactionClient = prisma,
): Promise<ManagedOrganization> => {
  const row = await database.organizations.findUnique({ where: { id }, select: organizationSelect });
  if (!row) throw new AppError(404, 'La organización no existe.');
  return toManagedOrganization(row);
};

/** Retries serialization conflicts so concurrent state repeats do not duplicate audit entries. */
const mutateOrganization = async <T>(
  operation: (database: Prisma.TransactionClient) => Promise<T>,
): Promise<T> => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new AppError(409, 'Ya existe una organización con ese nombre.');
        if (error.code === 'P2034') {
          if (attempt < 2) continue;
          throw new AppError(409, 'La organización cambió durante la operación. Intenta nuevamente.');
        }
      }
      throw error;
    }
  }
  throw new AppError(409, 'No se pudo completar el cambio de la organización.');
};

/** Records only public before/after values in the same transaction as the mutation. */
const auditOrganization = async (
  database: Prisma.TransactionClient, actor: AccessContext, action: 'CREATE' | 'UPDATE' | 'ENABLE' | 'DISABLE',
  before: ManagedOrganization | null, after: ManagedOrganization,
): Promise<void> => {
  await database.auditLogs.create({
    data: {
      userId: actor.userId, entityType: 'Organization', entityId: after.id, action,
      changes: { before: before ? { ...before } : null, after: { ...after } },
    },
  });
};

/** Returns a stable page and a consistent total using the same name/email and state filters. */
export const listOrganizations = async (
  query: ListOrganizationsQuery, actor: AccessContext,
): Promise<OrganizationListResponse> => {
  assertOrganizationAccess(actor, PERMISSIONS.ORGANIZATION_READ);
  const where: Prisma.OrganizationsWhereInput = {
    ...(query.search ? { OR: [
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ] } : {}),
    ...(query.status ? { organizationStatuses: { name: ORGANIZATION_STATUS_NAMES[query.status] } } : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.organizations.findMany({
      where, select: organizationSelect, orderBy: { id: 'asc' },
      skip: (query.page - 1) * query.pageSize, take: query.pageSize,
    }),
    prisma.organizations.count({ where }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return { items: rows.map(toManagedOrganization), total, page: query.page, pageSize: query.pageSize };
};

/** Reads active or inactive organizations without exposing linked records. */
export const getOrganization = async (id: number, actor: AccessContext): Promise<ManagedOrganization> => {
  assertOrganizationAccess(actor, PERMISSIONS.ORGANIZATION_READ);
  return findOrganization(id);
};

/** Creates an active organization and its audit without creating accounts or memberships. */
export const createOrganization = async (
  payload: CreateOrganizationDTO, actor: AccessContext,
): Promise<ManagedOrganization> => {
  assertOrganizationAccess(actor, PERMISSIONS.ORGANIZATION_CREATE);
  return mutateOrganization(async (database) => {
    const row = await database.organizations.create({
      data: {
        name: payload.name, description: payload.description, email: payload.email,
        organizationStatuses: { connect: { name: ORGANIZATION_STATUS_NAMES.ACTIVE } },
      },
      select: organizationSelect,
    });
    const organization = toManagedOrganization(row);
    await auditOrganization(database, actor, 'CREATE', null, organization);
    return organization;
  });
};

/** Changes only allowlisted contact fields and preserves omitted values and related records. */
export const updateOrganization = async (
  id: number, payload: UpdateOrganizationDTO, actor: AccessContext,
): Promise<ManagedOrganization> => {
  assertOrganizationAccess(actor, PERMISSIONS.ORGANIZATION_UPDATE);
  return mutateOrganization(async (database) => {
    const before = await findOrganization(id, database);
    const row = await database.organizations.update({
      where: { id },
      data: { name: payload.name, description: payload.description, email: payload.email },
      select: organizationSelect,
    });
    const after = toManagedOrganization(row);
    await auditOrganization(database, actor, 'UPDATE', before, after);
    return after;
  });
};

/** Idempotent transition; jobs, volunteers, files and historical memberships stay untouched. */
export const changeOrganizationStatus = async (
  id: number, status: OrganizationStatusCode, actor: AccessContext,
): Promise<void> => {
  assertOrganizationAccess(actor, PERMISSIONS.ORGANIZATION_STATUS_UPDATE);
  await mutateOrganization(async (database) => {
    const before = await findOrganization(id, database);
    if (before.status === status) return;
    const row = await database.organizations.update({
      where: { id }, data: { organizationStatuses: { connect: { name: ORGANIZATION_STATUS_NAMES[status] } } },
      select: organizationSelect,
    });
    await auditOrganization(database, actor, status === 'ACTIVE' ? 'ENABLE' : 'DISABLE',
      before, toManagedOrganization(row));
  });
};
