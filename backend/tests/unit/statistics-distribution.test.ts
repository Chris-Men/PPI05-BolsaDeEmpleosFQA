import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ageDistribution, candidateAgeGroup, catalogDistribution, statisticsReferenceDate } from '../../src/utils/statistics-distribution.js';

test('edades cumplidas respetan cumpleaños y todos los límites del padrón', () => {
  for (const [birth, expected] of [
    ['2010-10-25', 'UNDER_16'], ['2010-10-24', 'AGE_16_24'], ['2001-10-25', 'AGE_16_24'],
    ['2001-10-24', 'AGE_25_34'], ['1991-10-25', 'AGE_25_34'], ['1991-10-24', 'AGE_35_44'],
    ['1981-10-25', 'AGE_35_44'], ['1981-10-24', 'AGE_45_PLUS'],
    ['2027-01-01', null], ['2000-02-30', null], ['', null], [null, null],
  ]) assert.equal(candidateAgeGroup(birth, '2026-10-24'), expected, String(birth));
  assert.equal(candidateAgeGroup('2000-02-29', '2025-02-28'), 'AGE_16_24');
  assert.equal(candidateAgeGroup('2000-02-29', '2025-03-01'), 'AGE_25_34');
});

test('la referencia cambia al inicio del día salvadoreño, no a medianoche UTC', () => {
  assert.equal(statisticsReferenceDate(new Date('2026-10-25T05:59:59Z')), '2026-10-24');
  assert.equal(statisticsReferenceDate(new Date('2026-10-25T06:00:00Z')), '2026-10-25');
});

test('distribuciones conservan perfiles ausentes, valores anteriores y selección explícita de sexo', () => {
  const sexes = catalogDistribution([{ value: 'UNDISCLOSED', count: 2 }, { value: null, count: 1 }], 5,
    [{ key: 'FEMALE', label: 'Femenino' }, { key: 'UNDISCLOSED', label: 'Prefiero no indicar' }]);
  assert.deepEqual(sexes.map(row => [row.key, row.count]), [['FEMALE', 0], ['UNDISCLOSED', 2], ['UNKNOWN', 3]]);
  const education = catalogDistribution([{ value: 'Técnico', count: 1 }, { value: 'Antiguo', count: 2 }, { value: ' ', count: 1 }], 6,
    [{ key: 'Técnico', label: 'Técnico' }], true);
  assert.deepEqual(education.map(row => [row.key, row.count]), [['Técnico', 1], ['OTHER', 2], ['UNKNOWN', 3]]);
  const ages = ageDistribution([{ value: '2015-01-01', count: 1 }, { value: '2000-02-30', count: 2 }, { value: '2027-01-01', count: 1 }], 7, '2026-10-24');
  assert.equal(ages.find(row => row.key === 'UNDER_16')?.count, 1);
  assert.equal(ages.find(row => row.key === 'UNKNOWN')?.count, 6);
  assert.ok(!ageDistribution([], 0, '2026-10-24').some(row => row.key === 'UNDER_16'));
  for (const rows of [sexes, education, ages]) assert.ok(rows.every(row => row.count >= 0));
});
