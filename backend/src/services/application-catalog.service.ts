import type { PrismaClient } from '@prisma/client';
import { APPLICATION_STATUS_NAMES } from '../constants/application.constants.js';
/** Adds stable statuses and imports old registrations once, without sending retrospective alerts. */
export const seedApplicationCatalogs = async (database: PrismaClient): Promise<void> => {
  for (const name of Object.values(APPLICATION_STATUS_NAMES)) {
    await database.applicationStatuses.upsert({ where: { name }, update: {}, create: { name } });
  }
  const pending = await database.applicationStatuses.findUniqueOrThrow({ where: { name: APPLICATION_STATUS_NAMES.PENDING } });
  const legacy = await database.volunteerRegistrations.findMany({ where: { applications: { none: {} } } });
  for (const registration of legacy) {
    await database.applications.upsert({
      where: { volunteerRegistrationId_attemptNumber: { volunteerRegistrationId: registration.id, attemptNumber: 1 } },
      update: {}, create: { volunteerRegistrationId: registration.id, userId: registration.userId, statusId: pending.id,
        referenceNumber: 'FQA-LEGACY-V-' + registration.id, createdAt: registration.createdAt },
    });
  }
};
