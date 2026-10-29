import { calendarDateSchema } from '../validation/candidate.schema.js';

/** Aggregate-only buckets are safe to return without exposing individual profile values. */
export interface DistributionRow { key: string; label: string; count: number }
/** Values originate from grouped profile queries, never from candidate identities. */
export interface CountedValue { value: string | null; count: number }
/** Catalog keys remain distinct from their Spanish presentation labels. */
export interface DistributionChoice { key: string; label: string }

/** Missing profiles and missing values share a residual bucket so every distribution has the same denominator. */
export const catalogDistribution = (groups: CountedValue[], total: number, choices: DistributionChoice[], includeOther = false): DistributionRow[] => {
  const rows = choices.map(choice => ({ ...choice, count: 0 }));
  const byKey = new Map(rows.map(row => [row.key, row]));
  let other = 0;
  for (const group of groups) {
    const row = group.value === null ? undefined : byKey.get(group.value);
    if (row) row.count += group.count;
    else if (includeOther && group.value?.trim()) other += group.count;
  }
  if (includeOther) rows.push({ key: 'OTHER', label: 'Otros valores anteriores', count: other });
  rows.push({ key: 'UNKNOWN', label: 'Sin datos', count: total - rows.reduce((sum, row) => sum + row.count, 0) });
  return rows;
};

/** A birthday uses calendar dates; future and malformed values never become negative ages. */
export const candidateAgeGroup = (birthDate: string | null, asOfDate: string): string | null => {
  if (!birthDate || !calendarDateSchema.safeParse(birthDate).success || birthDate > asOfDate) return null;
  const age = Number(asOfDate.slice(0, 4)) - Number(birthDate.slice(0, 4)) - Number(asOfDate.slice(5) < birthDate.slice(5));
  if (age < 16) return 'UNDER_16';
  if (age < 25) return 'AGE_16_24';
  if (age < 35) return 'AGE_25_34';
  if (age < 45) return 'AGE_35_44';
  return 'AGE_45_PLUS';
};

/** Legacy minors are explicit rather than discarded from the active candidate population. */
export const ageDistribution = (groups: CountedValue[], total: number, asOfDate: string): DistributionRow[] => {
  const ages = groups.map(group => ({ ...group, value: candidateAgeGroup(group.value, asOfDate) }));
  const choices = [
    ...(ages.some(group => group.value === 'UNDER_16') ? [{ key: 'UNDER_16', label: 'Menores de 16' }] : []),
    { key: 'AGE_16_24', label: '16–24 años' }, { key: 'AGE_25_34', label: '25–34 años' },
    { key: 'AGE_35_44', label: '35–44 años' }, { key: 'AGE_45_PLUS', label: '45 o más años' },
  ];
  return catalogDistribution(ages, total, choices);
};

/** A single Salvadoran reference day is captured for all age buckets in a response. */
export const statisticsReferenceDate = (now: Date): string => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(now);
