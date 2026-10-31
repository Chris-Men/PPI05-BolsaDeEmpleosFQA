import '../helpers/unit-environment.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { envSchema } from '../../src/config/env.js';

/** Production-shaped configuration with synthetic credentials and no live services. */
const production = {
  NODE_ENV: 'production', CORS_ORIGIN: 'https://empleos.example.test',
  DATABASE_URL: 'postgresql://unit_test:unit_test@127.0.0.1:1/production_storage_test',
  JWT_SECRET: 'unit-test-signing-key-with-more-than-thirty-two-characters',
  SMTP_HOST: 'smtp.example.test', SMTP_FROM: 'notificaciones@example.test',
  RESET_PASSWORD_URL: 'https://empleos.example.test/reset-password', MAIL_OUTBOX_KEY: 'a'.repeat(64),
  RESUME_STORAGE_DRIVER: 'filesystem', RESUME_STORAGE_DIRECTORY: '/app/private/resumes',
  BACKUPS_ENABLED: 'true', BACKUP_DIRECTORY: '/app/private/backups', BACKUP_ENCRYPTION_KEY: 'b'.repeat(64),
};

test('producción admite volúmenes privados y una clave de respaldo válida', () => {
  const parsed = envSchema.parse(production);
  assert.equal(parsed.BACKUPS_ENABLED, true);
  assert.equal(parsed.RESUME_STORAGE_DRIVER, 'filesystem');
});

test('producción rechaza almacenamiento incompleto antes de iniciar trabajadores', () => {
  for (const field of ['RESUME_STORAGE_DRIVER', 'RESUME_STORAGE_DIRECTORY', 'BACKUP_DIRECTORY', 'BACKUP_ENCRYPTION_KEY'] as const) {
    assert.equal(envSchema.safeParse({ ...production, [field]: undefined }).success, false, field);
  }
  for (const key of ['', ' ', 'b'.repeat(63), 'g'.repeat(64), 'b'.repeat(65)]) {
    const result = envSchema.safeParse({ ...production, BACKUP_ENCRYPTION_KEY: key });
    assert.equal(result.success, false);
    if (!result.success && key.length > 1) assert.equal(JSON.stringify(result.error.issues).includes(key), false);
  }
  for (const field of ['RESUME_STORAGE_DIRECTORY', 'BACKUP_DIRECTORY'] as const) {
    assert.equal(envSchema.safeParse({ ...production, [field]: '   ' }).success, false);
  }
});

test('desactivar respaldos mantiene CV disponible sin exigir directorio ni clave de respaldo', () => {
  const parsed = envSchema.parse({ ...production, BACKUPS_ENABLED: 'false', BACKUP_DIRECTORY: undefined, BACKUP_ENCRYPTION_KEY: undefined });
  assert.equal(parsed.BACKUPS_ENABLED, false);
});

test('desarrollo conserva la configuración opcional y las pruebas siguen aisladas', () => {
  for (const mode of ['development', 'test']) {
    assert.equal(envSchema.safeParse({ ...production, NODE_ENV: mode, RESUME_STORAGE_DRIVER: undefined,
      RESUME_STORAGE_DIRECTORY: undefined, BACKUP_DIRECTORY: undefined, BACKUP_ENCRYPTION_KEY: undefined }).success, true);
  }
});
