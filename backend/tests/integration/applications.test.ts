import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { prisma } from '../../src/config/prisma.js';
import { env } from '../../src/config/env.js';
import { createApp } from '../../src/app.js';
import { ROLE_NAMES, PERMISSIONS } from '../../src/constants/authorization.constants.js';
import { OPPORTUNITY_KINDS, type OpportunityType } from '../../src/constants/opportunity.constants.js';
import { seedApplicationCatalogs } from '../../src/services/application-catalog.service.js';
import { seedAccountCatalogs } from '../../src/services/catalog.service.js';
import { cleanupResumes } from '../../src/services/resume.service.js';
import { getResumeStorage } from '../../src/services/resume-storage.service.js';
import { decryptEmailPayload } from '../../src/services/email.service.js';
import { createSmtpSender, processEmailOutboxBatch } from '../../src/services/email-worker.service.js';
import type { Application, ApplicationDraft } from '../../src/services/application.service.js';
import type { RegistrationResponse } from '../../src/types/auth.types.js';
import type { Opportunity } from '../../src/services/opportunity.service.js';
import type { ResumeMetadata } from '../../src/types/profile.types.js';
import { startTestServer, stopTestServer, type TestServer } from '../helpers/http.js';

const runId=randomUUID();const password='Postulaciones de prueba 2026';const userIds:number[]=[];const emails:string[]=[];
const pdf=Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
let api:TestServer;let candidate:RegistrationResponse;let other:RegistrationResponse;let admin:RegistrationResponse;let organizationId:number;let categoryId:number;let employmentTypeId:number;
interface Page<T>{items:T[];total:number;page:number;pageSize:number}
/** Real HTTP calls use database authorization and production route validation. */
const request=(method:string,path:string,actor?:RegistrationResponse,body?:unknown):Promise<Response>=>fetch(api.baseUrl+'/api'+path,{method,headers:{'Content-Type':'application/json','X-FQA-Request':'1',...(actor?{Authorization:'Bearer '+actor.accessToken}:{})},body:body===undefined?undefined:JSON.stringify(body)});
/** Error bodies contain only public fixture values, never credentials. */
const expectJson=async<T>(response:Response,status=200):Promise<T>=>{const value=await response.json() as T;assert.equal(response.status,status,JSON.stringify(value));return value;};
/** Each opportunity is isolated and published using the same administrative API as the UI. */
const published=async(kind:OpportunityType='SOCIAL_HOURS',slots=3):Promise<Opportunity>=>{
  const vacancy=await expectJson<Opportunity>(await request('POST','/admin/opportunities',admin,{kind,contactEmail:'contacto@example.test',title:runId+' '+kind+' '+randomUUID(),description:'Una oportunidad completa de prueba para colaborar con la comunidad.',organizationId,categoryId,department:runId,municipality:'Municipio',modality:'REMOTE',slots,employmentTypeId:kind==='EMPLOYMENT'?employmentTypeId:undefined,socialHours:kind==='SOCIAL_HOURS'?80:undefined,duration:kind==='INTERNSHIP'?'3 meses':undefined,expiresAt:'2099-12-31'}),201);
  return expectJson<Opportunity>(await request('PATCH','/admin/opportunities/'+vacancy.key+'/status',admin,{status:'OPEN'}));
};
/** Multipart upload tests the existing PDF validation before an immutable draft reference is selected. */
const upload=async(actor=candidate,content=pdf):Promise<ResumeMetadata>=>{const body=new FormData();body.append('file',new Blob([content],{type:'application/pdf'}),'cv.pdf');return expectJson<ResumeMetadata>(await fetch(api.baseUrl+'/api/profile/me/resume',{method:'PUT',headers:{Authorization:'Bearer '+actor.accessToken,'X-FQA-Request':'1'},body}));};
const draft=async(vacancy:Opportunity,actor=candidate):Promise<ApplicationDraft>=>expectJson<ApplicationDraft>(await request('POST','/application-drafts',actor,{opportunityKey:vacancy.key}),201);
/** Incomplete drafts remain valid; final fixture fills only required application fields. */
const complete=async(value:ApplicationDraft,actor=candidate,resumeId:number|null=value.resume?.id??null):Promise<ApplicationDraft>=>expectJson<ApplicationDraft>(await request('PATCH','/application-drafts/'+value.id,actor,{version:value.version,currentStep:4,resumeId,data:{...value.data,personal:{...value.data.personal,phone:'70000000',firstName:'Nombre enviado',birthDate:'2000-02-29',sex:'UNDISCLOSED',department:'San Salvador',municipality:'San Salvador Centro',educationLevel:'Universitario'},experience:{...value.data.experience,motivation:'Deseo participar y contribuir.'}}}));
const submit=async(value:ApplicationDraft,actor=candidate):Promise<Application>=>expectJson<Application>(await request('POST','/applications',actor,{draftId:value.id,version:value.version}),201);
const decide=async(value:Application,status:'IN_REVIEW'|'SELECTED'|'REJECTED',reason?:string):Promise<Application>=>expectJson<Application>(await request('PATCH','/admin/applications/'+value.id+'/status',admin,{version:value.version,status,reason}));

