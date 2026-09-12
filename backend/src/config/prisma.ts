import { PrismaClient } from '@prisma/client';

/** Shared Prisma client used exclusively by service-layer modules. */
export const prisma = new PrismaClient();
