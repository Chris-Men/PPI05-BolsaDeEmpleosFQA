import type { Prisma } from '@prisma/client';
import { APPLICATION_STATUS_NAMES } from '../constants/application.constants.js';
import { AppError } from '../utils/app-error.js';
/** One SQL count covers every submitted attempt, including soft-deleted candidates. */
export const selectedCount = (database: Prisma.TransactionClient, key: string): Promise<number> => {
  const id = Number(key.split('-')[1]);
  return database.applications.count({ where: {
    ...(key.startsWith('job-') ? { jobId: id } : { volunteerRegistrations: { volunteerOpportunityId: id } }),
    applicationStatuses: { name: APPLICATION_STATUS_NAMES.SELECTED },
  } });
};
/** Must run in the vacancy mutation transaction, so capacity edits race safely with selection. */
export const assertCapacity = async (database: Prisma.TransactionClient, key: string, slots: number | null, publishing = false): Promise<void> => {
  if (slots === null) return;
  const selected = await selectedCount(database, key);
  if (selected > slots || publishing && selected >= slots) throw new AppError(409,
    publishing ? 'La vacante no tiene cupos disponibles. Amplía los cupos antes de publicarla.' : 'No puedes reducir los cupos por debajo de los candidatos seleccionados.');
};
