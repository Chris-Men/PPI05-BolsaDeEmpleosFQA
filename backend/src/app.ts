import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.middleware.js';
import { authRouter } from './routes/auth.routes.js';
import { debugRouter } from './routes/debug.routes.js';
import { healthRouter } from './routes/health.routes.js';

/** Creates the configured Express application without binding a network port. */
export const createApp = (): express.Express => {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());
  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  // Temporary local diagnostics must never be mounted in production.
  if (env.NODE_ENV === 'development') {
    app.use('/api/debug', debugRouter);
  }
  app.use(errorHandler);

  return app;
};
