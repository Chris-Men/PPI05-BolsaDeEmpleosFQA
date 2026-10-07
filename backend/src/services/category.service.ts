import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { PERMISSIONS } from '../constants/authorization.constants.js';
import type { AccessContext } from '../types/authorization.types.js';
import type { CategoryQuery, CreateCategoryDTO, UpdateCategoryDTO } from '../validation/category.schema.js';
import { AppError } from '../utils/app-error.js';
import { assertVacancyAccess, mutateVacancy, vacancySlug } from './vacancy-policy.service.js';

/** Only category metadata and actual usage counts leave the administrative API. */
const categorySelect = {
  id: true, name: true, slug: true, description: true, isActive: true, parentId: true,
  _count: { select: { jobs: true, volunteerOpportunities: true, otherJobCategories: true } },
} satisfies Prisma.JobCategoriesSelect;
/** Maps database counts to one common category contract. */
const mapCategory = (row: Prisma.JobCategoriesGetPayload<{ select: typeof categorySelect }>) => {
  const { _count, ...category } = row;
  return { ...category, opportunityCount: _count.jobs + _count.volunteerOpportunities, childCount: _count.otherJobCategories };
};
/** Categories have server pagination and case-insensitive search. */
export const listCategories = async (query: CategoryQuery, actor: AccessContext) => {
  assertVacancyAccess(actor, PERMISSIONS.CATEGORY_READ);
  const where: Prisma.JobCategoriesWhereInput = {
    ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    ...(query.state ? { isActive: query.state === 'ACTIVE' } : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.jobCategories.findMany({ where, select: categorySelect, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.jobCategories.count({ where }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return { items: rows.map(mapCategory), total, page: query.page, pageSize: query.pageSize };
};
/** The public catalog omits private usage counts and inactive records. */
export const publicCategories = () => prisma.jobCategories.findMany({
  where: { isActive: true }, select: { id: true, name: true, slug: true, description: true, parentId: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }],
});
/** Validates every ancestor so neither direct nor indirect hierarchy cycles can be saved. */
const checkParent = async (database: Prisma.TransactionClient, id: number | null, parentId: number | null | undefined): Promise<void> => {
  let current = parentId;
  const visited = new Set<number>();
  while (current != null) {
    if (current === id || visited.has(current)) throw new AppError(400, 'La categoría padre crearía un ciclo.');
    visited.add(current);
    const parent = await database.jobCategories.findUnique({ where: { id: current }, select: { parentId: true } });
    if (!parent) throw new AppError(400, 'La categoría padre no existe.');
    current = parent.parentId;
  }
};
/** Changes and their audit are committed together; normalized slugs also prevent case duplicates. */
export const saveCategory = async (id: number | null, payload: CreateCategoryDTO | UpdateCategoryDTO, actor: AccessContext) => {
  assertVacancyAccess(actor, id == null ? PERMISSIONS.CATEGORY_CREATE : PERMISSIONS.CATEGORY_UPDATE);
  return mutateVacancy(async (database) => {
    const before = id == null ? null : await database.jobCategories.findUnique({ where: { id }, select: categorySelect });
    if (id != null && !before) throw new AppError(404, 'La categoría no existe.');
    await checkParent(database, id, payload.parentId === undefined ? before?.parentId : payload.parentId);
    const data = { ...payload, ...(payload.name ? { slug: vacancySlug(payload.name) } : {}) };
    const row = id == null
      ? await database.jobCategories.create({ data: { ...data, name: payload.name!, slug: vacancySlug(payload.name!) }, select: categorySelect })
      : await database.jobCategories.update({ where: { id }, data, select: categorySelect });
    await database.auditLogs.create({ data: { userId: actor.userId, entityType: 'Category', entityId: row.id, action: id == null ? 'CREATE' : 'UPDATE', changes: { before: before ? mapCategory(before) : null, after: mapCategory(row) } } });
    return mapCategory(row);
  });
};
/** Referenced categories must be deactivated rather than deleting historical associations. */
export const deleteCategory = async (id: number, actor: AccessContext): Promise<void> => {
  assertVacancyAccess(actor, PERMISSIONS.CATEGORY_DELETE);
  await mutateVacancy(async (database) => {
    const row = await database.jobCategories.findUnique({ where: { id }, select: categorySelect });
    if (!row) throw new AppError(404, 'La categoría no existe.');
    if (row._count.jobs + row._count.volunteerOpportunities + row._count.otherJobCategories > 0) {
      throw new AppError(409, 'La categoría tiene vacantes o subcategorías. Puedes desactivarla para conservar sus relaciones.');
    }
    await database.jobCategories.delete({ where: { id } });
    await database.auditLogs.create({ data: { userId: actor.userId, entityType: 'Category', entityId: id, action: 'DELETE', changes: { before: mapCategory(row) } } });
  });
};
