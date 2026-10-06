import { env } from './config/env.js';
import { createApp } from './app.js';

const app = createApp();

/** Starts the API listener using the validated application port. */
const startServer = (): void => {
  app.listen(env.PORT, () => {
    console.info(`API disponible en el puerto ${env.PORT}.`);
  });
};

startServer();
