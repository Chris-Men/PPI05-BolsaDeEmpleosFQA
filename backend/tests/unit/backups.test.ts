import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import { BackupStorage } from '../../src/services/backup-storage.service.js';
import { BackupRuntime } from '../../src/services/backup-runtime.service.js';
import { backupScheduledSlot, nextBackupAt } from '../../src/services/backup-schedule.service.js';
import { restoreBackupSchema } from '../../src/validation/backup.schema.js';
import { readBackupPackage, writeBackupPackage } from '../../src/services/backup-package.service.js';

test('02:00 Salvador usa el calendario local y recupera el último horario vencido', () => {
  assert.equal(backupScheduledSlot(new Date('2026-01-01T07:59:59Z')), '2025-12-31');
  assert.equal(backupScheduledSlot(new Date('2026-01-01T08:00:00Z')), '2026-01-01');
  assert.equal(nextBackupAt(new Date('2026-01-01T07:59:59Z')), '2026-01-01T08:00:00.000Z');
  assert.equal(nextBackupAt(new Date('2026-12-31T08:00:00Z')), '2027-01-01T08:00:00.000Z');
});

test('respaldo permite lecturas, bloquea escrituras y espera los trabajadores iniciados', async () => {
  const runtime = new BackupRuntime(); const writer = runtime.enter(true)!; const worker = runtime.enterWorker()!;
  runtime.mode = 'READ_ONLY'; assert.equal(runtime.enter(true), null); assert.equal(runtime.enterWorker(), null);
  const reader = runtime.enter(false)!; assert.equal(typeof reader, 'function');
  await assert.rejects(runtime.drain(1)); writer(); worker(); worker(); await runtime.drain();
  runtime.mode = 'MAINTENANCE'; assert.equal(runtime.enter(false), null); await assert.rejects(runtime.drain(1)); reader(); await runtime.drain();
});

test('restaurar exige identificadores válidos, contraseña y texto exacto sin campos adicionales', () => {
  const value = { requestId: randomUUID(), backupId: randomUUID(), currentPassword: 'existente', confirmation: 'RESTAURAR' };
  assert.equal(restoreBackupSchema.safeParse(value).success, true);
  for (const change of [{ confirmation: 'restaurar' }, { currentPassword: '' }, { backupId: '../archivo' }, { directory: '/otro' }]) {
    assert.equal(restoreBackupSchema.safeParse({ ...value, ...change }).success, false);
  }
});

