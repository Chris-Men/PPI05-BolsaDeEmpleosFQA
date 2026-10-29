import ExcelJS from 'exceljs';
import { Prisma } from '@prisma/client';
import { setImmediate } from 'node:timers/promises';
import { createWriteStream } from 'node:fs';
import { prisma } from '../config/prisma.js';
import { ACTIVE_CANDIDATE_FILTER } from './statistics-breakdown.service.js';
import { statisticsDateBounds, type StatisticsRange } from '../validation/statistics.schema.js';
import { statisticsReferenceDate } from '../utils/statistics-distribution.js';
import { calendarDateSchema } from '../validation/candidate.schema.js';
import { AppError } from '../utils/app-error.js';

/** A workbook cell is an explicit scalar; user strings never become formulas or hyperlinks. */
type Cell = string | number | boolean | Date | null | undefined;
/** Column definitions also generate the workbook's data dictionary. */
interface Column { key: string; header: string; description: string; format?: string }
/** Rows are deliberately allowlisted rather than serialized Prisma entities. */
type ExportRow = Record<string, Cell>;
/** Metrics retain distinct entities separately from repeat application attempts. */
interface Counters { total: number; EMPLOYMENT: number; VOLUNTEER: number; SOCIAL_HOURS: number; INTERNSHIP: number; selected: number; opportunities: Set<string>; volunteers: Set<string>; candidates: Set<number> }
/** Scope selects one bulk aggregate cohort; each call uses bounded grouped pages. */
interface CounterScope { users?: number[]; organizations?: number[]; jobs?: number[]; volunteers?: number[] }
/** Completion metadata contains counts and extraction time, never personal contents. */
export interface WorkbookResult { snapshotAt: Date; rowCounts: Record<string, number> }
const batchSize = 500;
/** Public Spanish headers and dictionary descriptions come from one definition. */
const column = (key: string, header: string, description = header, format?: string): Column => ({ key, header, description, format });
/** Timestamp formatting is explicit so Excel cannot apply the reader's local timezone. */
const dateColumn = (key: string, header: string): Column => column(key, header, header + ' en El Salvador.', 'yyyy-mm-dd hh:mm:ss');
/** Distinct entity sets must belong to one target/window and never be shared across rows. */
const freshCounters = (): Counters => ({ total: 0, EMPLOYMENT: 0, VOLUNTEER: 0, SOCIAL_HOURS: 0, INTERNSHIP: 0, selected: 0, opportunities: new Set(), volunteers: new Set(), candidates: new Set() });
const kindLabels = { EMPLOYMENT: 'Empleo', VOLUNTEER: 'Voluntariado', SOCIAL_HOURS: 'Horas sociales', INTERNSHIP: 'Práctica' };
/** Excel stores calendar values without a timezone; timestamps are shifted explicitly to Salvador's UTC−06. */
const localTimestamp = (value: Date | null | undefined): Date | null => value ? new Date(value.getTime() - 6 * 60 * 60_000) : null;
/** Invalid historical birth dates have no invented age. */
export const workbookAge = (value: Date | null | undefined, reference: string): number | null => {
  const date = value?.toISOString().slice(0, 10);
  if (!date || !calendarDateSchema.safeParse(date).success || date > reference) return null;
  return Number(reference.slice(0, 4)) - Number(date.slice(0, 4)) - Number(reference.slice(5) < date.slice(5));
};

