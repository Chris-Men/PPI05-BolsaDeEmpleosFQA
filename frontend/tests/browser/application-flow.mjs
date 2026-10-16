import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/** Manual CDP check uses a temporary browser profile and the guarded backend test fixture. */
const web='http://localhost:5173';const api='http://localhost:3100';const debugging='http://127.0.0.1:9338';
const output=join(tmpdir(),'fqa-pb238-browser-check');await mkdir(output,{recursive:true});
const fixture=await (await fetch(api+'/__test/fixture')).json();
const browserPdf='%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF';
const target=await (await fetch(debugging+'/json/new?'+encodeURIComponent(web),{method:'PUT'})).json();
const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
let sequence=0;const pending=new Map();const errors=[];
socket.addEventListener('message',event=>{const value=JSON.parse(event.data);if(value.id){const entry=pending.get(value.id);pending.delete(value.id);if(value.error)entry?.reject(new Error(value.error.message));else entry?.resolve(value.result);}if(value.method==='Runtime.exceptionThrown')errors.push(value.params.exceptionDetails.text+': '+(value.params.exceptionDetails.exception?.description??''));});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
/** Waits for a new document, so a stale pre-navigation DOM cannot satisfy a step assertion. */
const nextLoad=()=>new Promise(resolve=>{const listener=event=>{if(JSON.parse(event.data).method==='Page.loadEventFired'){socket.removeEventListener('message',listener);resolve();}};socket.addEventListener('message',listener);});
const navigate=async(url)=>{const loaded=nextLoad();await send('Page.navigate',{url});await loaded;};
const evaluate=async(expression)=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text);return result.result.value;};
const wait=async(expression,label=expression)=>{const until=Date.now()+20000;while(Date.now()<until){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Tiempo agotado: '+label);};
const click=async(text)=>evaluate(`(()=>{const button=Array.from(document.querySelectorAll('button')).find(item=>(item.textContent.trim()===${JSON.stringify(text)}||item.getAttribute('aria-label')===${JSON.stringify(text)})&&!item.disabled);if(!button)throw new Error('Botón no disponible: '+${JSON.stringify(text)});button.click();})()`);
const fill=async(selector,value)=>evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});if(!input)throw new Error('Campo no disponible');const type=input instanceof HTMLTextAreaElement?HTMLTextAreaElement:HTMLInputElement;Object.getOwnPropertyDescriptor(type.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
const screenshot=async(name)=>{const result=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(output,name+'.png'),Buffer.from(result.data,'base64'));};
const step=async(number)=>wait(`document.querySelector('.prog-txt')?.textContent.includes('Paso ${number} de 4')`,'paso '+number);
const login=async(email)=>{await wait(`Boolean(document.querySelector('#login-email'))`,'login');await fill('#login-email',email);await fill('#login-password','Postulaciones de prueba 2026');await evaluate(`document.querySelector('.login-form').requestSubmit()`);};
/** Uploads controlled test PDFs through the same input used by candidates. */
const uploadCv=async(name,content=browserPdf)=>evaluate(`(()=>{const transfer=new DataTransfer();transfer.items.add(new File([${JSON.stringify(content)}],${JSON.stringify(name)},{type:'application/pdf'}));const input=document.querySelector('input[type=file]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
/** Downloads are checked against original bytes, without exposing session credentials. */
const assertDownload=async(content)=>{
  const before=await evaluate(`window.__cvDownloads.length`);await click('Descargar CV');
  await wait(`window.__cvDownloads.length>${before}`,'descarga del documento seleccionado');
  const result=await evaluate(`window.__cvDownloads.at(-1)`);
  assert.match(result.path,/\/application-drafts\/[0-9a-f-]{36}\/resume\/download$/);assert.equal(result.content,content);
};
const logout=async()=>{
  await evaluate(`(document.querySelector('.nav-avatar')??document.querySelector('.topbar button.profile')).click()`);
  await click('Cerrar sesión');
  const modal=await evaluate(`Array.from(document.querySelectorAll('button')).some(item=>item.textContent.trim()==='Sí, cerrar sesión')`);
  if(modal)await click('Sí, cerrar sesión');
  await wait(`Boolean(document.querySelector('#login-email'))||Boolean(document.querySelector('.navbar'))`,'cierre de sesión');
};
await send('Page.enable');await send('Runtime.enable');await send('Network.clearBrowserCookies');
await send('Page.addScriptToEvaluateOnNewDocument',{source:`const originalFetch=window.fetch.bind(window);window.__cvDownloads=[];window.fetch=(input,options)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);const request=url.pathname.startsWith('/api')?originalFetch(${JSON.stringify(api)}+url.pathname+url.search,options):originalFetch(input,options);if(url.pathname.endsWith('/resume/download'))return request.then(async response=>{if(response.ok)window.__cvDownloads.push({path:url.pathname,content:await response.clone().text()});return response;});return request;};`});
const submissions=[];
try {
  for(let index=0;index<fixture.vacancies.length;index++){
    const vacancy=fixture.vacancies[index];const mobile=index%2===1;
    await send('Emulation.setDeviceMetricsOverride',{width:mobile?390:1440,height:mobile?844:1000,deviceScaleFactor:1,mobile});
    await navigate(web+'/?postular='+vacancy.key);
    if(index===0)await login(fixture.candidateEmail);
    await step(1);assert.equal(await evaluate(`document.querySelector('input[type=email]').readOnly`),true);
    await fill('input[id$="-phone"]','71234567');await click('Continuar →');await step(2);
    await fill('textarea[id$="-motivation"]','Motivación persistente '+vacancy.kind);
    await wait(`document.querySelector('.autosave-row')?.textContent==='Borrador guardado'`,'guardado automático');
    if(index===0){
      await fill('textarea[id$="-motivation"]','Cambio justo antes de cerrar sesión');await logout();await login(fixture.candidateEmail);await step(2);assert.equal(await evaluate(`document.querySelector('textarea[id$="-motivation"]').value`),'Cambio justo antes de cerrar sesión');
      await fill('textarea[id$="-motivation"]','Motivación persistente '+vacancy.kind);await wait(`document.querySelector('.autosave-row')?.textContent==='Borrador guardado'`,'guardado antes de recargar');
      const loaded=nextLoad();await send('Page.reload');await loaded;await step(2);assert.equal(await evaluate(`document.querySelector('textarea[id$="-motivation"]').value`),'Motivación persistente '+vacancy.kind);
    }
    await click('Continuar →');await step(3);
    assert.equal(await evaluate(`document.querySelectorAll('.form-page .resume-manager').length`),1);
    assert.equal(await evaluate(`document.querySelectorAll('.form-page > .review-block').length`),0);
    if(vacancy.kind==='EMPLOYMENT'||vacancy.kind==='INTERNSHIP'){
      if(index===0){await click('Continuar →');await step(3);await wait(`document.querySelector('.resume-manager [role=alert]')?.textContent.includes('requiere un CV')`,'CV obligatorio');}
      await uploadCv('browser-cv.pdf');
      await wait(`document.body.textContent.includes('CV guardado correctamente.')`,'subida del CV');
      await assertDownload(browserPdf);
      if(index===0){
        await click('Guardar y salir');await wait(`Boolean(document.querySelector('.profile-documents-card input[type=file]'))`,'CV del perfil');
        assert.equal(await evaluate(`document.querySelector('.profile-documents-card h3')?.textContent`),'Mi currículum');
        await uploadCv('profile-new.pdf',browserPdf+'\n% Documento nuevo del perfil');
        await wait(`document.querySelector('.profile-documents-card strong')?.textContent==='profile-new.pdf'`,'reemplazo desde el perfil');
        await navigate(web+'/?postular='+vacancy.key);await step(3);
        assert.equal(await evaluate(`document.querySelector('.resume-manager strong').textContent`),'browser-cv.pdf');
        await wait(`Array.from(document.querySelectorAll('button')).some(button=>button.textContent==='Usar CV del perfil'&&!button.disabled)`,'CV del perfil diferente del borrador');
        await assertDownload(browserPdf);
        await click('Usar CV del perfil');await wait(`document.querySelector('.resume-manager strong').textContent==='profile-new.pdf'`,'selección explícita del perfil');
        await assertDownload(browserPdf+'\n% Documento nuevo del perfil');
        await click('Eliminar CV del perfil');await click('Confirmar eliminación');
        await wait(`document.querySelector('.resume-manager [role=status]')?.textContent.includes('se conserva')`,'eliminar perfil conserva el CV del borrador');
        assert.equal(await evaluate(`document.querySelector('.resume-manager strong').textContent`),'profile-new.pdf');
        await assertDownload(browserPdf+'\n% Documento nuevo del perfil');
        await navigate(web+'/?postular='+vacancy.key);await step(3);
        assert.equal(await evaluate(`document.querySelector('.resume-manager strong').textContent`),'profile-new.pdf');
        await assertDownload(browserPdf+'\n% Documento nuevo del perfil');
        await evaluate(`(()=>{const previous=window.fetch;let fail=true;window.fetch=(input,options)=>{if(fail&&new URL(input,location.href).pathname.endsWith('/profile/me/resume')&&options?.method==='PUT'){fail=false;return Promise.resolve(Response.json({message:'Fallo recuperable de CV.'},{status:503}));}return previous(input,options);};})()`);
        await uploadCv('replacement.pdf',browserPdf+'\n% Documento reemplazado');
        await wait(`document.querySelector('.resume-manager [role=alert]')?.textContent.includes('Fallo recuperable')`,'reemplazo fallido');
        assert.equal(await evaluate(`document.querySelector('.resume-manager strong').textContent`),'profile-new.pdf');
        await uploadCv('replacement.pdf',browserPdf+'\n% Documento reemplazado');
        await wait(`document.querySelector('.resume-manager strong').textContent==='replacement.pdf'`,'reemplazo confirmado');
        await assertDownload(browserPdf+'\n% Documento reemplazado');
        await screenshot('cv-unificado-desktop');
      }
    }else await click('Continuar sin CV');
    await screenshot('documentos-'+vacancy.kind+(mobile?'-mobile':'-desktop'));
    await click('Continuar →');await step(4);
    if(index===0){
      await evaluate(`(()=>{const previous=window.fetch;let fail=true;window.fetch=(input,options)=>{if(fail&&new URL(input,location.href).pathname.endsWith('/applications')&&options?.method==='POST'){fail=false;return Promise.resolve(Response.json({message:'Fallo recuperable de pruebas.'},{status:503}));}return previous(input,options);};})()`);
      await click('Enviar postulación ✓');await wait(`document.querySelector('.application-error')?.textContent.includes('Fallo recuperable')`,'error sin confirmación falsa');assert.equal(await evaluate(`Boolean(document.querySelector('.application-confirmation'))`),false);
    }
    await click('Enviar postulación ✓');
    await wait(`document.querySelector('.application-confirmation h1')?.textContent.includes('enviada')`,'confirmación real');
    const reference=await evaluate(`document.querySelector('.application-confirmation dd').textContent`);assert.match(reference,/^FQA-\d{4}-/);submissions.push({kind:vacancy.kind,reference});
    await click('Ver mi postulación');await wait(`Boolean(document.querySelector('dialog[open]'))`,'detalle propio');
    await screenshot('detalle-'+vacancy.kind+(mobile?'-mobile':'-desktop'));await evaluate(`document.querySelector('button[aria-label="Cerrar detalle"]').click()`);
  }
  await logout();await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await login(fixture.adminEmail);await wait(`Boolean(document.querySelector('.sidebar .menu'))`,'administración');await click('Postulaciones');
  await wait(`document.querySelectorAll('.application-table tbody tr').length===4`,'listado administrativo');await screenshot('admin-desktop');
  for(const submission of submissions){
    await wait(`Array.from(document.querySelectorAll('.application-table tbody tr')).some(item=>item.textContent.includes(${JSON.stringify(submission.reference)}))`,'listado actualizado');
    await evaluate(`(()=>{const row=Array.from(document.querySelectorAll('.application-table tbody tr')).find(item=>item.textContent.includes(${JSON.stringify(submission.reference)}));row.querySelector('button').click();})()`);
    await wait(`Boolean(document.querySelector('dialog[open] .application-history'))`,'detalle administrativo');
    await click('Pasar a revisión');await click('Confirmar');await wait(`document.querySelector('dialog[open] .application-status')?.textContent==='En revisión'`,'revisión');
    await click(submission.kind==='VOLUNTEER'?'Rechazar':'Seleccionar');await fill('.application-confirm textarea','Decisión del administrador de pruebas');await click('Confirmar');
    await wait(`['Seleccionada','Rechazada'].includes(document.querySelector('dialog[open] .application-status')?.textContent)`,'decisión');await evaluate(`document.querySelector('button[aria-label="Cerrar detalle"]').click()`);
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await screenshot('admin-mobile');
  await logout();await login(fixture.candidateEmail);await wait(`Boolean(document.querySelector('.profile-sidebar'))`,'perfil tras cambio de cuenta');
  await evaluate(`document.querySelector('dialog[open] button[aria-label="Cerrar detalle"]')?.click()`);
  await evaluate(`Array.from(document.querySelectorAll('.profile-sidebar button')).find(item=>item.textContent.includes('Notificaciones')).click()`);
  await wait(`document.querySelectorAll('.application-notifications article').length>=4`,'notificaciones reales');await screenshot('notificaciones-mobile');await click('Marcar todas como leídas');await wait(`document.querySelector('.application-heading p')?.textContent==='0 sin leer'`,'lectura de todas');
  await logout();await login(fixture.otherEmail);await wait(`Boolean(document.querySelector('.profile-sidebar'))`,'otra cuenta');await evaluate(`document.querySelector('dialog[open] button[aria-label="Cerrar detalle"]')?.click()`);await evaluate(`Array.from(document.querySelectorAll('.profile-sidebar button')).find(item=>item.textContent.includes('Mis postulaciones')).click()`);await wait(`document.body.textContent.includes('No hay postulaciones con estos filtros.')`,'aislamiento entre cuentas');
  assert.equal(errors.length,0,errors.join('\n'));console.log(JSON.stringify({completed:submissions.map(item=>item.kind),draftReload:true,adminDecisions:true,notifications:true,accountIsolation:true,screenshots:output}));
}catch(error){await screenshot('fallo');throw error;}
finally {socket.close();await fetch(debugging+'/json/close/'+target.id);await fetch(api+'/__test/cleanup',{method:'POST'});}
