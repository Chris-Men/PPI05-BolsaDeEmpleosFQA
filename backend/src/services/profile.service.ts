import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { PERMISSIONS, type PermissionCode } from '../constants/authorization.constants.js';
import type { AccessContext } from '../types/authorization.types.js';
import type { CandidateProfile } from '../types/profile.types.js';
import type { UpdateProfileDTO } from '../validation/profile.schema.js';
import { AppError } from '../utils/app-error.js';
import { assertPermission } from './authorization.service.js';

/** Own profile operations require the candidate role, even with an accidental grant. */
export const assertCandidateAccess = (actor: AccessContext, permission: PermissionCode): void => {
  if (!actor.roles.includes('CANDIDATE') || actor.roles.some((role) => role !== 'CANDIDATE')) {
    throw new AppError(403, 'Solo los candidatos pueden administrar su perfil.');
  }
  assertPermission(actor, permission);
};

/** Reads a candidate snapshot using only the authenticated account ID. */
const readProfile = async (userId: number, database: Prisma.TransactionClient): Promise<CandidateProfile> => {
  const user = await database.user.findUnique({ where: { id: userId }, select: {
    email: true, profile: true,
    workExperiences: { orderBy: { id: 'asc' } }, educations: { orderBy: { id: 'asc' } },
    userSkills: { include: { skills: true }, orderBy: { id: 'asc' } },
  } });
  if (!user?.profile) throw new AppError(404, 'No se encontró tu perfil.');
  const p = user.profile;
  return {
    email: user.email, firstName: p.firstName, lastName: p.lastName, phone: p.phone,
    department: p.department, municipality: p.municipality, profession: p.profession,
    educationLevel: p.educationLevel, professionalSummary: p.professionalSummary,
    workExperiences: user.workExperiences.map((item) => ({
      companyName: item.companyName, position: item.position, description: item.description,
      startDate: item.startDate.toISOString().slice(0, 10), endDate: item.endDate?.toISOString().slice(0, 10) ?? null,
    })),
    educations: user.educations.map((item) => ({ institution: item.institution, degree: item.degree,
      startDate: item.startDate.toISOString().slice(0, 10), endDate: item.endDate?.toISOString().slice(0, 10) ?? null })),
    skills: user.userSkills.map(({ skills }) => skills.name),
  };
};

/** Loads the whole profile in a consistent read transaction. */
export const getCandidateProfile = (actor: AccessContext): Promise<CandidateProfile> => {
  assertCandidateAccess(actor, PERMISSIONS.PROFILE_READ_OWN);
  return prisma.$transaction((database) => readProfile(actor.userId, database), {
    isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
  });
};

/** Applies a partial edit and replaces only the explicitly submitted collections atomically. */
export const updateCandidateProfile = async (
  payload: UpdateProfileDTO, actor: AccessContext,
  transact: <T>(operation: (database: Prisma.TransactionClient) => Promise<T>,
    options: { isolationLevel: Prisma.TransactionIsolationLevel }) => Promise<T> = prisma.$transaction.bind(prisma),
): Promise<CandidateProfile> => {
  assertCandidateAccess(actor, PERMISSIONS.PROFILE_UPDATE_OWN);
  const { workExperiences, educations, skills, ...personal } = payload;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await transact(async (database) => {
        await database.userProfile.update({ where: { userId: actor.userId }, data: personal });
        if (workExperiences) {
          await database.workExperiences.deleteMany({ where: { userId: actor.userId } });
          if (workExperiences.length) await database.workExperiences.createMany({ data: workExperiences.map((item) => ({
            ...item, userId: actor.userId, startDate: new Date(item.startDate), endDate: item.endDate ? new Date(item.endDate) : null,
          })) });
        }
        if (educations) {
          await database.educations.deleteMany({ where: { userId: actor.userId } });
          if (educations.length) await database.educations.createMany({ data: educations.map((item) => ({
            ...item, userId: actor.userId, startDate: new Date(item.startDate), endDate: item.endDate ? new Date(item.endDate) : null,
          })) });
        }
        if (skills) {
          await database.userSkills.deleteMany({ where: { userId: actor.userId } });
          const normalized = [...new Set(skills.map((value) => value.replace(/\s+/g, ' ').toLocaleLowerCase('es')))];
          for (const skillName of normalized) {
            const existing = await database.skills.findFirst({ where: { name: { equals: skillName, mode: 'insensitive' } } });
            const skill = existing ?? await database.skills.upsert({ where: { name: skillName }, update: {},
              create: { name: skillName, slug: 'skill-' + createHash('sha256').update(skillName).digest('hex') } });
            await database.userSkills.create({ data: { userId: actor.userId, skillId: skill.id } });
          }
        }
        await database.auditLogs.create({ data: { userId: actor.userId, entityType: 'UserProfile', entityId: actor.userId,
          action: 'UPDATE', changes: { fields: Object.keys(payload) } } });
        return readProfile(actor.userId, database);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code)) {
        if (attempt < 2) continue;
        throw new AppError(409, 'Tu perfil cambió al mismo tiempo. Recarga e inténtalo de nuevo.');
      }
      throw error;
    }
  }
  throw new AppError(409, 'No fue posible actualizar tu perfil.');
};
