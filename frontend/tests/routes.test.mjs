import './helpers/typescript.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authenticationDestination, isAdministrator, isCandidate, legacyDestination, resolveRoute, routeDefinitions, safeReturnTo } from '../src/utils/routes.ts';
import { readRouteQuery, writeRouteQuery } from '../src/utils/routeQuery.ts';
import { captureResetCredential, clearResetCredential, getResetCredential } from '../src/utils/resetCredential.ts';

test('todas las rutas declaradas recuperan sección e identificadores sin objetos en memoria', () => {
  for (const { path } of routeDefinitions) {
    const concrete = path.replace(':opportunityKey', 'job-42').replace(':applicationId', '17').replace(':organizationId', '8');
    assert.notEqual(resolveRoute(concrete).screen, 'not-found', concrete);
  }
  assert.equal(resolveRoute('/estudiantes/practicas/job-42').kind, 'INTERNSHIP');
  assert.equal(resolveRoute('/voluntariado').kind, 'VOLUNTEER');
  assert.equal(resolveRoute('/admin/vacantes/job-42/editar').editing, true);
  assert.equal(resolveRoute('/admin/organizaciones/8').organizationId, 8);
  assert.equal(resolveRoute('/perfil/notificaciones/postulaciones/17').applicationId, 17);
});

test('rutas desconocidas e identificadores inválidos nunca llegan a consultas de detalle', () => {
  for (const path of ['/inexistente', '/empleos/job-0', '/postular/otro', '/perfil/postulaciones/-2', '/admin/organizaciones/1.5', '/admin/postulaciones/2147483648']) {
    assert.equal(resolveRoute(path).screen, 'not-found', path);
  }
});

test('retornos de login permiten únicamente destinos internos seguros', () => {
  for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', '/\nadmin', '/login', '/registro', 'admin']) assert.equal(safeReturnTo(value), null);
  assert.equal(safeReturnTo('/empleos?search=gesti%C3%B3n&page=2#ignorado'), '/empleos?search=gesti%C3%B3n&page=2');
  assert.equal(authenticationDestination('?returnTo=%2Fpostular%2Fjob-4', {roles:['CANDIDATE']}), '/postular/job-4');
  assert.equal(authenticationDestination('?returnTo=%2Fpostular%2Fjob-4', {roles:['ADMINISTRATOR']}), '/admin');
  assert.equal(authenticationDestination('?returnTo=%2Fperfil%2Fconfiguracion', {roles:['SUPER_ADMIN']}), '/perfil/configuracion');
});

test('cuentas administrativas acceden a cuenta y seguridad sin adoptar capacidades de candidato', () => {
  assert.equal(isCandidate({roles:['CANDIDATE']}), true);
  for (const roles of [['ADMINISTRATOR'], ['SUPER_ADMIN'], ['ADMINISTRATOR','CANDIDATE']]) {
    assert.equal(isCandidate({roles}), false); assert.equal(isAdministrator({roles}), true);
  }
  assert.equal(resolveRoute('/perfil').candidateOnly, false);
  assert.equal(resolveRoute('/perfil/configuracion').candidateOnly, false);
  assert.equal(resolveRoute('/perfil/datos-personales').candidateOnly, true);
  assert.equal(resolveRoute('/postular/job-1').candidateOnly, true);
});

test('enlaces antiguos se consumen una sola vez y estudiantes conserva su consulta', () => {
  const cases = [['/', '?postular=job-7', '/postular/job-7'], ['/', '?postulacion=17', '/perfil/postulaciones/17'], ['/', '?guardar=volunteer-3', '/perfil?guardar=volunteer-3'], ['/estudiantes','?page=2','/estudiantes/horas-sociales?page=2']];
  for (const [path, search, expected] of cases) {
    assert.equal(legacyDestination(path, search), expected);
    const target = new URL(expected, 'https://fqa.example');
    assert.equal(legacyDestination(target.pathname, target.search), null);
  }
  const login = legacyDestination('/login', '?postular=job-7');
  assert.equal(authenticationDestination(new URL(login, 'https://fqa.example').search, {roles:['CANDIDATE']}), '/postular/job-7');
  assert.equal(legacyDestination('/', '?postular=job-0'), null);
});

test('parámetros normalizan números, fechas, booleanos y opciones conservando consultas independientes', () => {
  const defaults = {page:1,pageSize:20,search:'',categoryId:undefined,deleted:false,kind:undefined,from:undefined};
  const rules = {pageSize:{max:100},categoryId:{type:'integer'},kind:{choices:['EMPLOYMENT','VOLUNTEER']},from:{type:'date'}};
  const raw = new URLSearchParams('page=-3&pageSize=999&categoryId=1.5&deleted=yes&kind=FAKE&from=2026-02-30&savedPage=3&search=++gestión++');
  const parsed = readRouteQuery(raw, defaults, rules);
  assert.deepEqual(parsed, {...defaults,search:'gestión'});
  assert.equal(writeRouteQuery(raw, parsed, defaults, rules).toString(), 'savedPage=3&search=gesti%C3%B3n');
  assert.deepEqual(readRouteQuery(new URLSearchParams('page=2&categoryId=9&deleted=true&from=2026-10-31'), defaults, rules), {...defaults,page:2,categoryId:9,deleted:true,from:'2026-10-31'});
});

test('query no serializa objetos y elimina duplicados y valores por defecto al normalizar', () => {
  const defaults = {page:1,search:'',draftPage:1};
  const params = new URLSearchParams('page=2&page=3&search=&draftPage=4');
  const value = readRouteQuery(params, defaults);
  assert.equal(writeRouteQuery(params,value,defaults).toString(), 'page=2&draftPage=4');
  assert.equal(writeRouteQuery(params,{...value,page:1},defaults).toString(), 'draftPage=4');
});

test('fechas aplicadas de estadísticas persisten aunque coincidan con el período inicial', () => {
  const range = {from:'2026-10-02',to:'2026-10-31'};
  const rules = {from:{type:'date',persistDefault:true},to:{type:'date',persistDefault:true}};
  assert.equal(writeRouteQuery(new URLSearchParams(), range, range, rules).toString(), 'from=2026-10-02&to=2026-10-31');
});

test('recuperación retira el token antes del router y conserva sus metadatos del historial', context => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  let url = new URL('https://fqa.example/reset-password?token=credencial-ficticia&origen=correo');
  const metadata = {idx:2,key:'entry',usr:{appNavigation:true}};
  Object.defineProperty(globalThis,'window',{configurable:true,value:{
    location:{get pathname(){return url.pathname;},get href(){return url.href;}},
    history:{state:metadata,replaceState(state,_title,target){assert.equal(state,metadata);url=new URL(target,url);}},
  }});
  context.after(()=>{clearResetCredential();if(previous)Object.defineProperty(globalThis,'window',previous);else delete globalThis.window;});
  captureResetCredential();assert.equal(getResetCredential(),'credencial-ficticia');
  assert.equal(url.search,'?origen=correo');clearResetCredential();assert.equal(getResetCredential(),'');
  url.search='?token=';captureResetCredential();assert.equal(url.search,'');
});
