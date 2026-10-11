import './helpers/typescript.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const { configureAuthentication, ApiError }=await import('../src/services/api.ts');
const service=await import('../src/services/applicationService.ts');
const { canManageApplications }=await import('../src/utils/applicationManagement.ts');

test('los borradores y decisiones envían versiones sin aceptar identidades del candidato',async context=>{
  const calls=[];configureAuthentication({getToken:()=> 'test-session',refresh:async()=>{},invalidate:()=>{}});
  context.mock.method(globalThis,'fetch',async(url,options)=>{calls.push({url,options});return options.method==='DELETE'?new Response(null,{status:204}):Response.json({id:'draft',version:2});});
  await service.createApplicationDraft('volunteer-42');await service.submitApplication('draft',2);await service.withdrawApplication(5,3);await service.decideApplication(5,4,'REJECTED','Explicación');
  assert.deepEqual(JSON.parse(calls[0].options.body),{opportunityKey:'volunteer-42'});assert.deepEqual(JSON.parse(calls[1].options.body),{draftId:'draft',version:2});assert.deepEqual(JSON.parse(calls[2].options.body),{version:3});assert.deepEqual(JSON.parse(calls[3].options.body),{version:4,status:'REJECTED',reason:'Explicación'});
  assert.ok(calls.every(call=>call.options.headers.get('Authorization')==='Bearer test-session'));
});
test('filtra y pagina en servidor y conserva conflictos de versión y errores de red',async context=>{
  const calls=[];configureAuthentication({getToken:()=> 'test-session',refresh:async()=>{},invalidate:()=>{}});
  context.mock.method(globalThis,'fetch',async(url)=>{calls.push(url);return Response.json({items:[],total:100,page:2,pageSize:20});});
  await service.listApplications({page:2,kind:'SOCIAL_HOURS',status:'PENDING',search:'Nombre & referencia'},true);await service.listApplicationDrafts(2);
  const query=new URL(calls[0],'http://localhost').searchParams;assert.equal(query.get('search'),'Nombre & referencia');assert.equal(query.get('page'),'2');assert.equal(query.get('kind'),'SOCIAL_HOURS');assert.equal(new URL(calls[1],'http://localhost').searchParams.get('page'),'2');
  context.mock.method(globalThis,'fetch',async()=>Response.json({message:'El borrador cambió.'},{status:409}));await assert.rejects(service.submitApplication('draft',2),error=>error instanceof ApiError&&error.status===409);
  context.mock.method(globalThis,'fetch',async()=>{throw new TypeError('Sin red');});await assert.rejects(service.submitApplication('draft',2));
});
test('las descargas privadas renuevan sesión y mantienen el PDF exacto',async context=>{
  const bytes=new Uint8Array([37,80,68,70,45,0,255]);let token='old';let refreshed=0;let requests=0;
  configureAuthentication({getToken:()=>token,refresh:async()=>{refreshed++;token='new';},invalidate:()=>{}});
  context.mock.method(globalThis,'fetch',async(url,options)=>{requests++;if(requests===1)return Response.json({message:'Sesión vencida'},{status:401});assert.equal(options.headers.get('Authorization'),'Bearer new');assert.ok(url.includes('/applications/8/resume/download'));return new Response(bytes,{headers:{'Content-Type':'application/pdf'}});});
  const download=await service.downloadApplicationResume(8,true);assert.deepEqual(new Uint8Array(await download.arrayBuffer()),bytes);assert.equal(refreshed,1);
});
test('la navegación administrativa requiere rol y permiso vigente',()=>{
  assert.equal(canManageApplications({roles:['CANDIDATE'],permissions:['applications.read.any']}),false);
  assert.equal(canManageApplications({roles:['ADMINISTRATOR'],permissions:[]}),false);
  assert.equal(canManageApplications({roles:['ADMINISTRATOR'],permissions:['applications.read.any']}),true);
  assert.equal(canManageApplications({roles:['ADMINISTRATOR'],permissions:['applications.read.any']},'applications.select'),false);
});
