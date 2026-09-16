import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { PERMISSIONS, ROLE_NAMES } from '../constants/authorization.constants.js';
import { USER_STATUS_NAMES } from '../constants/user.constants.js';
import type { AccessContext } from '../types/authorization.types.js';
import { AppError } from '../utils/app-error.js';
import { rethrowUserConflict } from '../utils/user-conflict.js';
import { assertPermission } from './authorization.service.js';

/** Explicit lifecycle operations; identity editing remains separate. */
export type UserLifecycleAction = 'DISABLE' | 'ENABLE' | 'DELETE' | 'RESTORE';
/** Prefix applied exactly once per deletion, preserving the original address on restore. */
export const DELETED_EMAIL_PREFIX = 'inactive.';

/** Updates lifecycle, revokes sessions and records audit atomically, without deleting related data. */
export const changeUserLifecycle = async (
  userId: number, action: UserLifecycleAction, actor: AccessContext, ownAccount = false,
): Promise<void> => {
  const superAdmin = actor.roles.includes('SUPER_ADMIN');
  if (ownAccount) {
    if (action !== 'DELETE' || userId !== actor.userId) throw new AppError(403, 'Solo puedes eliminar tu propia cuenta.');
    assertPermission(actor, PERMISSIONS.ACCOUNT_DELETE_OWN);
  } else {
    if (!superAdmin && !actor.roles.includes('ADMINISTRATOR')) throw new AppError(403, 'No tienes permiso para gestionar cuentas.');
    if (action === 'RESTORE') {
      if (!superAdmin) throw new AppError(403, 'Solo Super Admin puede restaurar cuentas eliminadas.');
      assertPermission(actor, PERMISSIONS.USERS_RESTORE);
    }
  }
  try {
    await prisma.$transaction(async (database) => {
      const user = await database.user.findUnique({
        where: { id: userId },
        include: { status: true, userRoles: { include: { roles: true } } },
      });
      if (!user) throw new AppError(404, 'La cuenta no existe.');
      const roleNames = user.userRoles.map(({ roles }) => roles.name);
      if (roleNames.includes(ROLE_NAMES.SUPER_ADMIN)) {
        throw new AppError(403, 'Las cuentas Super Admin están protegidas.');
      }
      const onlyCandidate = roleNames.length === 1 && roleNames[0] === ROLE_NAMES.CANDIDATE;
      if (!ownAccount) {
        if (user.id === actor.userId) throw new AppError(403, 'No puedes realizar esta acción sobre tu propia cuenta desde el panel.');
        if (!superAdmin && !onlyCandidate) throw new AppError(403, 'Solo puedes gestionar cuentas de candidatos.');
        if (action === 'DELETE') {
          assertPermission(actor, onlyCandidate ? PERMISSIONS.CANDIDATE_DELETE : PERMISSIONS.ADMINISTRATOR_DELETE);
        } else if (action !== 'RESTORE') {
          assertPermission(actor, onlyCandidate ? PERMISSIONS.CANDIDATE_STATUS_UPDATE : PERMISSIONS.USERS_STATUS_UPDATE);
        }
      }
      if (action === 'DELETE' && user.deletedAt) return;
      if (action === 'RESTORE' && !user.deletedAt) throw new AppError(409, 'La cuenta no está eliminada.');
      if (action !== 'DELETE' && action !== 'RESTORE' && user.deletedAt) {
        throw new AppError(409, 'La cuenta está eliminada. Solo Super Admin puede restaurarla.');
      }
      const email = action === 'DELETE' ? DELETED_EMAIL_PREFIX + user.email
        : action === 'RESTORE' ? user.email.slice(DELETED_EMAIL_PREFIX.length) : user.email;
      if (action === 'RESTORE') {
        if (!user.email.startsWith(DELETED_EMAIL_PREFIX)) throw new AppError(409, 'No se pudo identificar el correo original.');
        if (await database.user.findFirst({ where: { email, deletedAt: null }, select: { id: true } })) {
          throw new AppError(409, 'El correo original ya está en uso. No se puede restaurar esta cuenta.');
        }
      }
      const statusName = action === 'ENABLE' || action === 'RESTORE' ? USER_STATUS_NAMES.ACTIVE : USER_STATUS_NAMES.DISABLED;
      const after = await database.user.update({
        where: { id: userId },
        data: { email, status: { connect: { name: statusName } },
          ...(action === 'DELETE' ? { deletedAt: new Date() } : action === 'RESTORE' ? { deletedAt: null } : {}) },
        select: { email: true, deletedAt: true },
      });
      // Enabling/restoring must never resurrect credentials issued before disabling/deleting.
      await database.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await database.auditLogs.create({
        data: { userId: actor.userId, entityType: 'User', entityId: userId, action,
          changes: {
            before: { email: user.email, status: user.status.name, deletedAt: user.deletedAt?.toISOString() ?? null },
            after: { email: after.email, status: statusName, deletedAt: after.deletedAt?.toISOString() ?? null },
            ownAccount,
          } },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error: unknown) { rethrowUserConflict(error); }
};
