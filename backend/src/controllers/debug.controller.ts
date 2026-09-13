import type { NextFunction, Request, Response } from 'express';
import { listDebugUsers } from '../services/debug.service.js';

/** Returns database users for temporary development connection checks. */
export const getDebugUsers = async (
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  response.setHeader('Cache-Control', 'no-store');
  try {
    const users = await listDebugUsers();
    response.status(200).json({ count: users.length, users });
  } catch (error: unknown) {
    next(error);
  }
};
