import { prisma } from '../config/prisma.js';
import { Prisma } from '@prisma/client';
import { PERMISSIONS } from '../constants/authorization.constants.js';
import type { AccessContext } from '../types/authorization.types.js';
import { assertCandidateAccess } from './profile.service.js';
import { AppError } from '../utils/app-error.js';
/** Notifications belong exclusively to their recipient, including unread counts. */
export const listNotifications = async (page: number, pageSize: number, unread: string | undefined, actor: AccessContext) => {
  assertCandidateAccess(actor, PERMISSIONS.NOTIFICATION_READ_OWN);
  const where = { userId: actor.userId, ...(unread === 'true' ? { readAt: null } : unread === 'false' ? { readAt: { not: null } } : {}) };
  const [items, total, unreadCount] = await prisma.$transaction([
    prisma.notifications.findMany({ where, select: { id: true, applicationId: true, title: true, message: true, readAt: true, createdAt: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page-1)*pageSize, take: pageSize }),
    prisma.notifications.count({ where }), prisma.notifications.count({ where: { userId: actor.userId, readAt: null } }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return { items, total, unreadCount, page, pageSize };
};
/** Marking read is idempotent and cannot alter another candidate's notification. */
export const readNotification = async (id: number | null, actor: AccessContext): Promise<void> => {
  assertCandidateAccess(actor, PERMISSIONS.NOTIFICATION_UPDATE_OWN);
  if (id !== null && !await prisma.notifications.findFirst({ where: { id, userId: actor.userId }, select: { id: true } })) throw new AppError(404, 'La notificación no existe.');
  await prisma.notifications.updateMany({ where: { userId: actor.userId, readAt: null, ...(id !== null ? { id } : {}) }, data: { readAt: new Date() } });
};
