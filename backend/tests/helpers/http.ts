import { once } from 'node:events';
import type { Server } from 'node:http';
import type { Express } from 'express';

/** HTTP server bound to an ephemeral loopback port for API-level assertions. */
export interface TestServer {
  baseUrl: string;
  server: Server;
}

/** Starts an app without exposing the test listener outside the local machine. */
export const startTestServer = async (app: Express): Promise<TestServer> => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();

  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('No se pudo obtener el puerto de pruebas.');
  }

  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
};

/** Closes all connections so a completed test suite cannot leave a server running. */
export const stopTestServer = (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.closeAllConnections();
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
