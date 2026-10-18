import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFile, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/app-error.js';

/** Native PostgreSQL administrative SQL is confined here; business queries remain Prisma. */
export class BackupPostgres {
  private child: ReturnType<typeof spawn> | null = null;
  private cancelled = false;
  constructor(readonly database: PrismaClient, private readonly databaseUrl: string) {}
  /** Integration must never operate on a development alias or an unnamed database. */
  get isTestDatabase(): boolean { return /^\/[a-zA-Z0-9_]+_test$/.test(new URL(this.databaseUrl).pathname); }

  /** Prevents a watch restart or graceful shutdown from leaving a native restore running. */
  cancel(): void { this.cancelled = true; this.child?.kill('SIGTERM'); }

  /** Passwords use a private pgpass file, never command arguments or command output. */
  private async connection(directory: string): Promise<NodeJS.ProcessEnv> {
    const url = new URL(this.databaseUrl);
    const escape = (value: string): string => value.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
    const parts = [url.hostname, url.port || '5432', decodeURIComponent(url.pathname.slice(1)), decodeURIComponent(url.username), decodeURIComponent(url.password)];
    if (parts.some(part => /[\r\n\0]/.test(part))) throw new AppError(503, 'La conexión de respaldo no es válida.');
    const pgpass = join(directory, 'pgpass');
    await writeFile(pgpass, parts.map(escape).join(':') + '\n', { mode: 0o600 });
    return { ...process.env, PGHOST: parts[0], PGPORT: parts[1], PGDATABASE: parts[2], PGUSER: parts[3], PGPASSFILE: pgpass,
      PGPASSWORD: undefined, PGCONNECT_TIMEOUT: '10', PGSSLMODE: url.searchParams.get('sslmode') ?? 'prefer' };
  }

  /** Native tools run without a shell, with bounded duration and no raw stderr disclosure. */
  async run(program: 'pg_dump' | 'pg_restore' | 'psql', args: string[], directory: string): Promise<void> {
    if (this.cancelled) throw new AppError(503, 'La operación se interrumpió al detener el backend.');
    const environment = await this.connection(directory);
    await new Promise<void>((resolve, reject) => {
      const child = spawn(program, args, { env: environment, stdio: 'ignore', timeout: 30 * 60_000 }); this.child = child;
      child.once('error', () => reject(new AppError(503, 'No se pudo ejecutar la herramienta de PostgreSQL.')));
      child.once('close', code => { if (this.child === child) this.child = null;
        if (code === 0) resolve(); else {
          console.error('Falló una herramienta de respaldo de PostgreSQL.', { program, exitCode: code });
          reject(new AppError(503, 'PostgreSQL no pudo completar la operación. Revisa la disponibilidad y los permisos de conexión.'));
        } });
    });
  }

  /** An exact, ordered migration digest prevents restoring an older schema under newer code. */
  async schemaHash(): Promise<string> {
    // Prisma does not model its own migration history. Read-only administrative SQL is required.
    const rows = await this.database.$queryRaw<Array<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }>>`
      SELECT migration_name, checksum, finished_at, rolled_back_at FROM public."_prisma_migrations" ORDER BY migration_name`;
    const applied = rows.filter(row => row.finished_at && !row.rolled_back_at);
    if (rows.some(row => !row.finished_at && !row.rolled_back_at)) throw new AppError(409, 'Hay una migración pendiente o fallida.');
    const names = (await readdir('prisma/migrations', { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
    if (applied.length !== names.length) throw new AppError(409, 'El esquema de la DB no coincide con las migraciones de la aplicación.');
    for (let index = 0; index < names.length; index += 1) {
      const checksum = createHash('sha256').update(await readFile(join('prisma/migrations', names[index]!, 'migration.sql'))).digest('hex');
      if (applied[index]?.migration_name !== names[index] || applied[index]?.checksum !== checksum) throw new AppError(409, 'Las migraciones de la DB y la aplicación no coinciden.');
    }
    return createHash('sha256').update(JSON.stringify(applied.map(row => [row.migration_name, row.checksum]))).digest('hex');
  }

  /** PostgreSQL 17 is the supported server and client version for this development adapter. */
  async assertVersion(directory: string): Promise<void> {
    const rows = await this.database.$queryRaw<Array<{ version: number }>>`SELECT current_setting('server_version_num')::integer AS version`;
    if (Math.floor((rows[0]?.version ?? 0) / 10_000) !== 17) throw new AppError(503, 'El respaldo requiere PostgreSQL 17.');
    await this.run('pg_dump', ['--version'], directory);
    await this.run('pg_restore', ['--version'], directory);
    await this.run('psql', ['--version'], directory);
  }

  /** Checks only the current native restore transaction when recovering an interrupted operation. */
  async restoredOperation(id: string): Promise<boolean | null> {
    return await this.database.$transaction(async transaction => {
      // The native restore takes the same advisory lock before changing any schema objects.
      const lock = await transaction.$queryRaw<Array<{ acquired: boolean }>>`SELECT pg_try_advisory_xact_lock(71239841) AS acquired`;
      if (!lock[0]?.acquired) return null;
      return Boolean(await transaction.auditLogs.findFirst({ where: { entityType: 'DatabaseBackup', action: 'RESTORE', changes: { path: ['operationId'], equals: id } }, select: { id: true } }));
    });
  }

  /** Restores data and security cleanup in one transaction; a failed statement rolls everything back. */
  async restore(dump: string, directory: string, actor: { id: number | null; email: string }, operationId: string, backupId: string): Promise<void> {
    const sql = join(directory, 'restore.sql'); const before = join(directory, 'before.sql'); const after = join(directory, 'after.sql');
    await this.run('pg_restore', ['--clean', '--if-exists', '--no-owner', '--no-acl', '--file', sql, dump], directory);
    const literal = (value: string): string => "'" + value.replace(/'/g, "''") + "'";
    const changes = literal(JSON.stringify({ operationId, backupId, actorId: actor.id, actorEmail: actor.email }));
    // Administrative SQL must share the restore transaction: Prisma cannot append statements to pg_restore.
    await writeFile(before, 'SELECT pg_advisory_xact_lock(71239841);\n', { mode: 0o600 });
    await writeFile(after, `
      UPDATE public.auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE revoked_at IS NULL;
      UPDATE public.password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE used_at IS NULL;
      UPDATE public.email_outbox SET discarded_at = CURRENT_TIMESTAMP, locked_until = NULL WHERE sent_at IS NULL AND discarded_at IS NULL;
      INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, changes, created_at)
      VALUES ((SELECT id FROM public.users WHERE id = ${actor.id ?? 'NULL'} AND email = ${literal(actor.email)} LIMIT 1),
        'DatabaseBackup', 0, 'RESTORE', ${changes}::jsonb, CURRENT_TIMESTAMP);
    `, { mode: 0o600 });
    await this.database.$disconnect();
    await this.run('psql', ['--no-psqlrc', '--no-password', '--single-transaction', '--set', 'ON_ERROR_STOP=on', '--file', before, '--file', sql, '--file', after], directory);
  }
}