/** Streaming sheets repeat their headers when Excel's row limit requires a numbered continuation. */
export class WorkbookSheet {
  private sheet: ExcelJS.Worksheet | undefined;
  private part = 0;
  private currentRows = 0;
  count = 0;
  constructor(private workbook: ExcelJS.stream.xlsx.WorkbookWriter, readonly name: string, readonly columns: Column[], private rowLimit = 1_048_576) {
    if (rowLimit < 2) throw new Error('El límite debe permitir encabezados y datos.');
    this.nextSheet();
  }
  /** A continued sheet has the same schema and formatting as the first part. */
  private nextSheet(): void {
    if (this.sheet) this.finish(); this.part += 1; this.currentRows = 1;
    this.sheet = this.workbook.addWorksheet(this.name + (this.part > 1 ? ' ' + this.part : ''), { views: [{ state: 'frozen', ySplit: 1 }] });
    this.sheet.columns = this.columns.map(item => ({ key: item.key, header: item.header, width: Math.min(40, Math.max(18, item.header.length + 2)), style: item.format ? { numFmt: item.format } : {} }));
    const header = this.sheet.getRow(1); header.font = { bold: true, color: { argb: 'FFFFFFFF' } }; header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF193007' } }; header.commit();
  }
  /** Oversized historical text is rejected explicitly rather than silently truncated. */
  add(row: ExportRow): void {
    if (this.currentRows >= this.rowLimit) this.nextSheet();
    const values = this.columns.map(item => {
      const value = row[item.key];
      if (typeof value === 'string' && value.length > 32_767) throw new AppError(422, 'Un texto histórico supera el límite de una celda de Excel. No se recortaron datos.');
      return value ?? null;
    });
    this.sheet!.addRow(values).commit(); this.currentRows += 1; this.count += 1;
  }
  /** Finalizes the current part after all rows have been committed. */
  finish(): void { this.sheet!.autoFilter = { from: { row: 1, column: 1 }, to: { row: this.currentRows, column: this.columns.length } }; this.sheet!.commit(); }
}

/** Aggregate pages avoid loading application payloads or issuing a query per exported row. */
async function activityCounters(database: Prisma.TransactionClient, scope: CounterScope, selectedId: number | undefined, range?: StatisticsRange): Promise<Map<string, Counters>> {
  const result = new Map<string, Counters>();
  const where: Prisma.ApplicationsWhereInput = {
    ...(range ? { createdAt: statisticsDateBounds(range) } : {}),
    ...(scope.users ? { userId: { in: scope.users } } : {}),
    ...(scope.organizations ? { OR: [{ jobs: { organizationId: { in: scope.organizations } } }, { volunteerRegistrations: { volunteerOpportunities: { organizationId: { in: scope.organizations } } } }] } : {}),
    ...(scope.jobs || scope.volunteers ? { OR: [{ jobId: { in: scope.jobs ?? [] } }, { volunteerRegistrations: { volunteerOpportunityId: { in: scope.volunteers ?? [] } } }] } : {}),
  };
  for (let skip = 0; ; skip += batchSize) {
    const groups = await database.applications.groupBy({ by: ['userId', 'jobId', 'volunteerRegistrationId', 'statusId'], where, _count: true,
      orderBy: [{ userId: 'asc' }, { jobId: 'asc' }, { volunteerRegistrationId: 'asc' }, { statusId: 'asc' }], take: batchSize, skip });
    if (!groups.length) break;
    const [jobs, registrations] = await Promise.all([
      database.jobs.findMany({ where: { id: { in: groups.flatMap(row => row.jobId === null ? [] : [row.jobId]) } }, select: { id: true, kind: true, organizationId: true } }),
      database.volunteerRegistrations.findMany({ where: { id: { in: groups.flatMap(row => row.volunteerRegistrationId === null ? [] : [row.volunteerRegistrationId]) } }, select: { id: true, volunteerOpportunityId: true, volunteerOpportunities: { select: { organizationId: true } } } }),
    ]);
    const jobMap = new Map(jobs.map(row => [row.id, row])); const volunteerMap = new Map(registrations.map(row => [row.id, row]));
    for (const group of groups) {
      const job = group.jobId === null ? undefined : jobMap.get(group.jobId);
      const volunteer = group.volunteerRegistrationId === null ? undefined : volunteerMap.get(group.volunteerRegistrationId);
      const key = job ? 'job-' + job.id : volunteer ? 'volunteer-' + volunteer.volunteerOpportunityId : null;
      const organizationId = job ? job.organizationId : volunteer?.volunteerOpportunities.organizationId;
      const target = scope.users ? String(group.userId) : scope.organizations ? String(organizationId) : key;
      if (target === null) continue;
      const counter = result.get(target) ?? freshCounters(); result.set(target, counter);
      counter.total += group._count;
      const kind = job?.kind ?? (volunteer ? 'VOLUNTEER' : undefined); if (kind) counter[kind] += group._count;
      if (group.statusId === selectedId) counter.selected += group._count;
      if (key) counter.opportunities.add(key); if (volunteer && !job) counter.volunteers.add(key!);
      counter.candidates.add(group.userId);
    }
    await setImmediate();
  }
  return result;
}

