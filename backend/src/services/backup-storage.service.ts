import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, open, readFile, readdir, rename, rm, lstat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Transform, type Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { z } from 'zod';
import { backupManifestSchema, type BackupArtifact, type BackupManifest } from '../validation/backup.schema.js';
import { AppError } from '../utils/app-error.js';

const uuid = z.string().uuid();
const signedManifestSchema = z.object({ payload: backupManifestSchema, signature: z.string().regex(/^[a-f0-9]{64}$/) }).strict();

/** Atomic private JSON writes are also used for the catalog and durable operation journal. */
export const writePrivateJson = async (path: string, value: unknown): Promise<void> => {
  const temporary = path + '.' + randomUUID() + '.tmp';
  const handle = await open(temporary, 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(value)); await handle.sync(); }
  finally { await handle.close(); }
  await rename(temporary, path);
  if (process.platform !== 'win32') { const directory = await open(resolve(path, '..'), 'r'); try { await directory.sync(); } finally { await directory.close(); } }
};

/** One immutable encrypted generation plus an atomic pointer; no user paths are accepted. */
export class BackupStorage {
  readonly root: string;
  constructor(root: string, private readonly secret: Buffer) { this.root = resolve(root); }
  /** Resolves a generation only after validating its random identifier. */
  generation(id: string): string { return join(this.root, uuid.parse(id)); }
  /** Creates a directory inaccessible to other container users. */
  async initialize(): Promise<void> { await mkdir(this.root, { recursive: true, mode: 0o700 }); }
  /** Only ENOENT means absence; malformed metadata must not silently erase an existing backup. */
  async latestId(): Promise<string | null> {
    try { return z.object({ id: uuid }).strict().parse(JSON.parse(await readFile(join(this.root, 'latest.json'), 'utf8'))).id; }
    catch (error: unknown) { if (isMissing(error)) return null; throw new AppError(503, 'No fue posible leer el catálogo de respaldos.'); }
  }
  /** HMAC authenticates metadata, including all plaintext digests and random file keys. */
  async manifest(id: string): Promise<BackupManifest> {
    try {
      const manifest = this.authenticateManifest(await readFile(join(this.generation(id), 'manifest.json'), 'utf8'));
      if (manifest.id !== id) throw new Error();
      return manifest;
    } catch { throw new AppError(503, 'El respaldo no superó la comprobación de integridad o su clave no coincide.'); }
  }
  /** Portable manifests use the same dedicated key; the key is never part of an export. */
  authenticateManifest(content: string): BackupManifest {
    try {
      const record = signedManifestSchema.parse(JSON.parse(content));
      const expected = createHmac('sha256', this.secret).update(JSON.stringify(record.payload)).digest();
      if (!timingSafeEqual(expected, Buffer.from(record.signature, 'hex'))) throw new Error();
      return record.payload;
    } catch { throw new AppError(400, 'El archivo está dañado o fue cifrado con una clave diferente.'); }
  }
  /** Produces authenticated metadata without exposing encryption credentials. */
  serializeManifest(manifest: BackupManifest): string {
    const payload = backupManifestSchema.parse(manifest);
    return JSON.stringify({ payload, signature: createHmac('sha256', this.secret).update(JSON.stringify(payload)).digest('hex') });
  }
  /** The monitor credential grants only read access to one operation, independent of restored sessions. */
  monitorToken(id: string): string { return createHmac('sha256', this.secret).update('operation:' + uuid.parse(id)).digest('hex'); }
  /** Streams encryption so the database dump never needs to fit in memory. */
  async encrypt(source: Readable, path: string): Promise<BackupArtifact> {
    const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', this.secret, iv);
    const hash = createHash('sha256'); let sizeBytes = 0;
    const digest = new Transform({ transform(chunk: Buffer, _encoding, callback) { hash.update(chunk); sizeBytes += chunk.length; callback(null, chunk); } });
    await pipeline(source, digest, cipher, createWriteStream(path, { flags: 'wx', mode: 0o600 }));
    const handle = await open(path, 'r'); try { await handle.sync(); } finally { await handle.close(); }
    return { sizeBytes, sha256: hash.digest('hex'), encryption: { iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex') } };
  }
  /** Authenticates the entire artifact before callers can use the resulting private temporary file. */
  async decrypt(path: string, artifact: BackupArtifact, destination: string): Promise<void> {
    const decipher = createDecipheriv('aes-256-gcm', this.secret, Buffer.from(artifact.encryption.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(artifact.encryption.tag, 'hex'));
    const hash = createHash('sha256'); let size = 0;
    const digest = new Transform({ transform(chunk: Buffer, _encoding, callback) { hash.update(chunk); size += chunk.length; callback(null, chunk); } });
    await pipeline(createReadStream(path), decipher, digest, createWriteStream(destination, { flags: 'wx', mode: 0o600 }));
    if (hash.digest('hex') !== artifact.sha256 || size !== artifact.sizeBytes) throw new AppError(503, 'El respaldo está incompleto o dañado.');
  }
  /** Promotion happens only after every artifact and the native dump have been checked. */
  async publish(manifest: BackupManifest): Promise<void> {
    await writePrivateJson(join(this.generation(manifest.id), 'manifest.json'), JSON.parse(this.serializeManifest(manifest)));
    await writePrivateJson(join(this.root, 'latest.json'), { id: manifest.id });
  }
  /** Removes only validated generation directories inside the dedicated root, preserving latest. */
  async prune(): Promise<void> {
    const latest = await this.latestId();
    for (const name of await readdir(this.root)) {
      if (!uuid.safeParse(name).success || name === latest) continue;
      const path = this.generation(name);
      if ((await lstat(path)).isDirectory()) await rm(path, { recursive: true, force: true });
    }
  }
}

/** Narrows filesystem errors without treating arbitrary failures as a missing file. */
export const isMissing = (error: unknown): boolean => error instanceof Error && 'code' in error && error.code === 'ENOENT';
