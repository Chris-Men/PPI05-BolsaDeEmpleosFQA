import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { browserHarness } from './helpers/cdp.mjs';
import { installNavigationFixture } from './helpers/navigation-fixture.mjs';

/** Real Edge/Chromium history and dialogs, with a disposable API fixture instead of production data. */
const web=process.env.NAVIGATION_WEB_URL??'http://localhost:5174';
const browser=await browserHarness(join(tmpdir(),'fqa-navigation-browser'),process.env.NAVIGATION_CDP_URL??'http://127.0.0.1:9344');
const {send,evaluate,wait,click,fill,screenshot}=browser;
/** Wait for the new document, so an old screen cannot satisfy an assertion during reload. */
const navigate=async url=>{
  await evaluate('window.__navigationOldDocument=true');
  await send('Page.navigate',{url});
  await wait(`!window.__navigationOldDocument&&document.readyState==='complete'&&Boolean(document.querySelector('#root')?.children.length)`,'documento nuevo');
};
const reload=async selector=>{
  await evaluate('window.__navigationOldDocument=true');await send('Page.reload');
  await wait(`!window.__navigationOldDocument&&Boolean(document.querySelector(${JSON.stringify(selector)}))`,'recarga '+selector);
};
const path=value=>wait(`location.pathname===${JSON.stringify(value)}`,'ruta '+value);
const ready=selector=>wait(`Boolean(document.querySelector(${JSON.stringify(selector)}))`,'pantalla '+selector);
const setRole=async(role,url='/')=>{
  await evaluate(`sessionStorage.setItem('navigation-fixture-role',${JSON.stringify(role)})`);
  await navigate(web+url);await wait(`!document.body.textContent.includes('Verificando sesión')`);
};
const back=()=>evaluate('history.back()'),forward=()=>evaluate('history.forward()');
const discard=()=>click('Descartar cambios y salir');
/** Chrome only allows cancelling a native Escape close after a trusted user activation. */
const trustedClick=async label=>{
  const point=await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(value=>value.textContent.trim()===${JSON.stringify(label)});button.scrollIntoView({block:'center',behavior:'instant'});const box=button.getBoundingClientRect();return{x:box.x+box.width/2,y:box.y+box.height/2};})()`);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
};
await send('Page.addScriptToEvaluateOnNewDocument',{source:`(${installNavigationFixture.toString()})();`});
try{
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await navigate(web+'/empleos?search=gestión&page=2');await ready('.jrow');
  assert.equal(await evaluate(`document.querySelector('[aria-label="Buscar oportunidades"]').value`),'gestión');
  const initialIndex=await evaluate('history.state.idx');
  await fill('[aria-label="Buscar oportunidades"]','nueva búsqueda');await fill('[aria-label="Buscar oportunidades"]','búsqueda final');
  await wait(`new URLSearchParams(location.search).get('search')==='búsqueda final'&&!new URLSearchParams(location.search).has('page')`,'búsqueda reemplaza y reinicia página');
  assert.equal(await evaluate('history.state.idx'),initialIndex);
  await ready('.jrow');await click('Siguiente');await wait(`new URLSearchParams(location.search).get('page')==='2'`);await ready('.jrow');
  await evaluate(`window.scrollTo(0,250)`);
  await wait(`scrollY>100`,'desplazamiento previo');
  await evaluate(`document.querySelector('.jrow').click()`);await path('/empleos/job-21');await ready('.ds-apply');
  await back();await path('/empleos');await ready('.jrow');await wait(`window.scrollY>100`,'restaurar desplazamiento');
  assert.equal(await evaluate(`new URLSearchParams(location.search).get('page')`),'2');
  await forward();await path('/empleos/job-21');await reload('.ds-apply');
  assert.match(await evaluate('document.body.textContent'),/Oportunidad job-21/);
  await navigate(web+'/estudiantes?page=-1');await path('/estudiantes/horas-sociales');await wait(`!location.search.includes('page')`);
  await navigate(web+'/ruta-inexistente');await wait(`document.body.textContent.includes('Página no encontrada')`);
  await navigate(web+'/voluntariado/volunteer-1');await ready('dialog[open]');await click('Cerrar detalle de vacante');await path('/voluntariado');
  await navigate(web+'/empleos');await ready('.jr-qv');await click('Vista rápida →');await ready('dialog#qv-overlay[open]');
  assert.equal(await evaluate(`new URLSearchParams(location.search).get('preview')`),'job-1');
  await back();await wait(`!document.querySelector('#qv-overlay')`);await forward();await ready('dialog#qv-overlay[open]');
  await reload('dialog#qv-overlay[open]');await click('Cerrar');
  await navigate(web+'/empleos?search=anterior');await ready('.jrow');await fill('[aria-label="Buscar oportunidades"]','búsqueda todavía pendiente');await click('Voluntariado');await path('/voluntariado');
  await back();await path('/empleos');await wait(`document.querySelector('[aria-label="Buscar oportunidades"]').value==='anterior'`,'cancelar debounce al salir y volver');
  console.log('Visitante: filtros, páginas, atrás/adelante, recarga, enlaces directos, redirección, 404 y vista rápida.');

  await navigate(web+'/postular/volunteer-1');await path('/login');
  assert.equal(await evaluate(`new URLSearchParams(location.search).get('returnTo')`),'/postular/volunteer-1');
  await fill('#login-email','candidate@example.test');await fill('#login-password','Clave de prueba 2026');
  await evaluate(`document.querySelector('.login-form').requestSubmit()`);await path('/postular/volunteer-1');await ready('.application-form');
  const stepIndex=await evaluate('history.state.idx');await click('Continuar →');await wait(`document.body.textContent.includes('Paso 2 de 4')`);
  assert.equal(await evaluate('history.state.idx'),stepIndex);
  await evaluate('window.__navigationFixture.failSave=true');
  await fill('[name="experience.motivation"]','Esta edición debe conservarse cuando el guardado falla.');
  await click('Empleos');await wait(`document.body.textContent.includes('Guardado de prueba fallido')`);
  assert.equal(await evaluate('location.pathname'),'/postular/volunteer-1');
  assert.equal(await evaluate(`document.querySelector('[name="experience.motivation"]').value`),'Esta edición debe conservarse cuando el guardado falla.');
  await evaluate('window.__navigationFixture.failSave=false');await click('Empleos');await path('/empleos');
  await back();await path('/postular/volunteer-1');await ready('.application-form');
  await click('Continuar →');await wait(`document.body.textContent.includes('Paso 3 de 4')`);
  await evaluate(`window.__navigationFixture.holdCv=true;const input=document.querySelector('input[type=file]');const transfer=new DataTransfer();transfer.items.add(new File(['%PDF-1.4 prueba'],'prueba.pdf',{type:'application/pdf'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));`);
  await wait(`Boolean(window.__navigationFixture.releaseCv)`,'CV en curso');await click('Empleos');await ready('.navigation-dialog[open]');
  assert.match(await evaluate(`document.querySelector('.navigation-dialog').textContent`),/operación/);
  assert.equal(await evaluate(`document.querySelector('.navigation-dialog').textContent.includes('Descartar cambios y salir')`),false);
  await click('Seguir editando');await evaluate('window.__navigationFixture.releaseCv()');await wait(`Boolean(document.querySelector('.btn-next-f'))&&!document.querySelector('.btn-next-f').disabled`,'fin de la operación CV');
  await click('Continuar →');await wait(`document.body.textContent.includes('Paso 4 de 4')`);await click('Enviar postulación ✓');await path('/postulaciones/7/confirmacion');
  const submittedIndex=await evaluate('history.state.idx');assert.equal(submittedIndex,stepIndex);
  await reload('.application-confirmation');await wait(`document.body.textContent.includes('FQA-7')`,'confirmación recuperada');
  console.log('Postulación: retorno de login, pasos locales, fallo de guardado, CV activo, envío por reemplazo y confirmación recargada.');

  await setRole('CANDIDATE','/perfil/postulaciones/7?page=2&draftPage=2');await ready('.application-dialog[open]');
  await click('Cerrar detalle');await path('/perfil/postulaciones');assert.equal(await evaluate(`new URLSearchParams(location.search).get('draftPage')`),'2');
  await navigate(web+'/perfil/notificaciones/postulaciones/7?page=2');await ready('.application-dialog[open]');await click('Cerrar detalle');await path('/perfil/notificaciones');
  await navigate(web+'/?postulacion=7');await path('/perfil/postulaciones/7');await ready('.application-dialog[open]');
  await navigate(web+'/perfil?summary=employment');await wait(`document.body.textContent.includes('Postulaciones a empleos')`);
  await navigate(web+'/perfil/configuracion');await ready('#profile-settings-currentPassword');await fill('#profile-settings-currentPassword','sin guardar');
  await click('Empleos');await ready('.navigation-dialog[open]');await click('Seguir editando');assert.equal(await evaluate('location.pathname'),'/perfil/configuracion');
  await click('Empleos');await ready('.navigation-dialog[open]');await discard();await path('/empleos');
  await navigate(web+'/?guardar=job-1');await path('/perfil');await wait(`!location.search.includes('guardar')`);
  assert.equal(await evaluate(`window.__navigationFixture.calls.filter(value=>value==='PUT /saved-opportunities/job-1').length`),1);
  console.log('Candidato: detalles, notificaciones, resumen, descarte y enlaces antiguos consumidos una vez.');

  for(const role of ['ADMINISTRATOR','SUPER_ADMIN']){
    await setRole(role,'/empleos/job-1');await wait(`document.body.textContent.includes('Oportunidad job-1')`);
    assert.equal(await evaluate(`Boolean(document.querySelector('.ds-apply,.save-opportunity-button'))`),false);
    await evaluate(`document.querySelector('.nav-avatar').click()`);await wait(`Boolean(document.querySelector('a[href="/admin"]'))`);
    await click('Mi perfil');await path('/perfil');await wait(`document.body.textContent.includes(${JSON.stringify(role==='SUPER_ADMIN'?'Super Admin':'Administrador')})`);
    await ready('.account-profile-card');
    assert.equal(await evaluate(`window.__navigationFixture.calls.some(value=>value.includes('/profile/')||value.includes('/application-drafts'))`),false);
    await navigate(web+'/perfil/configuracion');await ready('#profile-settings-currentPassword');await fill('#profile-settings-currentPassword','edición privada');
    assert.equal(await evaluate(`Boolean(document.querySelector('.profile-settings-sessions .session-controls button'))`),true);
    assert.equal(await evaluate(`(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;})()`),true);
    assert.equal(await evaluate(`JSON.stringify(history.state).includes('edición privada')`),false);
    await evaluate(`document.querySelector('.account-profile a[href="/admin"]').click()`);await ready('.navigation-dialog[open]');await click('Seguir editando');
    assert.equal(await evaluate('location.pathname'),'/perfil/configuracion');
    await evaluate(`document.querySelector('.account-profile a[href="/admin"]').click()`);await ready('.navigation-dialog[open]');await discard();await path('/admin');
    await ready('.topbar .profile');await click('Menú de mi cuenta');await ready('.profile-menu');
    assert.equal(await evaluate(`document.querySelector('.profile-menu').textContent.includes('Cerrar todas mis sesiones')`),false);
    assert.equal(await evaluate(`(()=>{const links=[...document.querySelectorAll('.profile-menu a')];return links.length===2&&links[1].getBoundingClientRect().top>=links[0].getBoundingClientRect().bottom;})()`),true);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await wait(`!document.querySelector('.profile-menu')&&document.activeElement.matches('.topbar .profile')`,'cerrar menú y recuperar foco');
    await navigate(web+'/postular/volunteer-1');await wait(`document.body.textContent.includes('Acceso no autorizado')`);
    assert.equal(await evaluate(`window.__navigationFixture.calls.some(value=>value.startsWith('POST /application-drafts'))`),false);
    await navigate(web+'/admin/vacantes/job-1/editar');await ready('.vacancy-editor');await fill('[name=title]','Título editado sin guardar');
    await click('Organizaciones');await ready('.navigation-dialog[open]');await click('Seguir editando');assert.equal(await evaluate('location.pathname'),'/admin/vacantes/job-1/editar');
    await click('Cancelar');await ready('.navigation-dialog[open]');await discard();await path('/admin/vacantes');
    await click('Categorías');await path('/admin/categorias');await ready('[aria-label="Editar Administración"]');await click('Editar Administración');await ready('dialog[open]');
    await fill('dialog input','Categoría editada');await click('Cancelar');await ready('.navigation-dialog[open]');await click('Seguir editando');await ready('.vacancy-form-dialog[open]');
    await back();await ready('.navigation-dialog[open]');await click('Seguir editando');assert.equal(await evaluate('location.pathname'),'/admin/categorias');
    await back();await ready('.navigation-dialog[open]');await discard();await path('/admin/vacantes');
    await forward();await path('/admin/categorias');await wait(`!document.querySelector('.vacancy-form-dialog')`);
    await navigate(web+'/admin/organizaciones/1');await ready('.organization-dialog[open]');await click('Cerrar');await path('/admin/organizaciones');await wait(`!document.querySelector('.organization-dialog')`);
    await ready('.organizaciones-screen');await trustedClick('+ Nueva organización');await wait(`document.querySelector('.organization-dialog[open] h2')?.textContent.trim()==='Nueva organización'`);await fill('.organization-dialog input','Organización sin guardar');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await ready('.navigation-dialog[open]');await click('Seguir editando');
    await wait(`!document.querySelector('.navigation-dialog')&&Boolean(document.querySelector('.organization-dialog[open]'))&&document.querySelector('.organization-dialog').contains(document.activeElement)`,'foco al seguir editando organización');
    await click('Cancelar');await ready('.navigation-dialog[open]');await discard();await wait(`!document.querySelector('.organization-dialog')`);
    await wait(`document.activeElement.textContent.trim()==='+ Nueva organización'`,'foco al cerrar organización');
    await navigate(web+'/admin/postulaciones/7');await ready('.application-dialog[open]');await click('Cerrar detalle');await path('/admin/postulaciones');
    await click('Usuarios');await path('/admin/usuarios');await ready('.usuarios-screen');await trustedClick('+ Nuevo usuario');await ready('.users-dialog[open]');
    await fill('#managed-name','Cuenta sin guardar');await click('Cancelar');await ready('.navigation-dialog[open]');await discard();await wait(`!document.querySelector('.users-dialog')`);
    await wait(`document.activeElement.textContent.trim()==='+ Nuevo usuario'`,'foco al cerrar usuario');
    await click('Estadísticas');await path('/admin/estadisticas');await ready('.statistics-calendar');
    await wait(`new URLSearchParams(location.search).has('from')&&new URLSearchParams(location.search).has('to')`,'rango inicial explícito');
    await fill('.statistics-calendar input[type=date]','2026-01-01');
    await evaluate(`(()=>{const input=document.querySelectorAll('.statistics-calendar input[type=date]')[1];Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'2026-02-01');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await click('Aplicar');await wait(`new URLSearchParams(location.search).get('from')==='2026-01-01'`);await back();
    await wait(`new URLSearchParams(location.search).get('from')!=='2026-01-01'`);await forward();await wait(`document.querySelector('.statistics-calendar input[type=date]').value==='2026-01-01'`);
    await reload('.statistics-calendar');assert.equal(await evaluate(`document.querySelector('.statistics-calendar input[type=date]').value`),'2026-01-01');
    console.log(role+': páginas públicas, cuenta, prohibición de postular, detalle directo y descartes con atrás/adelante.');
  }
  await setRole('CANDIDATE','/admin');await wait(`document.body.textContent.includes('Acceso no autorizado')`);
  await setRole('CANDIDATE','/perfil/configuracion');await ready('#profile-settings-currentPassword');await fill('#profile-settings-currentPassword','cambios que deben seguir protegidos');
  await evaluate('window.__navigationFixture.failLogout=true');await click('Cerrar todas mis sesiones');await ready('.navigation-dialog[open]');await click('Seguir editando');
  assert.equal(await evaluate(`window.__navigationFixture.calls.some(value=>value.includes('/auth/logout'))`),false);
  await click('Cerrar todas mis sesiones');await ready('.navigation-dialog[open]');await discard();await wait(`document.body.textContent.includes('Cierre de prueba fallido')`);
  await click('Empleos');await ready('.navigation-dialog[open]');await click('Seguir editando');
  await evaluate('window.__navigationFixture.failLogout=false');await click('Cerrar todas mis sesiones');await ready('.navigation-dialog[open]');await discard();await path('/');await ready('.nav .btn-ghost');
  await setRole('CANDIDATE','/perfil/configuracion');await ready('#profile-settings-currentPassword');await fill('#profile-settings-currentPassword','campo de la cuenta anterior');
  await evaluate(`(async()=>{const access=await(await fetch('/api/auth/refresh')).json();access.userId=99;access.roles=['ADMINISTRATOR'];access.user={...access.user,id:99,fullName:'Cuenta cambiada'};const channel=new BroadcastChannel('fqa-auth-session');channel.postMessage({status:'authenticated',session:access,accessExpiresAt:Date.now()+3600000,error:''});channel.close();})()`);
  await ready('.account-profile');assert.equal(await evaluate(`document.querySelector('#profile-settings-currentPassword').value`),'');
  await setRole('CANDIDATE','/perfil/notificaciones');await ready('.application-notifications');
  await evaluate(`window.__navigationFixture.expired=true;window.dispatchEvent(new Event('focus'));`);await path('/login');
  assert.equal(await evaluate(`new URLSearchParams(location.search).get('returnTo')`),'/perfil/notificaciones');
  await setRole('anonymous','/reset-password?token=credencial-de-prueba');await ready('.login-form');assert.equal(await evaluate('location.search.includes("token")'),false);
  await screenshot('navegacion-final');assert.deepEqual(browser.errors,[]);
  console.log('Aceptación de navegación completada sin errores de ejecución.');
}catch(failure){await screenshot('fallo-navegacion');console.error(await evaluate(`({path:location.pathname,search:location.search,text:document.body.innerText.slice(-1500)})`));throw failure;}
finally{await browser.close();}
