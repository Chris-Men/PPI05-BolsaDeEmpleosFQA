import { createReadStream, createWriteStream } from 'node:fs';
import { lstat, mkdir, open } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { BackupManifest } from '../validation/backup.schema.js';
import { AppError } from '../utils/app-error.js';
import type { BackupStorage } from './backup-storage.service.js';

/** Bounded, uncompressed framing avoids archive extraction, traversal and decompression bombs. */
export const MAX_BACKUP_PACKAGE_BYTES = 1024 * 1024 * 1024;
const magic = Buffer.from('FQA-BACKUP\x01', 'ascii');
const maxManifestBytes = 16 * 1024 * 1024;
const invalid = (): AppError => new AppError(400, 'Selecciona un respaldo .fqabackup completo y válido.');
const artifacts = (manifest: BackupManifest) => [
  { name: 'database.enc', artifact: manifest.database },
  ...manifest.resumes.map(resume => ({ name: resume.key + '.enc', artifact: resume })),
];

/** Streams only encrypted artifacts; memory use is independent of database/document size. */
export const writeBackupPackage = async (storage: BackupStorage, manifest: BackupManifest, destination: string): Promise<void> => {
  const metadata = Buffer.from(storage.serializeManifest(manifest));
  const entries = artifacts(manifest);
  const size = magic.length + 4 + metadata.length + entries.reduce((sum, entry) => sum + entry.artifact.sizeBytes, 0);
  if (metadata.length > maxManifestBytes || size > MAX_BACKUP_PACKAGE_BYTES) throw new AppError(413, 'El respaldo supera el límite de exportación de 1 GiB.');
  for (const entry of entries) {
    const info = await lstat(join(storage.generation(manifest.id), entry.name));
    if (!info.isFile() || info.size !== entry.artifact.sizeBytes) throw new AppError(503, 'El respaldo está incompleto o dañado.');
  }
  const length = Buffer.alloc(4); length.writeUInt32BE(metadata.length);
  async function* chunks() {
    yield magic; yield length; yield metadata;
    for (const entry of entries) yield* createReadStream(join(storage.generation(manifest.id), entry.name));
  }
  await pipeline(Readable.from(chunks()), createWriteStream(destination, { flags: 'wx', mode: 0o600 }));
};

/** Authenticates metadata and validates exact lengths before creating any extracted artifact. */
export const readBackupPackage = async (storage: BackupStorage, source: string, destinationId: string): Promise<BackupManifest> => {
  const info = await lstat(source);
  if (!info.isFile() || info.size < magic.length + 4 || info.size > MAX_BACKUP_PACKAGE_BYTES) throw invalid();
  const handle = await open(source, 'r');
  let manifest: BackupManifest; let offset: number;
  try {
    const header = Buffer.alloc(magic.length + 4);
    if ((await handle.read(header, 0, header.length, 0)).bytesRead !== header.length || !header.subarray(0, magic.length).equals(magic)) throw invalid();
    const length = header.readUInt32BE(magic.length);
    if (!length || length > maxManifestBytes || length > info.size - header.length) throw invalid();
    const metadata = Buffer.alloc(length);
    if ((await handle.read(metadata, 0, length, header.length)).bytesRead !== length) throw invalid();
    manifest = storage.authenticateManifest(metadata.toString('utf8'));
    offset = header.length + length;
    const entries = artifacts(manifest);
    if (new Set(entries.map(entry => entry.name)).size !== entries.length ||
      offset + entries.reduce((sum, entry) => sum + entry.artifact.sizeBytes, 0) !== info.size) throw invalid();
  } finally { await handle.close(); }
  await mkdir(storage.generation(destinationId), { mode: 0o700 });
  for (const entry of artifacts(manifest)) {
    const destination = join(storage.generation(destinationId), entry.name);
    if (entry.artifact.sizeBytes) {
      await pipeline(createReadStream(source, { start: offset, end: offset + entry.artifact.sizeBytes - 1 }), createWriteStream(destination, { flags: 'wx', mode: 0o600 }));
    } else { const empty = await open(destination, 'wx', 0o600); await empty.close(); }
    const output = await open(destination, 'r'); try { await output.sync(); } finally { await output.close(); }
    offset += entry.artifact.sizeBytes;
  }
  return { ...manifest, id: destinationId };
};
