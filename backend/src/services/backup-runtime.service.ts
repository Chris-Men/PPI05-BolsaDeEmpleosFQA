import { AppError } from '../utils/app-error.js';

/** Process-wide gate shared by HTTP handlers and background workers. */
export class BackupRuntime {
  mode: 'OPEN' | 'READ_ONLY' | 'MAINTENANCE' = 'OPEN';
  private readers = 0;
  private writers = 0;
  private workers = 0;

  /** No new work enters after the coordinator closes the gate. */
  enter(write: boolean): (() => void) | null {
    if (this.mode === 'MAINTENANCE' || (write && this.mode === 'READ_ONLY')) return null;
    if (write) this.writers += 1; else this.readers += 1;
    let released = false;
    return () => { if (released) return; released = true; if (write) this.writers -= 1; else this.readers -= 1; };
  }

  /** Workers hold their lease until all DB and file operations finish. */
  enterWorker(): (() => void) | null {
    if (this.mode !== 'OPEN') return null;
    this.workers += 1;
    let released = false;
    return () => { if (!released) { released = true; this.workers -= 1; } };
  }

  /** Draining has a deadline; a hung request must never lead to an unsafe snapshot. */
  async drain(timeoutMs = 60_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (this.writers || this.workers || (this.mode === 'MAINTENANCE' && this.readers)) {
      if (Date.now() >= deadline) throw new AppError(503, 'Hay operaciones en curso. Intenta nuevamente más tarde.');
      await new Promise(resolve => setTimeout(resolve, 25));
    }
  }
}

export const backupRuntime = new BackupRuntime();