describe('PB-238: postulaciones, borradores y decisiones persistentes',()=>{
  before(async()=>{
    assert.equal(env.NODE_ENV,'test');assert.ok(new URL(env.DATABASE_URL).pathname.endsWith('_test'));assert.equal(env.DATABASE_URL,process.env.TEST_DATABASE_URL);
    api=await startTestServer(createApp());
    const register=async(label:string)=>{const value=await expectJson<RegistrationResponse>(await request('POST','/auth/register',undefined,{fullName:'Candidato Original',email:runId+'-'+label+'@example.test',password}),201);userIds.push(value.userId);emails.push(value.user.email);return value;};
    candidate=await register('candidate');other=await register('other');
    await expectJson(await request('PATCH','/profile/me',candidate,{birthDate:'2001-01-01',sex:'FEMALE',department:'San Salvador',municipality:'San Salvador Centro',educationLevel:'Bachillerato'}));
    const source=await prisma.user.findUniqueOrThrow({where:{id:candidate.userId}});
    const administrator=await prisma.user.create({data:{email:runId+'-admin@example.test',passwordHash:source.passwordHash,status:{connect:{name:'Activo'}},userRoles:{create:{roles:{connect:{name:ROLE_NAMES.ADMINISTRATOR}}}}}});
    userIds.push(administrator.id);emails.push(administrator.email);admin=await expectJson<RegistrationResponse>(await request('POST','/auth/login',undefined,{email:administrator.email,password}));
    organizationId=(await expectJson<{id:number}>(await request('POST','/admin/organizations',admin,{name:runId}),201)).id;
    categoryId=(await expectJson<{id:number}>(await request('POST','/admin/categories',admin,{name:runId}),201)).id;
    employmentTypeId=(await prisma.employmentTypes.findFirstOrThrow()).id;
  });
  after(async()=>{
    await seedAccountCatalogs(prisma);
    const files=await prisma.files.findMany({where:{userId:{in:userIds}}});
    await prisma.applicationDrafts.deleteMany({where:{userId:{in:userIds}}});
    await prisma.applications.deleteMany({where:{userId:{in:userIds}}});
    await prisma.volunteerRegistrations.deleteMany({where:{userId:{in:userIds}}});
    await prisma.jobs.deleteMany({where:{organizationId}});await prisma.volunteerOpportunities.deleteMany({where:{organizationId}});
    await prisma.auditLogs.deleteMany({where:{userId:{in:userIds}}});await prisma.emailOutbox.deleteMany({where:{recipientEmail:{in:emails}}});
    await prisma.user.deleteMany({where:{id:{in:userIds}}});for(const file of files)await getResumeStorage().remove(file.filePath);
    await prisma.organizations.delete({where:{id:organizationId}});await prisma.jobCategories.delete({where:{id:categoryId}});await prisma.locations.deleteMany({where:{department:runId}});
    await stopTestServer(api.server);await prisma.$disconnect();
  });
  it('completa candidato → administrador → candidato para los cuatro tipos, con CV obligatorio u opcional',async()=>{
    for(const kind of OPPORTUNITY_KINDS){
      const vacancy=await published(kind);const initial=await draft(vacancy);assert.equal(initial.data.personal.birthDate,'2001-01-01');assert.equal(initial.data.personal.sex,'FEMALE');let value=await complete(initial,candidate,null);
      if(kind==='EMPLOYMENT'||kind==='INTERNSHIP'){
        assert.equal((await request('POST','/applications',candidate,{draftId:value.id,version:value.version})).status,400);
        const file=await upload();value=await complete(value,candidate,file.id);
      }
      const application=await submit(value);assert.equal(application.status,'PENDING');assert.equal(application.history.length,1);assert.equal(application.candidateName,'Nombre enviado Original');assert.equal(application.candidateEmail,candidate.user.email);
      assert.deepEqual(await expectJson<Application>(await request('GET','/applications/'+application.id,candidate)),application);
      assert.equal((await request('GET','/applications/'+application.id,other)).status,404);
      assert.equal((await request('GET','/application-drafts/'+value.id,candidate)).status,404);
      assert.equal((await expectJson<{firstName:string}>(await request('GET','/profile/me',candidate))).firstName,'Candidato');
      assert.equal((await expectJson<{birthDate:string}>(await request('GET','/profile/me',candidate))).birthDate,'2001-01-01');
      assert.equal(application.data?.personal.birthDate,'2000-02-29');assert.equal(application.data?.personal.sex,'UNDISCLOSED');
      const row=await prisma.applications.findUniqueOrThrow({where:{id:application.id}});assert.notEqual(row.jobId===null,row.volunteerRegistrationId===null);
      if(application.resume){for(const route of ['/applications/','/admin/applications/']){const response=await request('GET',route+application.id+'/resume/download',route.startsWith('/admin')?admin:candidate);assert.equal(response.status,200);assert.match(response.headers.get('content-disposition')??'',/attachment/);assert.deepEqual(Buffer.from(await response.arrayBuffer()),pdf);}}
      const reviewing=await decide(application,'IN_REVIEW','Estamos revisando tus datos.');assert.equal(reviewing.history.length,2);
      const final=await decide(reviewing,kind==='VOLUNTEER'?'REJECTED':'SELECTED','Explicación visible');assert.equal(final.history.at(-1)?.reason,'Explicación visible');
      assert.equal((await request('PATCH','/admin/applications/'+final.id+'/status',admin,{version:final.version,status:'IN_REVIEW'})).status,409);
      const notifications=await expectJson<Page<{applicationId:number;message:string}>&{unreadCount:number}>(await request('GET','/notifications',candidate));assert.ok(notifications.items.some(item=>item.applicationId===final.id&&item.message.includes('Explicación visible')));
      const messages=await prisma.emailOutbox.findMany({where:{eventKey:{startsWith:'application:'+application.id+':'}}});assert.equal(messages.length,2);const mail=messages.map(message=>decryptEmailPayload(message)).find(message=>message.kind==='APPLICATION_DECIDED');assert.ok(mail&&mail.kind==='APPLICATION_DECIDED');assert.equal(mail.reason,'Explicación visible');
    }
  });
  it('recupera borradores parciales entre sesiones, detecta conflictos y conserva documentos históricos',async()=>{
    const vacancy=await published('EMPLOYMENT');const file=await upload();const value=await draft(vacancy);
    const partial=await expectJson<ApplicationDraft>(await request('PATCH','/application-drafts/'+value.id,candidate,{version:value.version,currentStep:2,resumeId:file.id,data:{...value.data,personal:{...value.data.personal,firstName:''}}}));
    assert.equal((await request('PATCH','/application-drafts/'+value.id,candidate,{version:value.version,currentStep:1,resumeId:null,data:value.data})).status,409);
    assert.equal((await draft(vacancy)).id,value.id);assert.equal((await draft(vacancy)).data.personal.firstName,'');
    const relogin=await expectJson<RegistrationResponse>(await request('POST','/auth/login',undefined,{email:candidate.user.email,password}));assert.deepEqual(await expectJson<ApplicationDraft>(await request('GET','/application-drafts/'+value.id,relogin)),partial);
    assert.equal((await request('GET','/application-drafts/'+value.id,other)).status,404);
    const foreign=await upload(other);assert.equal((await request('PATCH','/application-drafts/'+value.id,candidate,{version:partial.version,currentStep:2,resumeId:foreign.id,data:partial.data})).status,400);
    await upload(candidate,Buffer.concat([pdf,Buffer.from('\nreemplazo')]));assert.equal((await request('DELETE','/profile/me/resume',candidate)).status,204);
    await prisma.files.update({where:{id:file.id},data:{createdAt:new Date('2020-01-01')}});await cleanupResumes();assert.ok(await prisma.files.findUnique({where:{id:file.id}}));
    const download=await request('GET','/application-drafts/'+value.id+'/resume/download',candidate);assert.deepEqual(Buffer.from(await download.arrayBuffer()),pdf);
    const application=await submit(await complete(partial,candidate,file.id));await cleanupResumes();assert.ok(await prisma.files.findUnique({where:{id:file.id}}));assert.deepEqual(Buffer.from(await (await request('GET','/applications/'+application.id+'/resume/download',candidate)).arrayBuffer()),pdf);
    const discarded=await draft(await published());assert.equal((await request('DELETE','/application-drafts/'+discarded.id,candidate)).status,204);assert.equal((await request('GET','/application-drafts/'+discarded.id,candidate)).status,404);
  });
  it('hace el doble envío idempotente, permite retirada y conserva cada nuevo intento',async()=>{
    const vacancy=await published('VOLUNTEER');const value=await complete(await draft(vacancy),candidate,null);
    const results=await Promise.all([request('POST','/applications',candidate,{draftId:value.id,version:value.version}),request('POST','/applications',candidate,{draftId:value.id,version:value.version})]);
    const first=await expectJson<Application>(results[0]!,201);const duplicate=await expectJson<Application>(results[1]!,201);assert.equal(first.id,duplicate.id);assert.equal(await prisma.emailOutbox.count({where:{eventKey:'application:'+first.id+':submitted'}}),1);
    assert.equal((await request('POST','/application-drafts',candidate,{opportunityKey:vacancy.key})).status,409);
    assert.equal((await request('PATCH','/applications/'+first.id+'/withdraw',other,{version:first.version})).status,404);
    const withdrawn=await expectJson<Application>(await request('PATCH','/applications/'+first.id+'/withdraw',candidate,{version:first.version}));assert.equal(withdrawn.status,'WITHDRAWN');assert.equal(withdrawn.history.length,2);
    const next=await submit(await complete(await draft(vacancy),candidate,null));assert.equal(next.attemptNumber,2);assert.notEqual(next.referenceNumber,first.referenceNumber);assert.equal((await expectJson<Application>(await request('GET','/applications/'+first.id,candidate))).status,'WITHDRAWN');
    assert.equal(await prisma.volunteerRegistrations.count({where:{userId:candidate.userId,volunteerOpportunityId:vacancy.id}}),1);
    assert.equal((await request('PATCH','/applications/'+first.id+'/withdraw',candidate,{version:withdrawn.version})).status,409);
  });
  it('serializa la selección del último cupo en los cuatro tipos y exige ampliar antes de seleccionar más',async()=>{
    await upload();await upload(other);
    for(const kind of OPPORTUNITY_KINDS){
      const vacancy=await published(kind,1);const first=await submit(await complete(await draft(vacancy)));const second=await submit(await complete(await draft(vacancy,other),other),other);
      const responses=await Promise.all([first,second].map(value=>request('PATCH','/admin/applications/'+value.id+'/status',admin,{version:value.version,status:'SELECTED'})));assert.deepEqual(responses.map(response=>response.status).sort(),[200,409]);
      const current=await expectJson<Opportunity>(await request('GET','/admin/opportunities/'+vacancy.key,admin));assert.equal(current.status,'CLOSED');
      const attempts=await expectJson<Page<Application>>(await request('GET','/admin/applications?opportunityKey='+vacancy.key,admin));assert.equal(attempts.items.filter(item=>item.status==='PENDING').length,1);
      const waiting=attempts.items.find(item=>item.status==='PENDING')!;assert.equal((await request('PATCH','/admin/opportunities/'+vacancy.key+'/status',admin,{status:'OPEN'})).status,409);
      await expectJson<Opportunity>(await request('PATCH','/admin/opportunities/'+vacancy.key,admin,{slots:2}));await decide(waiting,'SELECTED');
      assert.equal((await request('PATCH','/admin/opportunities/'+vacancy.key,admin,{slots:1})).status,409);
      assert.equal((await request('PATCH','/admin/opportunities/'+vacancy.key+'/status',admin,{status:'OPEN'})).status,409);
      await expectJson<Opportunity>(await request('PATCH','/admin/opportunities/'+vacancy.key,admin,{slots:3}));assert.equal((await request('PATCH','/admin/opportunities/'+vacancy.key+'/status',admin,{status:'OPEN'})).status,200);
      const filled=await expectJson<Opportunity>(await request('PATCH','/admin/opportunities/'+vacancy.key,admin,{slots:2}));assert.equal(filled.status,'CLOSED');
    }
  });
  it('resuelve tras cierre o vencimiento y permite rechazo y retirada, pero no selección, después de archivar',async()=>{
    const closed=await published();const first=await submit(await complete(await draft(closed),candidate,null));await request('PATCH','/admin/opportunities/'+closed.key+'/status',admin,{status:'CLOSED'});await decide(first,'SELECTED');
    const expired=await published();const second=await submit(await complete(await draft(expired),candidate,null));await prisma.jobs.update({where:{id:expired.id},data:{expiresAt:new Date('2020-01-01')}});await decide(second,'SELECTED');
    const archived=await published('VOLUNTEER');const third=await submit(await complete(await draft(archived),candidate,null));const fourth=await submit(await complete(await draft(archived,other),other,null),other);await request('DELETE','/admin/opportunities/'+archived.key,admin);
    assert.equal((await request('PATCH','/admin/applications/'+third.id+'/status',admin,{version:third.version,status:'SELECTED'})).status,409);await decide(third,'REJECTED');assert.equal((await request('PATCH','/applications/'+fourth.id+'/withdraw',other,{version:fourth.version})).status,200);
  });
  it('revalida vigencia, organización y categoría; conserva el borrador ante errores',async()=>{
    const vacancy=await published();const value=await complete(await draft(vacancy),candidate,null);const send=()=>request('POST','/applications',candidate,{draftId:value.id,version:value.version});
    await request('PATCH','/admin/organizations/'+organizationId+'/status',admin,{status:'INACTIVE'});try{assert.equal((await send()).status,404);}finally{await request('PATCH','/admin/organizations/'+organizationId+'/status',admin,{status:'ACTIVE'});}
    await request('PATCH','/admin/categories/'+categoryId,admin,{isActive:false});try{assert.equal((await send()).status,404);}finally{await request('PATCH','/admin/categories/'+categoryId,admin,{isActive:true});}
    await request('PATCH','/admin/opportunities/'+vacancy.key+'/status',admin,{status:'CLOSED'});assert.equal((await send()).status,404);assert.equal((await request('GET','/application-drafts/'+value.id,candidate)).status,200);
  });
  it('no confirma ante fallos de almacenamiento o transacción, y recupera correos sin duplicar eventos',async()=>{
    const vacancy=await published('EMPLOYMENT');const value=await complete(await draft(vacancy));assert.ok(value.resume);
    const directory=env.RESUME_STORAGE_DIRECTORY;env.RESUME_STORAGE_DIRECTORY=directory+'-missing';try{assert.equal((await request('POST','/applications',candidate,{draftId:value.id,version:value.version})).status,503);}finally{env.RESUME_STORAGE_DIRECTORY=directory;}
    assert.equal(await prisma.applications.count({where:{submissionKey:value.id}}),0);
    const driver=env.RESUME_STORAGE_DRIVER;env.RESUME_STORAGE_DRIVER=undefined;
    try {
      assert.equal((await request('POST','/applications',candidate,{draftId:value.id,version:value.version})).status,503);
      const optional=await complete(await draft(await published('VOLUNTEER')),candidate,null);
      assert.equal((await submit(optional)).resume,null);
    } finally {env.RESUME_STORAGE_DRIVER=driver;}
    const key=env.MAIL_OUTBOX_KEY;env.MAIL_OUTBOX_KEY=undefined;try{assert.equal((await request('POST','/applications',candidate,{draftId:value.id,version:value.version})).status,500);}finally{env.MAIL_OUTBOX_KEY=key;}
    assert.equal(await prisma.applications.count({where:{submissionKey:value.id}}),0);assert.ok(await prisma.applicationDrafts.findUnique({where:{id:value.id}}));
    const application=await submit(value);const reviewing=await decide(application,'IN_REVIEW');assert.equal((await request('PATCH','/admin/applications/'+application.id+'/status',admin,{version:application.version,status:'REJECTED'})).status,409);await decide(reviewing,'REJECTED');
    const previousError=console.error;console.error=()=>{};try{await processEmailOutboxBatch({sendMail:async()=>{throw new Error('SMTP temporalmente caído');}},100);}finally{console.error=previousError;}
    assert.equal((await expectJson<Application>(await request('GET','/applications/'+application.id,candidate))).status,'REJECTED');
    const queued=await prisma.emailOutbox.findMany({where:{eventKey:{startsWith:'application:'+application.id+':'}}});assert.equal(queued.length,2);assert.ok(queued.every(item=>!item.sentAt&&item.attempts===1));
    await prisma.emailOutbox.updateMany({where:{id:{in:queued.map(item=>item.id)}},data:{nextAttemptAt:new Date(0)}});
    const sender=createSmtpSender();await processEmailOutboxBatch(sender,100);assert.equal(await prisma.emailOutbox.count({where:{id:{in:queued.map(item=>item.id)},sentAt:{not:null}}}),2);if('close' in sender&&typeof sender.close==='function')sender.close();
  });
  it('aplica permisos revocados, aislamiento, filtros, agregados y lectura de notificaciones',async()=>{
    for(const path of ['/applications','/application-drafts','/notifications','/admin/applications'])assert.equal((await request('GET',path)).status,401);
    assert.equal((await request('GET','/admin/applications',candidate)).status,403);assert.equal((await request('GET','/applications',admin)).status,403);
    const role=await prisma.role.findUniqueOrThrow({where:{name:ROLE_NAMES.CANDIDATE}});const permission=await prisma.permissions.findUniqueOrThrow({where:{name:PERMISSIONS.APPLICATION_CREATE_OWN}});await prisma.rolePermissions.deleteMany({where:{roleId:role.id,permissionId:permission.id}});
    try{assert.equal((await request('POST','/application-drafts',candidate,{opportunityKey:'job-1'})).status,403);}finally{await seedAccountCatalogs(prisma);}
    const page=await expectJson<Page<Application>>(await request('GET','/admin/applications?candidateId='+candidate.userId+'&pageSize=1',admin));assert.equal(page.items.length,1);
    const stats=await expectJson<{total:number;candidates:number;withResume:number}>(await request('GET','/admin/applications/statistics?candidateId='+candidate.userId,admin));assert.equal(stats.total,page.total);assert.equal(stats.candidates,1);assert.ok(stats.total>page.items.length);
    const filtered=await expectJson<Page<Application>>(await request('GET','/applications?kind=VOLUNTEER&status=WITHDRAWN&from=2000-01-01&to=2099-12-31',candidate));assert.ok(filtered.items.every(item=>item.opportunity.kind==='VOLUNTEER'&&item.status==='WITHDRAWN'));
    const notices=await expectJson<Page<{id:number}>&{unreadCount:number}>(await request('GET','/notifications',candidate));assert.ok(notices.unreadCount>0);assert.equal((await request('PATCH','/notifications/'+notices.items[0]!.id+'/read',other)).status,404);assert.equal((await request('PATCH','/notifications/'+notices.items[0]!.id+'/read',candidate)).status,204);assert.equal((await request('PATCH','/notifications/read-all',candidate)).status,204);assert.equal((await expectJson<{unreadCount:number}>(await request('GET','/notifications',candidate))).unreadCount,0);
  });
  it('importa inscripciones antiguas una sola vez y preserva referencias, fechas y registros anteriores',async()=>{
    const vacancy=await published('VOLUNTEER');const date=new Date('2020-01-01');const registration=await prisma.volunteerRegistrations.create({data:{volunteerOpportunityId:vacancy.id,userId:candidate.userId,createdAt:date}});
    await seedApplicationCatalogs(prisma);await seedApplicationCatalogs(prisma);const rows=await prisma.applications.findMany({where:{volunteerRegistrationId:registration.id}});assert.equal(rows.length,1);assert.equal(rows[0]!.createdAt?.toISOString(),date.toISOString());
    const historical=await expectJson<Application>(await request('GET','/applications/'+rows[0]!.id,candidate));assert.equal(historical.legacy,true);assert.equal(historical.data,null);assert.equal(historical.referenceNumber,'FQA-LEGACY-V-'+registration.id);assert.equal(await prisma.emailOutbox.count({where:{eventKey:{startsWith:'application:'+historical.id+':'}}}),0);
    const oldVacancy=await published('EMPLOYMENT');const file=await upload();
    const pending=await prisma.applicationStatuses.findUniqueOrThrow({where:{name:'Pendiente'}});
    const old=await prisma.applications.create({data:{jobId:oldVacancy.id,userId:candidate.userId,statusId:pending.id,referenceNumber:'LEGACY-'+randomUUID(),createdAt:date,applicationFiles:{create:{fileId:file.id}},applicationStatusHistory:{create:{changedBy:candidate.userId,newStatusId:pending.id,createdAt:date}}}});
    await seedApplicationCatalogs(prisma);const kept=await expectJson<Application>(await request('GET','/applications/'+old.id,candidate));assert.equal(kept.referenceNumber,old.referenceNumber);assert.equal(kept.history[0]?.createdAt,date.toISOString());assert.equal(kept.resume?.id,file.id);assert.equal(kept.legacy,true);
    assert.deepEqual(Buffer.from(await (await request('GET','/applications/'+old.id+'/resume/download',candidate)).arrayBuffer()),pdf);
    const statistics=await expectJson<{withResume:number}>(await request('GET','/admin/applications/statistics?opportunityKey='+oldVacancy.key,admin));assert.equal(statistics.withResume,1);
  });
  it('mantiene el snapshot enviado después de editar el perfil y la vacante',async()=>{
    const vacancy=await published();const value=await submit(await complete(await draft(vacancy),candidate,null));
    await request('PATCH','/profile/me',candidate,{firstName:'Perfil actualizado'});await request('PATCH','/admin/opportunities/'+vacancy.key,admin,{title:'Vacante actualizada'});
    const saved=await expectJson<Application>(await request('GET','/applications/'+value.id,candidate));assert.equal(saved.candidateName,value.candidateName);assert.equal(saved.professionalProfile?.firstName,value.professionalProfile?.firstName);assert.equal(saved.opportunity.title,vacancy.title);assert.equal(saved.data?.personal.firstName,'Nombre enviado');
    await request('PATCH','/profile/me',candidate,{firstName:'Candidato'});
  });
  it('toma el correo vigente de la cuenta al enviar un borrador anterior',async()=>{
    const value=await complete(await draft(await published()),candidate,null);const changed=runId+'-correo-actual@example.test';emails.push(changed);
    await prisma.user.update({where:{id:candidate.userId},data:{email:changed}});
    try { const saved=await submit(value);assert.equal(saved.candidateEmail,changed);assert.equal((await prisma.emailOutbox.findUniqueOrThrow({where:{eventKey:'application:'+saved.id+':submitted'}})).recipientEmail,changed); }
    finally {await prisma.user.update({where:{id:candidate.userId},data:{email:candidate.user.email}});}
  });
  it('lee borradores y envíos anteriores sin campos nuevos y vuelve a validar al postular',async()=>{
    const value=await draft(await published('VOLUNTEER'));
    const {birthDate:_birthDate,sex:_sex,...oldPersonal}=value.data.personal;void _birthDate;void _sex;
    const oldData={...value.data,personal:{...oldPersonal,phone:'7',municipality:'Municipio anterior',educationLevel:'Maestría'}};
    await prisma.applicationDrafts.update({where:{id:value.id},data:{data:oldData}});
    const legacy=await expectJson<ApplicationDraft>(await request('GET','/application-drafts/'+value.id,candidate));
    assert.equal(legacy.data.personal.birthDate,'');assert.equal(legacy.data.personal.sex,'');assert.equal(legacy.data.personal.municipality,'Municipio anterior');
    assert.equal((await request('POST','/applications',candidate,{draftId:legacy.id,version:legacy.version})).status,400);
    const completed=await complete(legacy,candidate,null);const sent=await submit(completed);
    const {birthDate:_sentBirthDate,sex:_sentSex,...sentPersonal}=sent.data!.personal;void _sentBirthDate;void _sentSex;
    const oldSubmitted={...sent.data!,personal:{...sentPersonal,educationLevel:'Maestría'}};
    await prisma.applications.update({where:{id:sent.id},data:{submittedData:oldSubmitted}});
    const historical=await expectJson<Application>(await request('GET','/applications/'+sent.id,candidate));
    assert.equal(historical.legacy,false);assert.equal(historical.data?.personal.birthDate,'');assert.equal(historical.data?.personal.sex,'');assert.equal(historical.data?.personal.educationLevel,'Maestría');
    assert.deepEqual((await prisma.applications.findUniqueOrThrow({where:{id:sent.id}})).submittedData,oldSubmitted);
  });
});
