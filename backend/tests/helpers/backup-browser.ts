import express from 'express';
import { randomUUID } from 'node:crypto';
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import bcrypt from 'bcrypt';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { prisma } from '../../src/config/prisma.js';
import { ROLE_NAMES } from '../../src/constants/authorization.constants.js';
import { backupCoordinator } from '../../src/services/backup.service.js';
import { backupRuntime } from '../../src/services/backup-runtime.service.js';

/** Browser fixtures and control endpoints exist only in an explicitly isolated test process. */
async function main(): Promise<void> {
  if (env.NODE_ENV !== 'test' || !new URL(env.DATABASE_URL).pathname.endsWith('_test') || !env.BACKUP_DIRECTORY?.includes('test') || !env.RESUME_STORAGE_DIRECTORY?.includes('test')) throw new Error('Entorno de pruebas obligatorio.');
  const prefix = 'backup-browser-' + randomUUID(); const ids: number[] = []; const accounts: Record<string, string> = {};
  const passwordHash = await bcrypt.hash('Respaldo de navegador 2026', 12);
  for (const [role, name] of Object.entries(ROLE_NAMES)) {
    const user = await prisma.user.create({ data: { email: prefix + '-' + role.toLowerCase() + '@example.test', passwordHash,
      status: { connect: { name: 'Activo' } }, profile: { create: { firstName: 'Prueba', lastName: role } }, userRoles: { create: { roles: { connect: { name } } } } } });
    ids.push(user.id); accounts[role] = user.email;
  }
  const candidate = await prisma.user.findFirstOrThrow({ where: { email: accounts.CANDIDATE } });
  const key = randomUUID() + '.pdf'; await writeFile(join(env.RESUME_STORAGE_DIRECTORY!, key), '%PDF-1.7\nCV de navegador\n%%EOF');
  const file = await prisma.files.create({ data: { userId: candidate.id, filePath: key, fileType: 'RESUME', originalName: 'curriculum.pdf', mimeType: 'application/pdf', sizeBytes: 32 } });
  await prisma.userProfile.update({ where: { userId: candidate.id }, data: { resumeFileId: file.id } });
  const harness = express(); let release: (() => void) | undefined;
  harness.get('/__test/fixture', (_request, response) => response.json({ accounts }));
  harness.post('/__test/hold', (_request, response) => { release ??= backupRuntime.enterWorker() ?? undefined; response.sendStatus(204); });
  harness.post('/__test/release', (_request, response) => { release?.(); release = undefined; response.sendStatus(204); });
  harness.post('/__test/mutate', async (_request, response) => {
    await prisma.userProfile.update({ where: { userId: candidate.id }, data: { firstName: 'Cambio posterior' } });
    await unlink(join(env.RESUME_STORAGE_DIRECTORY!, key)); response.sendStatus(204);
  });
  harness.get('/__test/restored', async (_request, response) => {
    const profile = await prisma.userProfile.findUniqueOrThrow({ where: { userId: candidate.id } });
    response.json({ restored: profile.firstName === 'Prueba' });
  });
  harness.post('/__test/cleanup', async (_request, response) => {
    release?.(); await backupCoordinator.stop();
    await prisma.auditLogs.deleteMany({ where: { userId: { in: ids } } }); await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect(); response.sendStatus(204); server.close();
  });
  harness.use(createApp());
  await backupCoordinator.start();
  const server = harness.listen(3001, '0.0.0.0', () => console.info('API de respaldos aislada preparada.'));
}
void main().catch(() => { console.error('No se pudo iniciar la revisión visual de respaldos.'); process.exitCode = 1; });
