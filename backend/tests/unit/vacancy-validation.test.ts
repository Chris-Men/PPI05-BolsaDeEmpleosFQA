import '../helpers/unit-environment.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOpportunitySchema, updateOpportunitySchema, closingDateSchema, listOpportunitiesSchema, opportunityKeySchema } from '../../src/validation/opportunity.schema.js';
import { createCategorySchema } from '../../src/validation/category.schema.js';
import { PERMISSIONS } from '../../src/constants/authorization.constants.js';
import { assertVacancyAccess, vacancySlug } from '../../src/services/vacancy-policy.service.js';
import { AppError } from '../../src/utils/app-error.js';

test('vacantes admite borradores de los cuatro tipos y protege campos internos', () => {
  for (const kind of ['EMPLOYMENT', 'VOLUNTEER', 'SOCIAL_HOURS', 'INTERNSHIP']) {
    assert.equal(createOpportunitySchema.safeParse({ title: ' Nueva vacante ', kind }).success, true);
  }
  for (const extra of [{ id: 1 }, { slug: 'sustituida' }, { statusId: 1 }, { status: 'OPEN' }, { createdAt: '2026-01-01' }, { applications: [] }]) {
    assert.equal(createOpportunitySchema.safeParse({ title: 'Título', kind: 'EMPLOYMENT', ...extra }).success, false);
  }
  assert.equal(updateOpportunitySchema.safeParse({ kind: 'VOLUNTEER' }).success, false);
  assert.equal(updateOpportunitySchema.safeParse({}).success, false);
  assert.deepEqual(updateOpportunitySchema.parse({ requirements: [] }), { requirements: [] });
});

test('vacantes valida fechas reales, cantidades, salarios y paginación', () => {
  assert.equal(closingDateSchema.safeParse('2028-02-29').success, true);
  for (const value of ['0000-01-01', '2027-02-29', '2026-02-31', '2026-13-01', '2026-1-1', 'inválida']) assert.equal(closingDateSchema.safeParse(value).success, false);
  for (const values of [{ salaryMin: -1 }, { salaryMin: 200, salaryMax: 100 }, { salaryMin: 1.001 }, { slots: 0 }, { socialHours: 2.5 }, { organizationId: 0 }, { requirements: [''] }]) {
    assert.equal(createOpportunitySchema.safeParse({ title: 'Vacante', kind: 'EMPLOYMENT', ...values }).success, false);
  }
  assert.deepEqual(listOpportunitiesSchema.parse({ page: '2', pageSize: '20', search: ' Buscar ' }), { page: 2, pageSize: 20, search: 'Buscar' });
  assert.equal(listOpportunitiesSchema.safeParse({ page: 501, pageSize: 20 }).success, false);
  for (const key of ['job-0', '1', 'volunteer-01', 'job-2147483648']) assert.equal(opportunityKeySchema.safeParse(key).success, false);
});

test('categorías normaliza slugs y rechaza nombres y referencias inválidas', () => {
  assert.equal(vacancySlug(' Educación y SALUD '), 'educacion-y-salud');
  for (const value of [{ name: ' ' }, { name: '!!' }, { name: 'Educación', parentId: -1 }, { name: 'Educación', slug: 'interno' }]) assert.equal(createCategorySchema.safeParse(value).success, false);
});

test('cada operación exige simultáneamente rol administrativo y permiso', () => {
  for (const permission of [PERMISSIONS.OPPORTUNITY_READ, PERMISSIONS.OPPORTUNITY_CREATE, PERMISSIONS.OPPORTUNITY_UPDATE, PERMISSIONS.OPPORTUNITY_STATUS_UPDATE, PERMISSIONS.OPPORTUNITY_ARCHIVE, PERMISSIONS.CATEGORY_READ, PERMISSIONS.CATEGORY_CREATE, PERMISSIONS.CATEGORY_UPDATE, PERMISSIONS.CATEGORY_DELETE]) {
    assert.doesNotThrow(() => assertVacancyAccess({ userId: 1, roles: ['ADMINISTRATOR'], permissions: [permission] }, permission));
    for (const actor of [{ userId: 1, roles: ['CANDIDATE'] as const, permissions: [permission] }, { userId: 1, roles: ['ADMINISTRATOR'] as const, permissions: [] }]) {
      assert.throws(() => assertVacancyAccess({ ...actor, roles: [...actor.roles] }, permission), (error) => error instanceof AppError && error.statusCode === 403);
    }
  }
});
