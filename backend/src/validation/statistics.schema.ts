import { z } from 'zod';
import { closingDateSchema } from './opportunity.schema.js';

/** Complete calendar ranges are interpreted as inclusive Salvadoran days. */
export const statisticsRangeSchema = z.object({ from: closingDateSchema, to: closingDateSchema })
  .strict('La consulta incluye campos no permitidos.')
  .refine(value => value.from <= value.to, { path: ['to'], message: 'La fecha final debe ser igual o posterior a la inicial.' });

/** No filters or candidate identities are accepted by cumulative indicators. */
export const dashboardQuerySchema = z.object({}).strict('Esta consulta no admite filtros.');
export type StatisticsRange = z.infer<typeof statisticsRangeSchema>;

/** Salvador has UTC-06:00 calendar boundaries; the upper SQL bound is exclusive. */
export const statisticsDateBounds = (range: StatisticsRange) => ({
  gte: new Date(range.from + 'T00:00:00-06:00'),
  lt: new Date(Date.parse(range.to + 'T00:00:00-06:00') + 86_400_000),
});
