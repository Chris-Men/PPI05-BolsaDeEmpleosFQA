import { createHash, randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { ACCESS_TOKEN_TTL_SECONDS } from '../constants/auth.constants.js';
import type { SessionResult, RegisteredUser } from '../types/auth.types.js';
import { authorizationService } from './authorization.service.js';
import { tokenService } from './token.service.js';
import { AppError } from '../utils/app-error.js';

/** Absolute session duration, unaffected by token rotation. */
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Hashes high-entropy credentials without persisting their plaintext. */
const digest = (token: string): string => createHash('sha256').update(token).digest('hex');

/** Produces a consistent invalid-session response. */
const invalidSession = (): AppError =>
  new AppError(401, 'La sesión no es válida. Inicia sesión nuevamente.');

/** Loads only public identity fields; imported admin accounts may have no profile. */
export const getPublicUser = async (
  userId: number, role: string, database: Prisma.TransactionClient = prisma,
): Promise<RegisteredUser> => {
  const user = await database.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, createdAt: true,
      profile: { select: { firstName: true, lastName: true } } },
  });
  if (!user) throw invalidSession();
  return {
    id: user.id, email: user.email,
    fullName: user.profile
      ? [user.profile.firstName, user.profile.lastName].filter(Boolean).join(' ') : user.email,
    role, status: 'ACTIVE', createdAt: user.createdAt?.toISOString() ?? '',
  };
};

/** Creates the next credential and access JWT in the caller's transaction. */
const issue = async (
  database: Prisma.TransactionClient, session: { id: string; userId: number; expiresAt: Date },
): Promise<SessionResult> => {
  const access = await authorizationService.getAccessContext(session.userId, database);
  const role = ['SUPER_ADMIN', 'ADMINISTRATOR', 'CANDIDATE'].find((item) =>
    access.roles.some((assigned) => assigned === item));
  if (!role) throw invalidSession();
  const expiresIn = Math.min(ACCESS_TOKEN_TTL_SECONDS,
    Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
  if (expiresIn < 1) throw invalidSession();
  const refreshToken = randomBytes(48).toString('base64url');
  await database.refreshCredential.create({
    data: { sessionId: session.id, tokenHash: digest(refreshToken) },
  });
  return {
    refreshToken,
    body: {
      ...access, user: await getPublicUser(session.userId, role, database),
      accessToken: tokenService.createAccessToken(String(session.userId), role, session.id, expiresIn),
      tokenType: 'Bearer', expiresIn, sessionExpiresAt: session.expiresAt.toISOString(),
    },
  };
};

/** Creates a revocable session atomically with registration or login. */
export const createSession = async (
  database: Prisma.TransactionClient, userId: number,
): Promise<SessionResult> => {
  const session = await database.authSession.create({
    data: { userId, expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000) },
  });
  return issue(database, session);
};

/** Rotates once; replay revocation is committed before returning an error. */
export const refreshSession = async (token: string | undefined): Promise<SessionResult> => {
  if (!token || !/^[A-Za-z0-9_-]{64}$/.test(token)) throw invalidSession();
  const result = await prisma.$transaction(async (database) => {
    const credential = await database.refreshCredential.findUnique({
      where: { tokenHash: digest(token) }, include: { session: true },
    });
    if (!credential) return null;
    const now = new Date();
    // This update locks the session, serializing renewal with logout/revocation.
    const active = await database.authSession.updateMany({
      where: { id: credential.sessionId, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: null },
    });
    if (!active.count) return null;
    const consumed = await database.refreshCredential.updateMany({
      where: { id: credential.id, consumedAt: null }, data: { consumedAt: now },
    });
    if (!consumed.count) {
      await database.authSession.update({
        where: { id: credential.sessionId }, data: { revokedAt: now },
      });
      return null;
    }
    try {
      return await issue(database, credential.session);
    } catch (error: unknown) {
      if (!(error instanceof AppError) || error.statusCode !== 401) throw error;
      await database.authSession.update({
        where: { id: credential.sessionId }, data: { revokedAt: now },
      });
      return null;
    }
  });
  if (!result) throw invalidSession();
  return result;
};

/** Validates the JWT's session and ownership before any protected handler executes. */
export const requireActiveSession = async (sessionId: string, userId: number): Promise<Date> => {
  const session = await prisma.authSession.findFirst({
    where: { id: sessionId, userId, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { expiresAt: true },
  });
  if (!session) throw invalidSession();
  return session.expiresAt;
};

/** Idempotently revokes the browser session, even if the access JWT has expired. */
export const logoutSession = async (token: string | undefined): Promise<void> => {
  if (!token || !/^[A-Za-z0-9_-]{64}$/.test(token)) return;
  const credential = await prisma.refreshCredential.findUnique({
    where: { tokenHash: digest(token) }, select: { sessionId: true },
  });
  if (credential) await prisma.authSession.updateMany({
    where: { id: credential.sessionId, revokedAt: null }, data: { revokedAt: new Date() },
  });
};

/** Revokes all existing sessions of a real account. New logins remain possible. */
export const revokeUserSessions = async (userId: number): Promise<void> => {
  if (!await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })) {
    throw new AppError(404, 'La cuenta no existe.');
  }
  await prisma.authSession.updateMany({
    where: { userId, revokedAt: null }, data: { revokedAt: new Date() },
  });
};