/** Identical counter definitions are used for users, opportunities and organizations. */
const counterColumns = (candidates = false): Column[] => ['period', 'lifetime'].flatMap(scope => {
  const suffix = scope === 'period' ? ' (período)' : ' (acumulado)';
  return [column(scope + '_total', 'Postulaciones' + suffix, 'Intentos enviados, incluidos repetidos y retirados.'),
    ...Object.entries(kindLabels).map(([kind, label]) => column(scope + '_' + kind, label + suffix, 'Intentos enviados de tipo ' + label + '.')),
    column(scope + '_opportunities', 'Oportunidades distintas' + suffix), column(scope + '_volunteers', 'Voluntariados distintos' + suffix),
    column(scope + '_selected', 'Seleccionadas' + suffix, 'Intentos cuyo estado actual es Seleccionada.'),
    ...(candidates ? [column(scope + '_candidates', 'Candidatos distintos' + suffix)] : [])];
});
/** Blank cohorts produce numeric zeros, not blank cells or undefined strings. */
const counterValues = (period: Counters | undefined, lifetime: Counters | undefined): ExportRow => Object.fromEntries(
  ([['period', period ?? freshCounters()], ['lifetime', lifetime ?? freshCounters()]] as const).flatMap(([scope, values]) => [
    ...(['total', 'EMPLOYMENT', 'VOLUNTEER', 'SOCIAL_HOURS', 'INTERNSHIP', 'selected'] as const).map(key => [scope + '_' + key, values[key]]),
    [scope + '_opportunities', values.opportunities.size], [scope + '_volunteers', values.volunteers.size], [scope + '_candidates', values.candidates.size],
  ]));

