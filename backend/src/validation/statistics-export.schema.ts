import { z } from 'zod';
import { statisticsRangeSchema } from './statistics.schema.js';
import { paginationShape } from './common.schema.js';

/** Explicit consent and a retry-stable request identity are required before queuing. */
export const createStatisticsExportSchema = z.object({ from: z.string(), to: z.string(), requestId: z.string().uuid('La solicitud no es válida.'), confirmed: z.literal(true, { errorMap: () => ({ message: 'Confirma el período antes de exportar.' }) }) })
  .strict('La solicitud incluye campos no permitidos.').superRefine((value, context) => {
    const result = statisticsRangeSchema.safeParse({ from: value.from, to: value.to });
    if (!result.success) for (const issue of result.error.issues) context.addIssue(issue);
  });
/** Recent jobs are always scoped to the authenticated owner, never an input user ID. */
export const listStatisticsExportsSchema = z.object(paginationShape).strict();
export type CreateStatisticsExport = z.infer<typeof createStatisticsExportSchema>;
