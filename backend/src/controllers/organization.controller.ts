import type { NextFunction, Request, Response } from 'express';
import * as organizationService from '../services/organization.service.js';
import type { ManagedOrganization, OrganizationListResponse } from '../types/organization.types.js';
import type {
  ChangeOrganizationStatusDTO, CreateOrganizationDTO, ListOrganizationsQuery, UpdateOrganizationDTO,
} from '../validation/organization.schema.js';
import { entityIdSchema } from '../validation/common.schema.js';
import { AppError } from '../utils/app-error.js';

/** Delegates validated pagination and filters to the organization service. */
export const list = async (
  request: Request, response: Response<OrganizationListResponse, { query: ListOrganizationsQuery }>,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    response.json(await organizationService.listOrganizations(response.locals.query, request.user));
  } catch (error: unknown) { next(error); }
};

/** Returns a single organization through the explicit management contract. */
export const get = async (
  request: Request<{ id: string }>, response: Response<ManagedOrganization>, next: NextFunction,
): Promise<void> => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    response.json(await organizationService.getOrganization(entityIdSchema.parse(request.params.id), request.user));
  } catch (error: unknown) { next(error); }
};

/** Creates an organization without affecting the operator's session. */
export const create = async (
  request: Request<Record<string, never>, unknown, CreateOrganizationDTO>,
  response: Response<ManagedOrganization>, next: NextFunction,
): Promise<void> => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    response.status(201).json(await organizationService.createOrganization(request.body, request.user));
  } catch (error: unknown) { next(error); }
};

/** Delegates the validated partial update to the transactional service. */
export const update = async (
  request: Request<{ id: string }, unknown, UpdateOrganizationDTO>,
  response: Response<ManagedOrganization>, next: NextFunction,
): Promise<void> => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    response.json(await organizationService.updateOrganization(
      entityIdSchema.parse(request.params.id), request.body, request.user,
    ));
  } catch (error: unknown) { next(error); }
};

/** Responds without a body after a successful or already-applied state transition. */
export const changeStatus = async (
  request: Request<{ id: string }, unknown, ChangeOrganizationStatusDTO>,
  response: Response, next: NextFunction,
): Promise<void> => {
  try {
    if (!request.user) throw new AppError(401, 'Debes iniciar sesión.');
    await organizationService.changeOrganizationStatus(
      entityIdSchema.parse(request.params.id), request.body.status, request.user,
    );
    response.sendStatus(204);
  } catch (error: unknown) { next(error); }
};
