import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { requireTestDatabaseUrl } from './test-database.js';

/** Executes a test setup step with the isolated database and safe test secrets. */
const run = (args: string[], environment: NodeJS.ProcessEnv): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      env: environment,
      stdio: 'inherit',
    });

    child.once('error', () => reject(new Error('No se pudo iniciar una etapa de las pruebas.')));
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error('Falló una etapa de las pruebas de integración.'));
      }
    });
  });

/** Applies migrations and seeds to the explicitly configured test database only. */
const main = async (): Promise<void> => {
  const databaseUrl = requireTestDatabaseUrl(
    process.env.TEST_DATABASE_URL,
    process.env.DATABASE_URL,
  );
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    NODE_ENV: 'test',
    CORS_ORIGIN: 'http://localhost:5173',
    JWT_SECRET: randomBytes(48).toString('hex'),
  };

  await run(['node_modules/prisma/build/index.js', 'migrate', 'deploy'], environment);
  await run(['--import', 'tsx', 'prisma/seed.ts'], environment);
  const testFiles = (await readdir('tests/integration')).filter((name) => name.endsWith('.test.ts'))
    .sort().map((name) => `tests/integration/${name}`);
  await run(
    ['--import', 'tsx', '--test', '--test-concurrency=1', ...testFiles],
    environment,
  );
};

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'No se pudieron ejecutar las pruebas.');
  process.exitCode = 1;
});
