import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma.js';
import { PASSWORD_HASH_ROUNDS } from '../constants/auth.constants.js';
import { PERMISSIONS, ROLE_NAMES, roleCodeFor, type RoleCode } from '../constants/authorization.constants.js';
import { USER_STATUS_NAMES } from '../constants/user.constants.js';
import type { AccessContext } from '../types/authorization.types.js';
import type { ManagedUser, UserListResponse } from '../types/admin-user.types.js';
import type { CreateUserDTO, ListUsersQuery, UpdateUserDTO } from '../validation/admin-user.schema.js';
import { AppError } from '../utils/app-error.js';
import { splitProfileName } from '../utils/profile-name.js';
import { assertCanCreateAccount, assertPermission } from './authorization.service.js';

/** Allowlisted identity fields; never includes authentication credentials. */
const userSelect = {
  id: true, email: true, createdAt: true,
  profile: { select: { firstName: true, lastName: true } },
  status: { select: { name: true } },
  userRoles: { select: { roles: { select: { name: true } } } },
} satisfies Prisma.UserSelect;
type AccountRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;

/** Translates database labels to the stable management contract. */
const toManagedUser = (account: AccountRow): ManagedUser => ({
  id: account.id, email: account.email,
  fullName: account.profile
    ? [account.profile.firstName, account.profile.lastName].filter(Boolean).join(' ') : account.email,
  roles: account.userRoles.map(({ roles }) => roleCodeFor(roles.name))
    .filter((role): role is RoleCode => role !== undefined).sort(),
  status: account.status.name === USER_STATUS_NAMES.ACTIVE ? 'ACTIVE' : 'DISABLED',
  createdAt: account.createdAt?.toISOString() ?? null,
});

/** Keeps the Super Admin boundary even when services are reused outside these routes. */
const requireSuperAdmin = (access: AccessContext): void => {
  if (!access.roles.includes('SUPER_ADMIN')) {
    throw new AppError(403, 'Solo Super Admin puede gestionar usuarios.');
  }
};

/** Requires an administrative role independently of any accidentally assigned grants. */
const requireAdministrator = (access: AccessContext): void => {
  if (!access.roles.some((role) => role === 'SUPER_ADMIN' || role === 'ADMINISTRATOR')) {
    throw new AppError(403, 'Solo los administradores pueden consultar o crear usuarios.');
  }
};

/** Converts expected database conflicts without exposing raw queries or credentials. */
const rethrowConflict = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002' && Array.isArray(error.meta?.target) && error.meta.target.includes('email')) {
      throw new AppError(409, 'Ya existe una cuenta con este correo electrónico.');
    }
    if (error.code === 'P2034') {
      throw new AppError(409, 'La cuenta cambió mientras guardabas. Actualiza la lista e inténtalo de nuevo.');
    }
  }
  throw error;
};