test('cifrado autenticado conserva bytes, detecta corrupción y publica sin eliminar el anterior prematuramente', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fqa-backup-unit-'));
  try {
    const key = randomBytes(32); const storage = new BackupStorage(root, key); await storage.initialize();
    const id = randomUUID(); await mkdir(storage.generation(id)); const content = Buffer.from('%PDF-1.7\ncontenido privado\n%%EOF');
    const artifact = await storage.encrypt(Readable.from(content), join(storage.generation(id), 'database.enc'));
    assert.equal((await readFile(join(storage.generation(id), 'database.enc'))).includes(content), false);
    await storage.decrypt(join(storage.generation(id), 'database.enc'), artifact, join(root, 'recovered'));
    assert.deepEqual(await readFile(join(root, 'recovered')), content);
    await storage.publish({ format: 1, id, createdAt: new Date().toISOString(), postgresMajor: 17, schemaHash: 'a'.repeat(64), activeSuperAdmins: 1, database: artifact, resumes: [{ key: randomUUID() + '.pdf', ...artifact }] });
    assert.equal((await storage.manifest(id)).id, id);
    await assert.rejects(new BackupStorage(root, randomBytes(32)).manifest(id));
    const failedId = randomUUID(); await mkdir(storage.generation(failedId));
    assert.equal(await storage.latestId(), id); await storage.prune(); assert.equal(await storage.latestId(), id);
    const encrypted = await readFile(join(storage.generation(id), 'database.enc')); encrypted[0] = encrypted[0]! ^ 1;
    await writeFile(join(storage.generation(id), 'database.enc'), encrypted);
    await assert.rejects(storage.decrypt(join(storage.generation(id), 'database.enc'), artifact, join(root, 'corrupt')));
    const manifest = JSON.parse(await readFile(join(storage.generation(id), 'manifest.json'), 'utf8')) as { payload: { activeSuperAdmins: number } };
    manifest.payload.activeSuperAdmins = 999; await writeFile(join(storage.generation(id), 'manifest.json'), JSON.stringify(manifest));
    await assert.rejects(storage.manifest(id)); assert.throws(() => storage.generation('../escape'));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('paquete portátil conserva DB y CV cifrados y rechaza clave incorrecta, truncados, rutas y bytes adicionales', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fqa-backup-package-test-'));
  try {
    const storage = new BackupStorage(root, randomBytes(32)); const id = randomUUID(); await mkdir(storage.generation(id));
    const dump = Buffer.from('PGDMP contenido de prueba'); const pdf = Buffer.from('%PDF-1.7\nCV privado\n%%EOF'); const key = randomUUID() + '.pdf';
    const database = await storage.encrypt(Readable.from(dump), join(storage.generation(id), 'database.enc'));
    const resume = await storage.encrypt(Readable.from(pdf), join(storage.generation(id), key + '.enc'));
    const manifest = { format: 1 as const, id, createdAt: new Date().toISOString(), postgresMajor: 17 as const, schemaHash: 'b'.repeat(64), activeSuperAdmins: 1, database, resumes: [{ key, ...resume }] };
    const path = join(root, 'export.fqabackup'); await writeBackupPackage(storage, manifest, path);
    const bytes = await readFile(path); assert.equal(bytes.includes(pdf), false); assert.equal(bytes.includes(dump), false);
    const importedId = randomUUID(); const imported = await readBackupPackage(storage, path, importedId);
    assert.equal(imported.id, importedId); assert.equal(imported.createdAt, manifest.createdAt);
    await storage.decrypt(join(storage.generation(importedId), 'database.enc'), imported.database, join(root, 'dump'));
    await storage.decrypt(join(storage.generation(importedId), key + '.enc'), imported.resumes[0]!, join(root, 'resume'));
    assert.deepEqual(await readFile(join(root, 'dump')), dump); assert.deepEqual(await readFile(join(root, 'resume')), pdf);
    await assert.rejects(readBackupPackage(new BackupStorage(root, randomBytes(32)), path, randomUUID()));
    for (const bad of [Buffer.alloc(0), Buffer.from('otro formato'), bytes.subarray(0, bytes.length - 1), Buffer.concat([bytes, Buffer.from('extra')])]) {
      await writeFile(join(root, 'invalid'), bad); await assert.rejects(readBackupPackage(storage, join(root, 'invalid'), randomUUID()));
    }
    const corrupted = Buffer.from(bytes); corrupted[corrupted.length - 1] = corrupted[corrupted.length - 1]! ^ 1;
    await writeFile(join(root, 'invalid'), corrupted); const corruptId = randomUUID(); const corrupt = await readBackupPackage(storage, join(root, 'invalid'), corruptId);
    await assert.rejects(storage.decrypt(join(storage.generation(corruptId), key + '.enc'), corrupt.resumes[0]!, join(root, 'bad-resume')));
    assert.throws(() => storage.serializeManifest({ ...manifest, resumes: [{ ...manifest.resumes[0]!, key: '../invalid.pdf' }] }));
    const duplicatePath = join(root, 'duplicate.fqabackup');
    await writeBackupPackage(storage, { ...manifest, resumes: [manifest.resumes[0]!, manifest.resumes[0]!] }, duplicatePath);
    await assert.rejects(readBackupPackage(storage, duplicatePath, randomUUID()));
  } finally { await rm(root, { recursive: true, force: true }); }
});
