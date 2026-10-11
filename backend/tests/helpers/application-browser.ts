import { randomUUID } from 'node:crypto';
import { mkdtemp, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import bcrypt from 'bcrypt';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { prisma } from '../../src/config/prisma.js';
import { ROLE_NAMES, ROLE_PERMISSIONS, type RoleCode } from '../../src/constants/authorization.constants.js';
import { OPPORTUNITY_KINDS } from '../../src/constants/opportunity.constants.js';
import { ORGANIZATION_STATUS_NAMES } from '../../src/constants/organization.constants.js';
import { createOpportunity, changeOpportunityStatus } from '../../src/services/opportunity.service.js';
import { updateCandidateProfile } from '../../src/services/profile.service.js';
import { getResumeStorage } from '../../src/services/resume-storage.service.js';
import type { AccessContext } from '../../src/types/authorization.types.js';

/** Manual browser fixture is impossible to start against a development or production database. */
const main=async():Promise<void>=>{
if(env.NODE_ENV!=='test'||!new URL(env.DATABASE_URL).pathname.endsWith('_test'))throw new Error('La revisión visual requiere una base independiente _test.');
env.RESUME_STORAGE_DIRECTORY=await mkdtemp(join(tmpdir(),'fqa-resume-browser-test-'));env.RESUME_STORAGE_DRIVER='filesystem';
const runId='pb238-browser-'+randomUUID();const ids:number[]=[];const emails:string[]=[];
const passwordHash=await bcrypt.hash('Postulaciones de prueba 2026',12);
/** These disposable accounts are intentionally distinct from every development account. */
const account=async(role:RoleCode,label:string):Promise<AccessContext>=>{
  const user=await prisma.user.create({data:{email:runId+'-'+label+'@example.test',passwordHash,status:{connect:{name:'Activo'}},profile:{create:{firstName:'Candidato',lastName:label,phone:'70000000'}},userRoles:{create:{roles:{connect:{name:ROLE_NAMES[role]}}}}}});
  ids.push(user.id);emails.push(user.email);return {userId:user.id,roles:[role],permissions:[...ROLE_PERMISSIONS[role]]};
};
const candidate=await account('CANDIDATE','principal');await account('CANDIDATE','otra-cuenta');const admin=await account('ADMINISTRATOR','administrador');
await updateCandidateProfile({profession:'Profesional de pruebas',skills:['Comunicación'],workExperiences:[{companyName:'Fundación de pruebas',position:'Colaborador',description:null,startDate:'2020-01-01',endDate:null}]},candidate);
const organization=await prisma.organizations.create({data:{name:runId,organizationStatuses:{connect:{name:ORGANIZATION_STATUS_NAMES.ACTIVE}}}});
const category=await prisma.jobCategories.create({data:{name:runId,slug:runId}});const employment=await prisma.employmentTypes.findFirstOrThrow();
const vacancies:Awaited<ReturnType<typeof createOpportunity>>[]=[];
for(const kind of OPPORTUNITY_KINDS){const value=await createOpportunity({kind,title:'Revisión visual '+kind,description:'Una oportunidad completa para verificar el flujo de postulación en escritorio y móvil.',organizationId:organization.id,categoryId:category.id,department:'San Salvador',municipality:'San Salvador',modality:'REMOTE',slots:3,employmentTypeId:kind==='EMPLOYMENT'?employment.id:undefined,socialHours:kind==='SOCIAL_HOURS'?80:undefined,duration:kind==='INTERNSHIP'?'3 meses':undefined,expiresAt:'2099-12-31'},admin);vacancies.push(await changeOpportunityStatus(value.key,'OPEN',admin));}
const app=createApp();
app.get('/__test/fixture',(_request,response)=>response.json({candidateEmail:emails[0],otherEmail:emails[1],adminEmail:emails[2],vacancies}));
/** Cleanup removes only this run's fixtures and original storage objects. */
app.post('/__test/cleanup',async(_request,response)=>{
  const files=await prisma.files.findMany({where:{userId:{in:ids}}});
  await prisma.applicationDrafts.deleteMany({where:{userId:{in:ids}}});await prisma.applications.deleteMany({where:{userId:{in:ids}}});await prisma.volunteerRegistrations.deleteMany({where:{userId:{in:ids}}});
  await prisma.jobs.deleteMany({where:{organizationId:organization.id}});await prisma.volunteerOpportunities.deleteMany({where:{organizationId:organization.id}});await prisma.auditLogs.deleteMany({where:{userId:{in:ids}}});await prisma.emailOutbox.deleteMany({where:{recipientEmail:{in:emails}}});await prisma.user.deleteMany({where:{id:{in:ids}}});
  for(const file of files)await getResumeStorage().remove(file.filePath);
  await prisma.organizations.delete({where:{id:organization.id}});await prisma.jobCategories.delete({where:{id:category.id}});
  await rmdir(env.RESUME_STORAGE_DIRECTORY!);await prisma.$disconnect();response.sendStatus(204);server.close();
});
const server=app.listen(3001,'0.0.0.0',()=>console.info('API de revisión visual disponible en el puerto 3001.'));
};
void main().catch(()=>{console.error('No fue posible preparar la revisión visual aislada.');process.exitCode=1;});
