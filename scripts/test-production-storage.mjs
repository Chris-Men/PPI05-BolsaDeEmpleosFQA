import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(join(tmpdir(), 'fqa-production-storage-test-'));
const project = 'fqa-storage-test-' + randomUUID().slice(0, 8);
const image = 'fqa-production-storage-test:local';
const buildImage = 'fqa-production-storage-build-test:local';
const password = randomBytes(24).toString('hex');
const databasePassword = randomBytes(24).toString('hex');
const backupKey = randomBytes(32).toString('hex');
const jwtSecret = randomBytes(48).toString('hex');
const mailKey = randomBytes(32).toString('hex');
const databaseUrl = `postgresql://fqa_storage_test:${databasePassword}@postgres:5432/fqa_production_storage_test?schema=public`;
const secrets = [password, databasePassword, backupKey, jwtSecret, mailKey];
// Host shell variables must never override the disposable Compose database or volumes.
const dockerEnvironment = { ...process.env };
for (const key of ['COMPOSE_PROJECT_NAME', 'COMPOSE_PROFILES', 'COMPOSE_FILE', 'DOMAIN', 'GHCR_OWNER', 'IMAGE_TAG',
  'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'DATABASE_URL', 'JWT_SECRET', 'MAIL_OUTBOX_KEY',
  'BACKUP_ENCRYPTION_KEY', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_FROM', 'SMTP_USER', 'SMTP_PASS']) {
  delete dockerEnvironment[key];
}
const compose = ['compose', '--project-name', project, '--env-file', join(temporary, '.env'),
  '-f', join(repository, 'docker-compose.yml'), '-f', join(temporary, 'override.json')];
let initialized = false;

/** Docker receives argument arrays and stdin directly; credentials never pass through a shell. */
function docker(args, input) {
  try {
    return execFileSync('docker', args, { cwd: repository, env: dockerEnvironment,
      encoding: 'utf8', input, maxBuffer: 32 * 1024 * 1024 });
  } catch (error) {
    const detail = error && typeof error === 'object' && 'stdout' in error ? String(error.stdout) : '';
    const sanitized = secrets.reduce((value, secret) => value.replaceAll(secret, '[oculto]'), detail);
    const lines = sanitized.split('\n');
    const failures = lines.flatMap((line, index) => /not ok \d|failureType:/.test(line) ? lines.slice(Math.max(0, index - 2), index + 30) : []);
    if (failures.length) console.error(failures.join('\n').slice(0, 12000));
    if (sanitized) console.error(sanitized.slice(-2000));
    throw new Error('Falló una etapa Docker de la aceptación de almacenamiento.');
  }
}

/** Bounded waits cover maintenance gates without retrying ordinary validation failures. */
async function eventually(action) {
  const deadline = Date.now() + 90_000;
  let lastError;
  while (Date.now() < deadline) {
    try { return await action(); } catch (error) { lastError = error; }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw lastError ?? new Error('La verificación no terminó a tiempo.');
}

try {
  const environment = { COMPOSE_PROJECT_NAME: project, DOMAIN: 'storage.example.test', GHCR_OWNER: 'fqa-test', IMAGE_TAG: 'local',
    POSTGRES_DB: 'fqa_production_storage_test', POSTGRES_USER: 'fqa_storage_test', POSTGRES_PASSWORD: databasePassword,
    DATABASE_URL: databaseUrl, JWT_SECRET: jwtSecret, MAIL_OUTBOX_KEY: mailKey, BACKUP_ENCRYPTION_KEY: backupKey,
    SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_SECURE: 'false', SMTP_FROM: 'storage@example.test' };
  await writeFile(join(temporary, '.env'), Object.entries(environment).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { mode: 0o600 });
  await writeFile(join(temporary, 'override.json'), JSON.stringify({ services: {
    proxy: { profiles: ['web'] }, frontend: { profiles: ['web'] },
    mailpit: { image: 'axllent/mailpit:v1.27', profiles: ['integration'] },
    backend: { image, pull_policy: 'never', ports: ['127.0.0.1::3000'], environment: { FQA_STORAGE_TEST_PASSWORD: password } },
  } }), { mode: 0o600 });
  docker([...compose, 'config', '--quiet']);
  const resolved = JSON.parse(docker([...compose, 'config', '--format', 'json']));
  assert.equal(resolved.services.backend.environment.DATABASE_URL, databaseUrl);
  assert.equal(resolved.services.backend.environment.NODE_ENV, 'production');
  assert.equal(resolved.services.postgres.environment.POSTGRES_DB, 'fqa_production_storage_test');
  for (const volume of Object.values(resolved.volumes)) assert.ok(volume.name.startsWith(project + '_'));
  if (!process.argv.includes('--skip-build')) {
    console.info('Construyendo la imagen final de producción…');
    docker(['build', '--target', 'production', '-t', image, 'backend']);
  }
  for (const program of ['pg_dump', 'pg_restore', 'psql']) {
    assert.match(docker(['run', '--rm', image, program, '--version']), /\b17\./);
  }
  initialized = true;
  console.info('Iniciando PostgreSQL exclusivo de pruebas…');
  docker([...compose, 'up', '-d', '--wait', 'postgres']);

  if (process.argv.includes('--integration')) {
    console.info('Ejecutando integración en una segunda base aislada…');
    docker([...compose, 'up', '-d', '--wait', 'mailpit']);
    docker(['build', '--target', 'build', '-t', buildImage, 'backend']);
    docker([...compose, 'exec', '-T', 'postgres', 'psql', '-U', 'fqa_storage_test', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1',
      '-c', 'CREATE DATABASE fqa_storage_integration_test']);
    const output = docker(['run', '--rm', '--network', `${project}_default`, '--env-file', join(temporary, '.env'),
      '-e', 'NODE_ENV=test', '-e', 'DATABASE_URL=postgresql://unused:unused@postgres:5432/development_placeholder',
      '-e', 'SMTP_HOST=mailpit', '-e', 'SMTP_PORT=1025', '-e', 'SMTP_SECURE=false',
      '-e', `TEST_DATABASE_URL=${databaseUrl.replace('/fqa_production_storage_test', '/fqa_storage_integration_test')}`,
      '--mount', `type=bind,source=${join(repository, 'backend', 'tests')},target=/app/tests,readonly`,
      '--mount', `type=bind,source=${join(repository, 'backend', 'scripts')},target=/app/scripts,readonly`,
      buildImage, 'npm', 'run', 'test:integration']);
    console.info(output.split('\n').filter(line => /^# (tests|pass|fail|duration_ms) /.test(line)).join('\n'));
  }

  docker([...compose, 'run', '--rm', '--no-deps', '-T', 'backend', 'node', 'node_modules/prisma/build/index.js', 'migrate', 'deploy']);
  docker([...compose, 'run', '--rm', '--no-deps', '-T', 'backend', 'npm', 'run', 'prisma:seed:production']);
  docker([...compose, 'run', '--rm', '--no-deps', '-T', 'backend', 'node', '--input-type=module'], `
    import { PrismaClient } from '@prisma/client';
    import bcrypt from 'bcrypt';
    const db = new PrismaClient();
    if (!new URL(process.env.DATABASE_URL).pathname.endsWith('_test')) throw new Error('Base de pruebas obligatoria.');
    try {
      await db.user.create({ data: { email: 'admin@storage.example.test',
        passwordHash: await bcrypt.hash(process.env.FQA_STORAGE_TEST_PASSWORD, 12),
        status: { connect: { name: 'Activo' } }, profile: { create: { firstName: 'Admin', lastName: 'Prueba' } },
        userRoles: { create: { roles: { connect: { name: 'Super Admin' } } } } } });
    } finally { await db.$disconnect(); }
  `);
  docker([...compose, 'up', '-d', '--wait', 'backend']);
  let baseUrl;
  /** Container recreation may allocate a new host port. */
  function updateAddress() {
    const address = docker([...compose, 'port', 'backend', '3000']).trim();
    assert.match(address, /^127\.0\.0\.1:\d+$/); baseUrl = `http://${address}/api`;
  }
  updateAddress();
  /** Real HTTP requests preserve the production origin and never log access or monitor tokens. */
  async function request(path, { token, monitor, body, method = 'GET', status = 200 } = {}) {
    const response = await eventually(async () => {
      const multipart = body instanceof FormData;
      const response = await fetch(baseUrl + path, { method, signal: AbortSignal.timeout(10_000),
        headers: { Origin: 'https://storage.example.test', 'X-FQA-Request': '1',
          ...(!multipart && body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(monitor ? { 'X-FQA-Operation-Token': monitor } : {}) },
        body: body === undefined ? undefined : multipart ? body : JSON.stringify(body) });
      if (response.status === 503 && response.headers.has('retry-after')) {
        await response.arrayBuffer(); throw new Error('Esperando a que termine el mantenimiento.');
      }
      return response;
    });
    assert.equal(response.status, status, `${method} ${path}`); return response;
  }
  const login = async email => (await (await request('/auth/login', { method: 'POST', body: { email, password } })).json()).accessToken;
  const admin = await login('admin@storage.example.test');
  const candidate = await (await request('/auth/register', { method: 'POST', status: 201,
    body: { fullName: 'Candidata Prueba', email: 'candidate@storage.example.test', password } })).json();
  const pdf = Buffer.from('%PDF-1.7\nCV de aceptación productiva\n%%EOF');
  const upload = new FormData(); upload.set('file', new Blob([pdf], { type: 'application/pdf' }), 'cv-prueba.pdf');
  await request('/profile/me/resume', { token: candidate.accessToken, method: 'PUT', body: upload });
  await request('/profile/me', { token: candidate.accessToken, method: 'PATCH', body: { professionalSummary: 'Perfil respaldado' } });
  /** Waits through verification and final cleanup using only the operation credential. */
  async function waitOperation(ticket) {
    return eventually(async () => {
      const result = await (await request('/admin/backups/operations/' + ticket.operation.id, { monitor: ticket.monitorToken })).json();
      assert.equal(result.phase, 'SUCCEEDED', result.message); return result;
    });
  }
  const backup = await (await request('/admin/backups', { token: admin, method: 'POST', status: 202, body: { requestId: randomUUID() } })).json();
  await waitOperation(backup);
  let state = await (await request('/admin/backups', { token: admin })).json();
  assert.equal(state.available, true); assert.equal(state.latest.resumeCount, 1);
  const exported = await (await request('/admin/backups/export?backupId=' + state.latest.id, { token: admin })).arrayBuffer();
  const imported = new FormData(); imported.set('requestId', randomUUID()); imported.set('backupId', state.latest.id);
  imported.set('confirmation', 'IMPORTAR'); imported.set('file', new Blob([exported]), 'prueba.fqabackup');
  await waitOperation(await (await request('/admin/backups/import', { token: admin, method: 'POST', status: 202, body: imported })).json());
  state = await (await request('/admin/backups', { token: admin })).json();
  const backupId = state.latest.id;
  console.info('Recreando el backend y comprobando persistencia de CV y respaldo…');
  docker([...compose, 'up', '-d', '--wait', '--force-recreate', '--no-deps', 'backend']); updateAddress();
  assert.deepEqual(Buffer.from(await (await request('/profile/me/resume/download', { token: candidate.accessToken })).arrayBuffer()), pdf);
  assert.equal((await (await request('/admin/backups', { token: admin })).json()).latest.id, backupId);
  await request('/profile/me', { token: candidate.accessToken, method: 'PATCH', body: { professionalSummary: 'Cambio posterior' } });
  docker([...compose, 'exec', '-T', 'backend', 'node', '--input-type=module'], `
    import { PrismaClient } from '@prisma/client'; import { unlink } from 'node:fs/promises'; import { join } from 'node:path';
    if (!new URL(process.env.DATABASE_URL).pathname.endsWith('_test')) throw new Error('Base de pruebas obligatoria.');
    const db = new PrismaClient();
    try {
      const profile = await db.userProfile.findFirstOrThrow({ where: { user: { email: 'candidate@storage.example.test' } }, include: { resume: true } });
      await unlink(join(process.env.RESUME_STORAGE_DIRECTORY, profile.resume.filePath));
    } finally { await db.$disconnect(); }
  `);
  console.info('Restaurando PostgreSQL y el archivo privado desde el respaldo cifrado…');
  await waitOperation(await (await request('/admin/backups/restore', { token: admin, method: 'POST', status: 202,
    body: { requestId: randomUUID(), backupId, currentPassword: password, confirmation: 'RESTAURAR' } })).json());
  await request('/profile/me', { token: candidate.accessToken, status: 401 });
  const renewed = await login('candidate@storage.example.test');
  assert.equal((await (await request('/profile/me', { token: renewed })).json()).professionalSummary, 'Perfil respaldado');
  assert.deepEqual(Buffer.from(await (await request('/profile/me/resume/download', { token: renewed })).arrayBuffer()), pdf);
  console.info('Correcto: herramientas PostgreSQL 17, CV, respaldos, importación/exportación, persistencia y restauración productiva.');
} finally {
  // Project names and paths are created here; cleanup cannot target development or production.
  assert.match(project, /^fqa-storage-test-[a-f0-9]{8}$/);
  if (initialized) {
    docker([...compose, '--profile', 'integration', 'down', '--volumes', '--remove-orphans']);
    assert.equal(docker(['ps', '-a', '--filter', `label=com.docker.compose.project=${project}`, '--format', '{{.ID}}']).trim(), '');
    assert.equal(docker(['volume', 'ls', '--filter', `label=com.docker.compose.project=${project}`, '--format', '{{.Name}}']).trim(), '');
    assert.equal(docker(['network', 'ls', '--filter', `label=com.docker.compose.project=${project}`, '--format', '{{.Name}}']).trim(), '');
  }
  const root = await realpath(temporary);
  assert.equal(dirname(root), await realpath(tmpdir())); assert.ok(basename(root).startsWith('fqa-production-storage-test-'));
  await rm(root, { recursive: true, force: true });
}
