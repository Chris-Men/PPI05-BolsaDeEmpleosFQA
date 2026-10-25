import { env } from './config/env.js';
import { createApp } from './app.js';
import { startEmailWorker } from './services/email-worker.service.js';
import { startResumeCleanup } from './services/resume.service.js';
import { backupCoordinator } from './services/backup.service.js';
import { backupRuntime } from './services/backup-runtime.service.js';
import { prisma } from './config/prisma.js';
import { startStatisticsExportWorker } from './services/statistics-export.service.js';

const app = createApp();

/** Starts the API listener using the validated application port. */
const startServer = async (): Promise<void> => {
  await backupCoordinator.start();
  const emailTimer = startEmailWorker();
  const stopResumeCleanup = startResumeCleanup();
  const stopStatisticsExports = startStatisticsExportWorker();
  const server = app.listen(env.PORT, () => {
    console.info(`API disponible en el puerto ${env.PORT}.`);
  });
  let stopping = false;
  /** Graceful watch/container shutdown drains workers and cancels native tools. */
  const stop = (): void => {
    if (stopping) return; stopping = true;
    clearInterval(emailTimer); stopResumeCleanup(); stopStatisticsExports(); backupRuntime.mode = 'MAINTENANCE'; server.close();
    void backupCoordinator.stop().then(() => backupRuntime.drain()).finally(async () => { await prisma.$disconnect(); process.exit(0); });
  };
  process.once('SIGTERM', stop); process.once('SIGINT', stop);
};

void startServer();
