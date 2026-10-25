import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import ExcelJS from 'exceljs';
import { WorkbookSheet, workbookAge } from '../../src/services/statistics-workbook.service.js';
import { createStatisticsExportSchema } from '../../src/validation/statistics-export.schema.js';
import { assertStatisticsExportAccess } from '../../src/services/statistics-export.service.js';

test('Excel exige confirmación, UUID, fechas reales y un rango ordenado', () => {
  const payload = { from: '2026-01-01', to: '2026-01-31', confirmed: true, requestId: randomUUID() };
  assert.ok(createStatisticsExportSchema.safeParse(payload).success);
  for (const variant of [{ confirmed: false }, { confirmed: undefined }, { requestId: 'incorrecto' }, { from: '2026-02-30' }, { from: '2026-02-01' }, { userId: 3 }]) assert.ok(!createStatisticsExportSchema.safeParse({ ...payload, ...variant }).success);
  for (const roles of [[], ['CANDIDATE'] as const]) assert.throws(() => assertStatisticsExportAccess({ userId: 1, roles: [...roles], permissions: ['statistics.read', 'statistics.export'] }));
  assert.throws(() => assertStatisticsExportAccess({ userId: 1, roles: ['ADMINISTRATOR'], permissions: ['statistics.read'] }));
  assert.doesNotThrow(() => assertStatisticsExportAccess({ userId: 1, roles: ['ADMINISTRATOR'], permissions: ['statistics.read', 'statistics.export'] }));
  assert.equal(workbookAge(new Date('2000-10-25'), '2026-10-24'), 25);
  assert.equal(workbookAge(new Date('2000-10-24'), '2026-10-24'), 26);
  assert.equal(workbookAge(new Date('2030-01-01'), '2026-10-24'), null);
});

test('XLSX continúa hojas completas y mantiene texto, números y booleanos sin fórmulas', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fqa-export-unit-'));
  try {
    const path = join(directory, 'fixture.xlsx'); const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: path, useStyles: true });
    const sheet = new WorkbookSheet(workbook, 'Usuarios', [{ key: 'text', header: 'Texto', description: 'Texto literal' }, { key: 'count', header: 'Cantidad', description: 'Número' }, { key: 'active', header: 'Activo', description: 'Booleano' }], 3);
    for (let index = 0; index < 5; index++) sheet.add({ text: index ? '00001234' : '=SUM(1,2)', count: index, active: true });
    assert.throws(() => sheet.add({ text: 'x'.repeat(32_768) }));
    sheet.finish(); await workbook.commit();
    const parsed = new ExcelJS.Workbook(); await parsed.xlsx.readFile(path);
    assert.deepEqual(parsed.worksheets.map(item => [item.name, item.rowCount]), [['Usuarios', 3], ['Usuarios 2', 3], ['Usuarios 3', 2]]);
    for (const part of parsed.worksheets) assert.equal(part.getCell('A1').value, 'Texto');
    assert.equal(parsed.worksheets[0]!.getCell('A2').type, ExcelJS.ValueType.String);
    assert.equal(parsed.worksheets[0]!.getCell('A2').value, '=SUM(1,2)');
    assert.equal(parsed.worksheets[0]!.getCell('B2').type, ExcelJS.ValueType.Number);
    assert.equal(parsed.worksheets[0]!.getCell('C2').type, ExcelJS.ValueType.Boolean);
    assert.equal(parsed.worksheets[1]!.getCell('A2').value, '00001234');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