/** A single repeatable-read snapshot supplies every scalar and counter written to the workbook. */
export async function generateStatisticsWorkbook(path: string, range: StatisticsRange): Promise<WorkbookResult> {
  const stream = createWriteStream(path, { flags: 'wx', mode: 0o600 });
  let writeError: Error | undefined;
  const streamFailure = new Promise<never>((_resolve, reject) => { stream.on('error', error => { writeError = error; reject(error); }); });
  void streamFailure.catch(() => undefined);
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream, useStyles: true, useSharedStrings: false });
  const sheets: WorkbookSheet[] = [];
  const addSheet = (name: string, columns: Column[]): WorkbookSheet => { const sheet = new WorkbookSheet(workbook, name, columns); sheets.push(sheet); return sheet; };
  try {
    const result = await prisma.$transaction(async database => {
      const snapshotAt = new Date(); const reference = statisticsReferenceDate(snapshotAt); const bounds = statisticsDateBounds(range);
      const selected = await database.applicationStatuses.findUnique({ where: { name: 'Seleccionada' }, select: { id: true } });
      const users = addSheet('Usuarios', [column('id', 'ID candidato'), column('firstName', 'Nombres'), column('lastName', 'Apellidos'), column('email', 'Correo'), column('phone', 'Teléfono', 'Texto; conserva ceros iniciales.', '@'),
        column('birthDate', 'Fecha de nacimiento', 'Fecha calendario original.', 'yyyy-mm-dd'), column('age', 'Edad', 'Años cumplidos a la fecha de extracción en El Salvador.'), column('sex', 'Sexo', 'Código original; UNDISCLOSED es una selección explícita.'),
        column('department', 'Departamento'), column('municipality', 'Municipio'), column('educationLevel', 'Nivel educativo'), column('profession', 'Profesión'), column('professionalSummary', 'Resumen profesional'),
        dateColumn('createdAt', 'Fecha de registro'), column('hasResume', 'CV activo', 'Indica disponibilidad; no incluye el archivo.'), ...counterColumns()]);
      for (let cursor = 0; ; ) {
        const rows = await database.user.findMany({ where: { ...ACTIVE_CANDIDATE_FILTER, id: { gt: cursor } }, orderBy: { id: 'asc' }, take: batchSize,
          select: { id: true, email: true, createdAt: true, profile: { select: { firstName: true, lastName: true, phone: true, birthDate: true, sex: true, department: true, municipality: true, educationLevel: true, profession: true, professionalSummary: true, resumeFileId: true } } } });
        if (!rows.length) break;
        const scope = { users: rows.map(row => row.id) }; const period = await activityCounters(database, scope, selected?.id, range); const lifetime = await activityCounters(database, scope, selected?.id);
        for (const row of rows) users.add({ ...row.profile, id: row.id, email: row.email, createdAt: localTimestamp(row.createdAt), age: workbookAge(row.profile?.birthDate, reference), hasResume: Boolean(row.profile?.resumeFileId), ...counterValues(period.get(String(row.id)), lifetime.get(String(row.id))) });
        cursor = rows.at(-1)!.id; await setImmediate();
      }
      users.finish();
      const opportunities = addSheet('Oportunidades', [column('key', 'Clave oportunidad', 'job-ID o volunteer-ID, sin colisiones entre tablas.'), column('kind', 'Tipo', 'EMPLOYMENT, VOLUNTEER, SOCIAL_HOURS o INTERNSHIP.'), column('title', 'Título'), column('organizationId', 'ID organización'), column('organization', 'Organización'), column('categoryId', 'ID categoría'), column('category', 'Categoría actual'), column('modality', 'Modalidad'), column('department', 'Departamento'), column('municipality', 'Municipio'), column('slots', 'Cupos'), column('salaryMin', 'Salario mínimo', 'Importe original.', '0.00'), column('salaryMax', 'Salario máximo', 'Importe original.', '0.00'), column('socialHours', 'Horas sociales'), column('duration', 'Duración'), column('contactEmail', 'Correo de contacto'), column('contactPhone', 'Teléfono de contacto', 'Ocho dígitos locales como texto; prefijo +503.'), column('contactLegacy', 'Contacto anterior', 'Texto histórico original, sin reinterpretar.'), dateColumn('createdAt', 'Fecha de creación'), dateColumn('publishedAt', 'Primera publicación'), dateColumn('expiresAt', 'Fecha de vencimiento'), dateColumn('archivedAt', 'Fecha de archivo'), column('status', 'Estado actual'), ...counterColumns(true)]);
      const related = { organizations: { select: { name: true } }, jobCategories: { select: { name: true } }, locations: { select: { department: true, municipality: true } } };
      for (const source of ['jobs', 'volunteers'] as const) {
        for (let cursor = 0; ; ) {
          const common = { where: { id: { gt: cursor }, publishedAt: bounds }, orderBy: { id: 'asc' as const }, take: batchSize };
          const rows = source === 'jobs'
            ? (await database.jobs.findMany({ ...common, include: { ...related, jobStatuses: { select: { name: true } } } })).map(row => ({ ...row, key: 'job-' + row.id, status: row.jobStatuses.name }))
            : (await database.volunteerOpportunities.findMany({ ...common, include: { ...related, volunteerStatuses: { select: { name: true } } } })).map(row => ({ ...row, key: 'volunteer-' + row.id, kind: 'VOLUNTEER' as const, status: row.volunteerStatuses.name, salaryMin: null, salaryMax: null, socialHours: null, duration: null }));
          if (!rows.length) break;
          const scope = source === 'jobs' ? { jobs: rows.map(row => row.id) } : { volunteers: rows.map(row => row.id) };
          const period = await activityCounters(database, scope, selected?.id, range); const lifetime = await activityCounters(database, scope, selected?.id);
          for (const row of rows) opportunities.add({ key: row.key, kind: row.kind, title: row.title, organizationId: row.organizationId, organization: row.organizations?.name, categoryId: row.categoryId, category: row.jobCategories?.name, modality: row.modality, department: row.locations?.department, municipality: row.locations?.municipality, slots: row.slots,
            salaryMin: row.salaryMin === null ? null : Number(row.salaryMin), salaryMax: row.salaryMax === null ? null : Number(row.salaryMax), socialHours: row.socialHours, duration: row.duration,
            contactEmail: row.contactEmail, contactPhone: row.contactPhone, contactLegacy: row.contact,
            createdAt: localTimestamp(row.createdAt), publishedAt: localTimestamp(row.publishedAt), expiresAt: localTimestamp(row.expiresAt), archivedAt: localTimestamp(row.archivedAt), status: row.archivedAt ? 'Archivada' : row.status, ...counterValues(period.get(row.key), lifetime.get(row.key)) });
          cursor = rows.at(-1)!.id; await setImmediate();
        }
      }
      opportunities.finish();
      const applications = addSheet('Postulaciones', [column('id', 'ID postulación'), column('reference', 'Referencia'), column('attempt', 'Número de intento'), column('userId', 'ID candidato'), column('activeCandidate', 'En padrón activo', 'Solo estos candidatos aparecen en Usuarios.'), column('key', 'Clave oportunidad'), column('kind', 'Tipo'), column('title', 'Título oportunidad'), column('organizationId', 'ID organización'), column('organization', 'Organización'), column('categoryId', 'ID categoría'), column('category', 'Categoría actual'), dateColumn('createdAt', 'Fecha de envío'), column('status', 'Estado actual'), column('hasResume', 'CV disponible', 'Disponibilidad actual del CV asociado; no incluye el archivo.')]);
      const opportunityFields = { id: true, title: true, organizationId: true, categoryId: true, organizations: { select: { name: true } }, jobCategories: { select: { name: true } } };
      for (let cursor = 0; ; ) {
        const rows = await database.applications.findMany({ where: { id: { gt: cursor }, createdAt: bounds }, orderBy: { id: 'asc' }, take: batchSize,
          select: { id: true, referenceNumber: true, attemptNumber: true, userId: true, createdAt: true, resumeId: true, applicationStatuses: { select: { name: true } }, applicationFiles: { where: { files: { fileType: 'RESUME' } }, take: 1, select: { id: true } },
            jobs: { select: { ...opportunityFields, kind: true } }, volunteerRegistrations: { select: { volunteerOpportunities: { select: opportunityFields } } } } });
        if (!rows.length) break;
        const active = new Set((await database.user.findMany({ where: { ...ACTIVE_CANDIDATE_FILTER, id: { in: rows.map(row => row.userId) } }, select: { id: true } })).map(row => row.id));
        for (const row of rows) {
          const opportunity = row.jobs ?? row.volunteerRegistrations?.volunteerOpportunities;
          applications.add({ id: row.id, reference: row.referenceNumber, attempt: row.attemptNumber, userId: row.userId, activeCandidate: active.has(row.userId), key: opportunity ? (row.jobs ? 'job-' : 'volunteer-') + opportunity.id : null,
            kind: row.jobs?.kind ?? (opportunity ? 'VOLUNTEER' : null), title: opportunity?.title, organizationId: opportunity?.organizationId, organization: opportunity?.organizations?.name, categoryId: opportunity?.categoryId, category: opportunity?.jobCategories?.name,
            createdAt: localTimestamp(row.createdAt), status: row.applicationStatuses.name, hasResume: Boolean(row.resumeId || row.applicationFiles.length) });
        }
        cursor = rows.at(-1)!.id; await setImmediate();
      }
      applications.finish();
      const publicationColumns = ['period', 'lifetime'].flatMap(scope => [column(scope + '_published', 'Publicaciones (' + (scope === 'period' ? 'período' : 'acumulado') + ')'), ...Object.entries(kindLabels).map(([kind, label]) => column(scope + '_published_' + kind, 'Publicaciones ' + label + ' (' + (scope === 'period' ? 'período' : 'acumulado') + ')'))]);
      const organizations = addSheet('Organizaciones', [column('id', 'ID organización'), column('name', 'Nombre'), column('email', 'Correo'), column('description', 'Descripción'), column('status', 'Estado actual'), dateColumn('createdAt', 'Fecha de registro'), ...publicationColumns, ...counterColumns(true)]);
      for (let cursor = 0; ; ) {
        const rows = await database.organizations.findMany({ where: { id: { gt: cursor } }, orderBy: { id: 'asc' }, take: batchSize, select: { id: true, name: true, email: true, description: true, createdAt: true, organizationStatuses: { select: { name: true } } } });
        if (!rows.length) break;
        const ids = rows.map(row => row.id); const scope = { organizations: ids }; const period = await activityCounters(database, scope, selected?.id, range); const lifetime = await activityCounters(database, scope, selected?.id);
        const publications = new Map<number, ExportRow>();
        for (const window of ['period', 'lifetime'] as const) {
          const where = { organizationId: { in: ids }, publishedAt: window === 'period' ? bounds : { not: null } };
          const jobs = await database.jobs.groupBy({ by: ['organizationId', 'kind'], where, _count: true });
          const volunteers = await database.volunteerOpportunities.groupBy({ by: ['organizationId'], where, _count: true });
          for (const group of [...jobs, ...volunteers.map(row => ({ ...row, kind: 'VOLUNTEER' as const }))]) {
            if (group.organizationId === null) continue;
            const values = publications.get(group.organizationId) ?? {}; publications.set(group.organizationId, values);
            values[window + '_published'] = Number(values[window + '_published'] ?? 0) + group._count;
            values[window + '_published_' + group.kind] = group._count;
          }
        }
        for (const row of rows) organizations.add({ id: row.id, name: row.name, email: row.email, description: row.description, status: row.organizationStatuses.name, createdAt: localTimestamp(row.createdAt), ...Object.fromEntries(publicationColumns.map(item => [item.key, publications.get(row.id)?.[item.key] ?? 0])), ...counterValues(period.get(String(row.id)), lifetime.get(String(row.id))) });
        cursor = rows.at(-1)!.id; await setImmediate();
      }
      organizations.finish();
      const rowCounts = Object.fromEntries(sheets.map(sheet => [sheet.name, sheet.count]));
      const dictionary = new WorkbookSheet(workbook, 'Diccionario', [column('sheet', 'Hoja'), column('field', 'Campo'), column('definition', 'Definición'), column('value', 'Valor')]);
      const metadata = { 'Versión del formato': '2', Desde: range.from, Hasta: range.to, 'Zona horaria': 'America/El_Salvador', 'Fecha de extracción UTC': snapshotAt.toISOString(), 'Fecha de referencia': reference,
        Usuarios: 'Padrón acumulado activo, no eliminado y sin roles administrativos; perfil actual.', Postulaciones: 'Todos los intentos enviados en el período, incluso fuera del padrón activo y sobre vacantes anteriores. Estado actual.',
        Oportunidades: 'Primera publicación dentro del período; incluye cerradas y archivadas. Categoría actual.', Organizaciones: 'Todas las organizaciones, activas e inactivas.',
        Acumulados: 'Todos los registros conservados al extraer, incluidos los que no tienen fecha; publicaciones acumuladas requieren publishedAt.', 'Datos ausentes': 'Celdas vacías. Los valores anteriores se conservan sin convertirlos.', 'Hojas numeradas': 'Continuaciones con las mismas columnas cuando se alcanza el límite de filas de Excel.' };
      for (const [field, value] of Object.entries(metadata)) dictionary.add({ field, value });
      for (const sheet of sheets) { dictionary.add({ sheet: sheet.name, field: 'Filas exportadas', value: sheet.count }); for (const item of sheet.columns) dictionary.add({ sheet: sheet.name, field: item.header, definition: item.description }); }
      dictionary.finish(); rowCounts.Diccionario = dictionary.count;
      return { snapshotAt, rowCounts };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 300_000, maxWait: 10_000 });
    if (writeError) throw writeError;
    await Promise.race([workbook.commit(), streamFailure]); return result;
  } catch (error: unknown) {
    stream.destroy(); throw error;
  }
}
