import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

/** Explicit allowlist for the temporary development database inspection. */
const debugUserSelect = {
  id: true,
  email: true,
  createdAt: true,
  profile: { select: { firstName: true, lastName: true } },
  userRoles: { select: { roles: { select: { name: true } } } },
  status: { select: { name: true } },
} satisfies Prisma.UserSelect;

/** Lists every account without selecting password hashes or credentials. */
export const listDebugUsers = (): Promise<
  Prisma.UserGetPayload<{ select: typeof debugUserSelect }>[]
> => prisma.user.findMany({
  where: { deletedAt: null },
  select: debugUserSelect,
  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
});
