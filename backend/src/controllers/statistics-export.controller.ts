import type { Request, Response, NextFunction } from 'express';
import { pipeline } from 'node:stream/promises';
import { entityIdSchema } from '../validation/common.schema.js';
import { createStatisticsExportSchema, listStatisticsExportsSchema } from '../validation/statistics-export.schema.js';
import { createStatisticsExport, downloadStatisticsExport, getStatisticsExport, listStatisticsExports, statisticsExportView } from '../services/statistics-export.service.js';
import { AppError } from '../utils/app-error.js';

/** Controllers validate transport inputs and delegate queue/data logic to services. */
export const createExcelExport = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try { if (!request.user) throw new AppError(401, 'Debes iniciar sesión.'); response.status(202).json(await createStatisticsExport(createStatisticsExportSchema.parse(request.body), request.user)); }
  catch (error: unknown) { next(error); }
};
/** Lists only jobs belonging to the authenticated account. */
export const listExcelExports = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try { if (!request.user) throw new AppError(401, 'Debes iniciar sesión.'); const query = listStatisticsExportsSchema.parse(request.query); response.json(await listStatisticsExports(query.page, query.pageSize, request.user)); }
  catch (error: unknown) { next(error); }
};
/** Polling never exposes worker leases or private file locations. */
export const getExcelExport = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try { if (!request.user) throw new AppError(401, 'Debes iniciar sesión.'); response.json(statisticsExportView(await getStatisticsExport(entityIdSchema.parse(request.params.id), request.user))); }
  catch (error: unknown) { next(error); }
};
/** Streams a finished workbook through the authenticated API, without a public file URL. */
export const downloadExcelExport = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    const file = await downloadStatisticsExport(entityIdSchema.parse(request.params.id), request.user);
    response.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').attachment(file.fileName).set('Content-Length', String(file.sizeBytes));
    await pipeline(file.stream, response);
  } catch (error: unknown) { if (!response.headersSent) next(error); else response.destroy(); }
};
