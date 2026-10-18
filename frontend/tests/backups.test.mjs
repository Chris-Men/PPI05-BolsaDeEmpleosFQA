import './helpers/typescript.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const { canManageBackups } = await import('../src/utils/backupManagement.ts');
const { createBackup, restoreBackup, getBackupOperation, getBackupStatus } = await import('../src/services/backupService.ts');
const { configureAuthentication } = await import('../src/services/api.ts');
const { backupOperationStore } = await import('../src/services/backupOperationStore.ts');

test('respaldos exigen rol Super Admin y cada permiso vigente', () => {
  assert.equal(canManageBackups({ roles: ['ADMINISTRATOR'], permissions: ['database.backup', 'database.restore'] }), false);
  assert.equal(canManageBackups({ roles: ['SUPER_ADMIN'], permissions: ['database.backup'] }), true);
  assert.equal(canManageBackups({ roles: ['SUPER_ADMIN'], permissions: ['database.backup'] }, 'database.restore'), false);
  assert.equal(canManageBackups(null), false);
});

test('comandos mantienen identidad; seguimiento usa credencial limitada fuera de URL y no renueva sesiones', async context => {
  const calls = []; let refreshes = 0; let userId = 4;
  configureAuthentication({ getToken: () => 'test-access', getUserId: () => userId, refresh: async () => { refreshes += 1; }, invalidate: () => {} });
  context.mock.method(globalThis, 'fetch', async (url, options) => { calls.push({ url, options }); return Response.json({}); });
  const operation = { id: '550e8400-e29b-41d4-a716-446655440000', startedAt: new Date().toISOString(), kind: 'BACKUP', phase: 'QUEUED', finishedAt: null, message: '' };
  const ticket = { operation, monitorToken: 'a'.repeat(64) };
  await getBackupStatus(4); await createBackup(operation.id, 4);
  await restoreBackup({ requestId: operation.id, backupId: operation.id, currentPassword: 'test-only', confirmation: 'RESTAURAR' }, 4);
  await getBackupOperation(ticket);
  assert.equal(calls[3].options.headers.get('X-FQA-Operation-Token'), ticket.monitorToken);
  assert.equal(calls[3].options.headers.has('Authorization'), false);
  assert.ok(calls.every(call => !call.url.includes(ticket.monitorToken)));
  userId = 5; await assert.rejects(createBackup(operation.id, 4)); assert.equal(calls.length, 4); assert.equal(refreshes, 0);
  backupOperationStore.start(4, ticket); backupOperationStore.identityChanged(5); assert.equal(backupOperationStore.getSnapshot(), null);
});
