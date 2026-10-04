import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';

/** Provider boundary; a future private Spaces adapter must implement the same operations. */
export interface ResumeStorage {
  put(key: string, content: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
  listOlderThan(date: Date): Promise<string[]>;
}

/** Random immutable object keys cannot contain paths or user filenames. */
const validKey = /^[0-9a-f-]{36}\.pdf$/;

/** Private local provider with exclusive writes and idempotent removal. */
export class FilesystemResumeStorage implements ResumeStorage {
  private readonly directory: string;
  constructor(directory: string) { this.directory = resolve(directory); }
  /** Rejects path traversal before resolving any filename. */
  private path(key: string): string {
    if (!validKey.test(key)) throw new AppError(400, 'La referencia del documento no es válida.');
    return join(this.directory, key);
  }
  /** Creates a private directory and writes a new immutable document. */
  async put(key: string, content: Buffer): Promise<void> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    await writeFile(this.path(key), content, { flag: 'wx', mode: 0o600 });
  }
  /** Reads only an internal, validated storage key. */
  async get(key: string): Promise<Buffer> { return readFile(this.path(key)); }
  /** Missing documents are already cleaned and need no retry. */
  async remove(key: string): Promise<void> {
    try { await unlink(this.path(key)); }
    catch (error: unknown) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error; }
  }
  /** Lists sufficiently old documents so in-flight uploads remain untouched. */
  async listOlderThan(date: Date): Promise<string[]> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const result: string[] = [];
    for (const key of await readdir(this.directory)) {
      if (!validKey.test(key)) continue;
      try { if ((await stat(this.path(key))).mtime < date) result.push(key); }
      catch (error: unknown) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error; }
    }
    return result;
  }
}

/** Production never silently falls back to ephemeral container storage. */
export const getResumeStorage = (): ResumeStorage => {
  if (env.RESUME_STORAGE_DRIVER !== 'filesystem' || !env.RESUME_STORAGE_DIRECTORY) {
    throw new AppError(503, 'El almacenamiento de CV no está disponible. Inténtalo más tarde.');
  }
  return new FilesystemResumeStorage(env.RESUME_STORAGE_DIRECTORY);
};