/** Lists non-deleted accounts with a consistent count and stable ordering. */
export const listUsers = async (query: ListUsersQuery, actor: AccessContext): Promise<UserListResponse> => {
  requireAdministrator(actor);
  const isSuperAdmin = actor.roles.includes('SUPER_ADMIN');
  assertPermission(actor, isSuperAdmin ? PERMISSIONS.USERS_READ : PERMISSIONS.CANDIDATE_READ);
  if (!isSuperAdmin && query.role && query.role !== 'CANDIDATE') {
    throw new AppError(403, 'Solo puedes consultar cuentas de candidatos.');
  }
  const words = query.search?.split(/\s+/).filter(Boolean) ?? [];
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(!isSuperAdmin ? {
      // Exclude accounts with any additional role, including mixed privileged accounts.
      userRoles: {
        some: { roles: { name: ROLE_NAMES.CANDIDATE } },
        every: { roles: { name: ROLE_NAMES.CANDIDATE } },
      },
    } : query.role ? { userRoles: { some: { roles: { name: ROLE_NAMES[query.role] } } } } : {}),
    ...(query.status ? { status: { name: USER_STATUS_NAMES[query.status] } } : {}),
    AND: words.map((word): Prisma.UserWhereInput => ({
      OR: [
        { email: { contains: word, mode: 'insensitive' } },
        { profile: { firstName: { contains: word, mode: 'insensitive' } } },
        { profile: { lastName: { contains: word, mode: 'insensitive' } } },
      ],
    })),
  };
  const [accounts, total] = await prisma.$transaction([
    prisma.user.findMany({ where, select: userSelect, orderBy: { id: 'asc' },
      skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.user.count({ where }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return { items: accounts.map(toManagedUser), total, page: query.page, pageSize: query.pageSize };
};

/** Creates an active managed account and audit entry without creating a login session. */
export const createUser = async (payload: CreateUserDTO, actor: AccessContext): Promise<ManagedUser> => {
  requireAdministrator(actor);
  assertCanCreateAccount(actor, payload.role);
  const passwordHash = await bcrypt.hash(payload.password, PASSWORD_HASH_ROUNDS);
  try {
    return await prisma.$transaction(async (database) => {
      const account = await database.user.create({
        data: {
          email: payload.email, passwordHash,
          status: { connect: { name: USER_STATUS_NAMES.ACTIVE } },
          profile: { create: splitProfileName(payload.fullName) },
          userRoles: { create: { roles: { connect: { name: ROLE_NAMES[payload.role] } } } },
        }, select: userSelect,
      });
      const user = toManagedUser(account);
      await database.auditLogs.create({
        data: { userId: actor.userId, entityType: 'User', entityId: user.id, action: 'CREATE',
          changes: { after: { fullName: user.fullName, email: user.email, roles: user.roles } } },
      });
      return user;
    });
  } catch (error: unknown) { return rethrowConflict(error); }
};

/** Edits only identity/role, protecting Super Admin and atomically revoking affected sessions. */
export const updateUser = async (
  userId: number, payload: UpdateUserDTO, actor: AccessContext,
): Promise<ManagedUser> => {
  requireSuperAdmin(actor);
  assertPermission(actor, PERMISSIONS.USERS_UPDATE);
  try {
    return await prisma.$transaction(async (database) => {
      const account = await database.user.findFirst({ where: { id: userId, deletedAt: null }, select: userSelect });
      if (!account) throw new AppError(404, 'La cuenta no existe.');
      const before = toManagedUser(account);
      if (before.roles.includes('SUPER_ADMIN')) {
        throw new AppError(403, 'Las cuentas Super Admin están protegidas y no pueden modificarse.');
      }
      const roleChanged = payload.role !== undefined &&
        (account.userRoles.length !== 1 || before.roles[0] !== payload.role);
      const emailChanged = payload.email !== undefined && payload.email !== account.email;
      const accountAfter = await database.user.update({
        where: { id: userId },
        data: {
          ...(payload.email !== undefined ? { email: payload.email } : {}),
          ...(payload.fullName !== undefined ? {
            profile: { upsert: {
              create: splitProfileName(payload.fullName), update: splitProfileName(payload.fullName),
            } },
          } : {}),
          ...(roleChanged && payload.role ? {
            userRoles: { deleteMany: {}, create: { roles: { connect: { name: ROLE_NAMES[payload.role] } } } },
          } : {}),
        }, select: userSelect,
      });
      if (emailChanged || roleChanged) {
        await database.authSession.updateMany({
          where: { userId, revokedAt: null }, data: { revokedAt: new Date() },
        });
      }
      const after = toManagedUser(accountAfter);
      await database.auditLogs.create({
        data: { userId: actor.userId, entityType: 'User', entityId: userId, action: 'UPDATE',
          changes: {
            before: { fullName: before.fullName, email: before.email, roles: before.roles },
            after: { fullName: after.fullName, email: after.email, roles: after.roles },
          } },
      });
      return after;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error: unknown) { return rethrowConflict(error); }
};
