import type { NextFunction, Request, Response } from 'express';
import * as userService from '../services/admin-user.service.js';
import type { ManagedUser, UserListResponse } from '../types/admin-user.types.js';
import type { CreateUserDTO, ListUsersQuery, UpdateUserDTO } from '../validation/admin-user.schema.js';
import { userIdSchema } from '../validation/admin-user.schema.js';
import { AppError } from '../utils/app-error.js';

/** Lists users using the query normalized by validation middleware. */
export const list = async (
  request: Request, response: Response<UserListResponse, { query: ListUsersQuery }>, next: NextFunction,
): Promise<void> => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    response.json(await userService.listUsers(response.locals.query, request.user));
  } catch (error: unknown) { next(error); }
};

/** Returns only the newly created identity, preserving the caller's session. */
export const create = async (
  request: Request<Record<string, never>, unknown, CreateUserDTO>,
  response: Response<ManagedUser>, next: NextFunction,
): Promise<void> => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    response.status(201).json(await userService.createUser(request.body, request.user));
  } catch (error: unknown) { next(error); }
};

/** Delegates validated identity/role changes to the transactional service. */
export const update = async (
  request: Request<{ id: string }, unknown, UpdateUserDTO>,
  response: Response<ManagedUser>, next: NextFunction,
): Promise<void> => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    response.json(await userService.updateUser(userIdSchema.parse(request.params.id), request.body, request.user));
  } catch (error: unknown) { next(error); }
};
