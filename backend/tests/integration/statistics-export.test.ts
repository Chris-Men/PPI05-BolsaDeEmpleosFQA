import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import bcrypt from 'bcrypt';
import { prisma } from '../../src/config/prisma.js';
import { env } from '../../src/config/env.js';
import { createApp } from '../../src/app.js';
import { ROLE_NAMES } from '../../src/constants/authorization.constants.js';
import { ORGANIZATION_STATUS_NAMES } from '../../src/constants/organization.constants.js';
import { seedAccountCatalogs } from '../../src/services/catalog.service.js';
import { claimStatisticsExport, processStatisticsExport, cleanupStatisticsExports, statisticsExportPath, startStatisticsExportWorker } from '../../src/services/statistics-export.service.js';
import { generateStatisticsWorkbook } from '../../src/services/statistics-workbook.service.js';
import { backupRuntime } from '../../src/services/backup-runtime.service.js';
import { startTestServer, stopTestServer, type TestServer } from '../helpers/http.js';

interface Actor { id: number; token: string }
interface Ticket { id: number; status: string; fileName: string; rowCounts: Record<string, number>; expiresAt: string }
const run = 'excel-' + randomUUID(); const ids: number[] = []; const organizationIds: number[] = []; const jobIds: number[] = []; const volunteerIds: number[] = [];
let api: TestServer; let admin: Actor; let otherAdmin: Actor; let candidate: Actor; let missing: number; let disabled: number; let deleted: number; let ready: Ticket;
let originalDirectory: string | undefined;
const range = { from: '2030-01-02', to: '2030-01-02' };
/** Test credentials remain in memory and never enter assertion output. */
const request = (method: string, path: string, actor?: Actor, body?: unknown, mutation = true) => fetch(api.baseUrl + '/api/admin/statistics/exports' + path, {
  method, headers: { 'Content-Type': 'application/json', ...(mutation ? { 'X-FQA-Request': '1' } : {}), ...(actor ? { Authorization: 'Bearer ' + actor.token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body),
});
const payload = () => ({ ...range, confirmed: true, requestId: randomUUID() });
const json = async <T>(response: Response, expected = 200): Promise<T> => { assert.equal(response.status, expected); return await response.json() as T; };
/** Columns are located by their public labels rather than hard-coded column offsets. */
const value = (sheet: ExcelJS.Worksheet, row: number, header: string): ExcelJS.CellValue => {
  let index = 0; sheet.getRow(1).eachCell((cell, column) => { if (cell.value === header) index = column; }); assert.ok(index, header); return sheet.getRow(row).getCell(index).value;
};
const findRow = (sheet: ExcelJS.Worksheet, header: string, expected: ExcelJS.CellValue): number => {
  for (let row = 2; row <= sheet.rowCount; row++) if (value(sheet, row, header) === expected) return row; assert.fail('Fila esperada no encontrada.');
};

describe('exportación XLSX persistente y privada', () => {
  before(async () => {
    assert.equal(env.NODE_ENV, 'test'); assert.ok(new URL(env.DATABASE_URL).pathname.endsWith('_test')); assert.ok(env.STATISTICS_EXPORT_DIRECTORY);
    originalDirectory = env.STATISTICS_EXPORT_DIRECTORY; await seedAccountCatalogs(prisma); api = await startTestServer(createApp());
    const password = 'Excel de integración 2026'; const hash = await bcrypt.hash(password, 12);
    const account = async (name: string, roles: string[], status = 'Activo', deletedAt: Date | null = null, profile = true): Promise<Actor> => {
      const user = await prisma.user.create({ data: { email: run + '-' + name + '@example.test', passwordHash: hash, deletedAt, status: { connect: { name: status } }, userRoles: { create: roles.map(name => ({ roles: { connect: { name } } })) },
        ...(profile ? { profile: { create: { firstName: name, lastName: 'Prueba', phone: '01234567', birthDate: new Date('2000-02-29'), sex: 'UNDISCLOSED', educationLevel: 'Valor histórico', department: 'Departamento anterior', professionalSummary: '=SUM(1,2)' } } } : {}) } });
      ids.push(user.id); let token = '';
      if (!deletedAt && status === 'Activo') { const response = await fetch(api.baseUrl + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-FQA-Request': '1' }, body: JSON.stringify({ email: user.email, password }) }); token = (await json<{ accessToken: string }>(response)).accessToken; }
      return { id: user.id, token };
    };
    admin = await account('admin', [ROLE_NAMES.ADMINISTRATOR]); otherAdmin = await account('mixed', [ROLE_NAMES.ADMINISTRATOR, ROLE_NAMES.CANDIDATE]);
    candidate = await account('candidate', [ROLE_NAMES.CANDIDATE]); missing = (await account('missing', [ROLE_NAMES.CANDIDATE], 'Activo', null, false)).id;
    disabled = (await account('disabled-private', [ROLE_NAMES.CANDIDATE], 'Deshabilitado')).id; deleted = (await account('deleted-private', [ROLE_NAMES.CANDIDATE], 'Activo', new Date())).id;
    for (const status of [ORGANIZATION_STATUS_NAMES.ACTIVE, ORGANIZATION_STATUS_NAMES.INACTIVE]) organizationIds.push((await prisma.organizations.create({ data: { name: run + '-' + status, organizationStatuses: { connect: { name: status } } } })).id);
    const state = await prisma.jobStatuses.findUniqueOrThrow({ where: { name: 'Cerrada' } });
    for (const [index, kind] of (['EMPLOYMENT', 'SOCIAL_HOURS', 'INTERNSHIP', 'EMPLOYMENT'] as const).entries()) jobIds.push((await prisma.jobs.create({ data: { title: 'Oferta Excel ' + index, slug: run + '-job-' + index, kind, description: 'Datos de prueba.', organizationId: organizationIds[0], statusId: state.id, publishedAt: new Date(index === 3 ? '2020-01-01T12:00:00Z' : '2030-01-02T06:00:00Z'), archivedAt: index === 0 ? new Date() : null } })).id);
    const volunteer = await prisma.volunteerOpportunities.create({ data: { title: 'Voluntariado Excel', slug: run + '-vol', description: 'Prueba.', organizations: { connect: { id: organizationIds[0]! } }, volunteerStatuses: { connect: { name: 'Cerrada' } }, publishedAt: new Date('2030-01-03T05:59:59.999Z') } }); volunteerIds.push(volunteer.id);
    const registration = await prisma.volunteerRegistrations.create({ data: { userId: candidate.id, volunteerOpportunityId: volunteer.id } });
    await prisma.volunteerRegistrations.create({ data: { userId: missing, volunteerOpportunityId: volunteer.id } });
    const statuses = await prisma.applicationStatuses.findMany(); const statusId = (name: string) => statuses.find(row => row.name === name)!.id;
    const apps = [
      { userId: candidate.id, jobId: jobIds[0], statusId: statusId('Pendiente'), attemptNumber: 1 },
      { userId: candidate.id, jobId: jobIds[0], statusId: statusId('Retirada'), attemptNumber: 2 },
      { userId: candidate.id, jobId: jobIds[1], statusId: statusId('Seleccionada'), attemptNumber: 1 },
      { userId: disabled, jobId: jobIds[2], statusId: statusId('Pendiente'), attemptNumber: 1 },
      { userId: deleted, jobId: jobIds[3], statusId: statusId('Pendiente'), attemptNumber: 1 },
      { userId: candidate.id, volunteerRegistrationId: registration.id, statusId: statusId('Pendiente'), attemptNumber: 1 },
      { userId: candidate.id, volunteerRegistrationId: registration.id, statusId: statusId('Retirada'), attemptNumber: 2 },
    ];
    for (const app of apps) await prisma.applications.create({ data: { ...app, referenceNumber: randomUUID(), createdAt: new Date('2030-01-02T12:00:00Z') } });
    for (const [index, at] of ['2030-01-02T05:59:59.999Z', '2030-01-03T06:00:00Z'].entries()) await prisma.applications.create({ data: { userId: candidate.id, jobId: jobIds[3], attemptNumber: index + 2, statusId: statusId('Pendiente'), referenceNumber: randomUUID(), createdAt: new Date(at) } });
  });
  after(async () => {
    env.STATISTICS_EXPORT_DIRECTORY = originalDirectory; backupRuntime.mode = 'OPEN';
    await prisma.jobs.deleteMany({ where: { id: { in: jobIds } } }); await prisma.volunteerOpportunities.deleteMany({ where: { id: { in: volunteerIds } } });
    await prisma.auditLogs.deleteMany({ where: { userId: { in: ids } } }); await prisma.user.deleteMany({ where: { id: { in: ids } } }); await prisma.organizations.deleteMany({ where: { id: { in: organizationIds } } });
    await seedAccountCatalogs(prisma); if (api) await stopTestServer(api.server); await prisma.$disconnect();
  });
  it('exige sesión, permisos, consentimiento y encabezado; no acepta identidad del solicitante', async () => {
    assert.equal((await request('POST', '', undefined, payload())).status, 401);
    assert.equal((await request('POST', '', candidate, payload())).status, 403);
    assert.equal((await request('POST', '', admin, payload(), false)).status, 403);
    for (const variant of [{ confirmed: false }, { from: '2030-02-30' }, { userId: candidate.id }]) assert.equal((await request('POST', '', admin, { ...payload(), ...variant })).status, 400);
  });
  it('encola sin generar sincrónicamente, deduplica y reclama un solo trabajo global', async () => {
    const body = payload(); const results = await Promise.all([request('POST', '', admin, body), request('POST', '', admin, body)]);
    const first = await json<Ticket>(results[0]!, 202); const duplicate = await json<Ticket>(results[1]!, 202); assert.equal(first.id, duplicate.id); assert.equal(first.status, 'QUEUED');
    assert.equal((await json<Ticket>(await request('POST', '', admin, payload()), 202)).id, first.id);
    assert.equal((await request('POST', '', admin, { ...body, to: '2030-01-03' })).status, 409);
    assert.equal((await request('GET', '/' + first.id, otherAdmin)).status, 404);
    assert.equal((await request('GET', '/' + first.id + '/file', admin)).status, 409);
    const claimed = await Promise.all([claimStatisticsExport(), claimStatisticsExport()]); assert.equal(claimed.filter(Boolean).length, 1);
    await processStatisticsExport(claimed.find(job => job !== null)!);
    ready = await json<Ticket>(await request('GET', '/' + first.id, admin)); assert.equal(ready.status, 'READY');
    assert.equal(ready.rowCounts.Usuarios, 2); assert.equal(ready.rowCounts.Oportunidades, 4); assert.equal(ready.rowCounts.Postulaciones, 7); assert.equal(ready.rowCounts.Organizaciones, 2);
  });
  it('el XLSX conserva relaciones, privacidad, tipos, intentos, catálogos históricos y límites del día', async () => {
    const response = await request('GET', '/' + ready.id + '/file', admin); assert.equal(response.status, 200); assert.ok(response.headers.get('content-type')?.includes('spreadsheetml'));
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await response.arrayBuffer());
    assert.deepEqual(workbook.worksheets.map(sheet => sheet.name), ['Usuarios', 'Oportunidades', 'Postulaciones', 'Organizaciones', 'Diccionario']);
    const users = workbook.getWorksheet('Usuarios')!; const row = findRow(users, 'ID candidato', candidate.id);
    assert.equal(value(users, row, 'Teléfono'), '01234567'); assert.equal(value(users, row, 'Resumen profesional'), '=SUM(1,2)');
    assert.equal(value(users, row, 'Nivel educativo'), 'Valor histórico'); assert.equal(value(users, row, 'Sexo'), 'UNDISCLOSED');
    const birth = value(users, row, 'Fecha de nacimiento'); assert.ok(birth instanceof Date); assert.equal(birth.toISOString(), '2000-02-29T00:00:00.000Z');
    assert.equal(value(users, row, 'Postulaciones (período)'), 5); assert.equal(value(users, row, 'Postulaciones (acumulado)'), 7);
    assert.equal(value(users, row, 'Oportunidades distintas (período)'), 3); assert.equal(value(users, row, 'Voluntariados distintos (período)'), 1); assert.equal(value(users, row, 'Voluntariado (período)'), 2); assert.equal(value(users, row, 'Seleccionadas (período)'), 1);
    const empty = findRow(users, 'ID candidato', missing); assert.equal(value(users, empty, 'Postulaciones (acumulado)'), 0); assert.equal(value(users, empty, 'Nombres'), null);
    const applications = workbook.getWorksheet('Postulaciones')!;
    const historical = findRow(applications, 'ID candidato', deleted); assert.equal(value(applications, historical, 'Clave oportunidad'), 'job-' + jobIds[3]); assert.equal(value(applications, historical, 'En padrón activo'), false);
    const sent = value(applications, historical, 'Fecha de envío'); assert.ok(sent instanceof Date); assert.equal(sent.toISOString(), '2030-01-02T06:00:00.000Z');
    const organizations = workbook.getWorksheet('Organizaciones')!; const active = findRow(organizations, 'ID organización', organizationIds[0]!); const inactive = findRow(organizations, 'ID organización', organizationIds[1]!);
    assert.equal(value(organizations, active, 'Postulaciones (período)'), 7); assert.equal(value(organizations, active, 'Candidatos distintos (período)'), 3); assert.equal(value(organizations, active, 'Publicaciones (período)'), 4); assert.equal(value(organizations, inactive, 'Publicaciones (período)'), 0);
    const all = JSON.stringify(workbook.worksheets.map(sheet => sheet.getSheetValues()));
    for (const forbidden of ['disabled-private', 'deleted-private', 'passwordHash', 'profileSnapshot', 'submissionKey']) assert.ok(!all.includes(forbidden), forbidden);
    assert.equal(await prisma.auditLogs.count({ where: { entityType: 'StatisticsExport', entityId: ready.id, action: 'DOWNLOAD' } }), 1);
  });
  it('revalida permisos de descarga y respeta la pausa de respaldos', async () => {
    const permission = await prisma.permissions.findUniqueOrThrow({ where: { name: 'statistics.export' } }); const role = await prisma.role.findUniqueOrThrow({ where: { name: ROLE_NAMES.ADMINISTRATOR } });
    await prisma.rolePermissions.delete({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } } });
    try { assert.equal((await request('GET', '/' + ready.id + '/file', admin)).status, 403); } finally { await seedAccountCatalogs(prisma); }
    const job = await json<Ticket>(await request('POST', '', otherAdmin, payload()), 202);
    backupRuntime.mode = 'MAINTENANCE'; const stop = startStatisticsExportWorker(); await new Promise(resolve => setTimeout(resolve, 30)); stop();
    assert.equal((await prisma.statisticsExport.findUniqueOrThrow({ where: { id: job.id } })).status, 'QUEUED'); backupRuntime.mode = 'OPEN';
    await prisma.statisticsExport.update({ where: { id: job.id }, data: { status: 'PROCESSING', attempts: 1, leaseToken: randomUUID(), lockedUntil: new Date(0) } });
    const recovered = await claimStatisticsExport(); assert.equal(recovered?.id, job.id); assert.equal(recovered?.attempts, 2); await processStatisticsExport(recovered!);
    assert.equal((await json<Ticket>(await request('GET', '/' + job.id, otherAdmin))).status, 'READY');
  });
  it('reintenta fallos transitorios sin publicar parciales y agota tres intentos', async () => {
    const job = await json<Ticket>(await request('POST', '', admin, payload()), 202);
    const obstruction = join(originalDirectory!, 'obstruction'); await writeFile(obstruction, 'fixture'); env.STATISTICS_EXPORT_DIRECTORY = obstruction;
    try {
      for (let attempt = 1; attempt <= 3; attempt++) {
        await prisma.statisticsExport.update({ where: { id: job.id }, data: { nextAttemptAt: new Date(0) } }); const claimed = await claimStatisticsExport(); assert.equal(claimed?.id, job.id); await processStatisticsExport(claimed!);
        const state = await prisma.statisticsExport.findUniqueOrThrow({ where: { id: job.id } }); assert.equal(state.status, attempt === 3 ? 'FAILED' : 'QUEUED'); assert.equal(state.fileKey, null);
      }
    } finally { env.STATISTICS_EXPORT_DIRECTORY = originalDirectory; }
  });
  it('vence archivos a las 24 horas y los elimina sin permitir descarga posterior', async () => {
    const job = await prisma.statisticsExport.findUniqueOrThrow({ where: { id: ready.id } }); const path = statisticsExportPath(job.fileKey!); assert.ok((await stat(path)).isFile());
    await prisma.statisticsExport.update({ where: { id: job.id }, data: { expiresAt: new Date(0) } });
    assert.equal((await request('GET', '/' + job.id + '/file', admin)).status, 410); await cleanupStatisticsExports(); await assert.rejects(readFile(path));
    assert.equal((await json<Ticket>(await request('GET', '/' + job.id, admin))).status, 'EXPIRED');
  });
  it('exporta más de un lote sin omitir filas y mantiene las hojas cuando no hay actividad', async () => {
    const state = await prisma.jobStatuses.findUniqueOrThrow({ where: { name: 'Cerrada' } });
    const rows = await prisma.jobs.createManyAndReturn({ data: Array.from({ length: 505 }, (_, index) => ({ title: 'Lote Excel ' + index, slug: run + '-bulk-' + index, description: 'Prueba.', organizationId: organizationIds[0], statusId: state.id, publishedAt: new Date('2032-01-01T12:00:00Z') })), select: { id: true } }); jobIds.push(...rows.map(row => row.id));
    const first = await generateStatisticsWorkbook(join(originalDirectory!, 'bulk.xlsx'), { from: '2032-01-01', to: '2032-01-01' }); assert.equal(first.rowCounts.Oportunidades, 505);
    const empty = await generateStatisticsWorkbook(join(originalDirectory!, 'empty.xlsx'), { from: '2099-01-01', to: '2099-01-01' }); assert.equal(empty.rowCounts.Oportunidades, 0); assert.equal(empty.rowCounts.Postulaciones, 0); assert.equal(empty.rowCounts.Usuarios, 2);
  });
});
