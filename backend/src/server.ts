import { env } from './config/env.js';
import { createApp } from './app.js';
import { startEmailWorker } from './services/email-worker.service.js';
import { startResumeCleanup } from './services/resume.service.js';

const app = createApp();
startEmailWorker();
startResumeCleanup();

/** Starts the API listener using the validated application port. */
const startServer = (): void => {
  app.listen(env.PORT, () => {
    console.info(`API disponible en el puerto ${env.PORT}.`);
  });
};

startServer();
