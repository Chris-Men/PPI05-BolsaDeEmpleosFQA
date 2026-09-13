import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

/** Explicit allowlist for the temporary development database inspection. */
const debugUserSelect = {
  id: true,
  email: true,
  createdAt: true,
  updatedAt: true,
  profile: { select: { fullName: true } },
  role: { select: { code: true, name: true } },
  status: { select: { code: true, name: true } },
} satisfies Prisma.UserSelect;

/** Lists every account without selecting password hashes or credentials. */
export const listDebugUsers = (): Promise<
  Prisma.UserGetPayload<{ select: typeof debugUserSelect }>[]
> => prisma.user.findMany({
  select: debugUserSelect,
  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
});
