import { z } from 'zod';
import { paginationShape } from './common.schema.js';

/** Bounded prefixes keep mixed-source pagination consistent without reading complete collections. */
export const savedOpportunityQuerySchema = z.object(paginationShape).strict('La solicitud incluye filtros no permitidos.')
  .refine(value => value.page * value.pageSize <= 10_000, 'No puedes consultar más de 10000 resultados.');
/** Identity is taken from the session; mutation bodies cannot supply another candidate. */
export const emptySavedMutationSchema = z.object({}).strict('La solicitud incluye campos no permitidos.');
export type SavedOpportunityQuery = z.infer<typeof savedOpportunityQuerySchema>;
