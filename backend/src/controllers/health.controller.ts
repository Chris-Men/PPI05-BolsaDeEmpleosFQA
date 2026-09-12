import type { Request, Response } from 'express';

/** Returns the liveness state of the HTTP API without exposing internal details. */
export const getHealth = (_request: Request, response: Response): void => {
  response.status(200).json({ status: 'ok' });
};
