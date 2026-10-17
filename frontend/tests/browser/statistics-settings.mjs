import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/** Real browser acceptance against the guarded statistics-browser API and its independent _test DB. */
const web = 'http://localhost:5173';
const api = 'http://localhost:3100';
const debugging = 'http://127.0.0.1:9342';
const fixture = await (await fetch(api + '/__test/fixture')).json();
assert.equal(fixture.opportunities, 112);
const output = join(tmpdir(), 'fqa-statistics-settings-browser');
await mkdir(output, { recursive: true });
const target = await (await fetch(debugging + '/json/new?about:blank', { method: 'PUT' })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
let sequence = 0;
const pending = new Map();
const errors = [];
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const task = pending.get(message.id); pending.delete(message.id);
    if (message.error) task?.reject(new Error(message.error.message)); else task?.resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
};
const wait = async (expression, label = expression, timeout = 20000) => {
  const until = Date.now() + timeout;
  while (Date.now() < until) { if (await evaluate(expression)) return; await new Promise(resolve => setTimeout(resolve, 100)); }
  throw new Error('Tiempo agotado: ' + label);
};
const navigate = async url => { await send('Page.navigate', { url }); await wait(`document.readyState==='complete' && Boolean(document.querySelector('#root')?.children.length)`, 'navegación'); };
const click = label => evaluate(`(()=>{const button=Array.from(document.querySelectorAll('button')).find(item=>(item.textContent.trim()===${JSON.stringify(label)}||item.getAttribute('aria-label')===${JSON.stringify(label)})&&!item.disabled);if(!button)throw new Error('Botón no disponible: '+${JSON.stringify(label)});button.click();})()`);
const fill = (selector, value) => evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});if(!input)throw new Error('Campo no disponible: '+${JSON.stringify(selector)});const prototype=input instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:input instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event(input instanceof HTMLSelectElement?'change':'input',{bubbles:true}));})()`);
const screenshot = async name => { const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(join(output, name + '.png'), Buffer.from(result.data, 'base64')); };
const width = async () => { const size = await evaluate(`({viewport:document.documentElement.clientWidth,content:document.documentElement.scrollWidth})`); assert.ok(size.content <= size.viewport + 1, JSON.stringify(size)); };
const login = async role => { await click('Ingresar'); await wait(`Boolean(document.querySelector('#login-email'))`, 'login'); await fill('#login-email', fixture.accounts[role]); await fill('#login-password', 'Estadisticas de navegador 2026'); await evaluate(`document.querySelector('.login-form').requestSubmit()`); await wait(`Boolean(document.querySelector(${JSON.stringify(role === 'CANDIDATE' ? '.nav-avatar' : '.topbar')}))`, 'sesión ' + role); };
const logout = async admin => { await evaluate(`document.querySelector(${JSON.stringify(admin ? '.topbar .profile' : '.nav-avatar')}).click()`); await click('Cerrar sesión'); await wait(`Boolean(document.querySelector('.nav .btn-ghost'))`, 'cierre de sesión'); };
const openSettings = async () => { await click('Configuración'); await wait(`Boolean(document.querySelector('#site-inicio-titulo'))`, 'configuración'); };
const save = async () => { await click('Guardar cambios'); await wait(`document.querySelector('.configuration-notice')?.textContent.includes('guardada correctamente')`, 'guardado confirmado'); };
const privateHeaders = token => ({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'X-FQA-Request': '1', 'Origin': web });
/** A separate HTTP session exercises concurrent editors without exposing tokens in output. */
const tokenFor = async role => { const response = await fetch(api + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-FQA-Request': '1', Origin: web }, body: JSON.stringify({ email: fixture.accounts[role], password: 'Estadisticas de navegador 2026' }) }); assert.equal(response.status, 200); return (await response.json()).accessToken; };
await send('Page.enable'); await send('Runtime.enable'); await send('Network.clearBrowserCookies');
await send('Page.addScriptToEvaluateOnNewDocument', { source: `const originalFetch=window.fetch.bind(window);window.fetch=(input,options)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(url.pathname.startsWith('/api'))return originalFetch(${JSON.stringify(api)}+url.pathname+url.search,options);return originalFetch(input,options);};` });
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await navigate(web + '/'); await wait(`Boolean(document.querySelector('.nav .btn-ghost'))`, 'Home'); await login('SUPER_ADMIN');
  await wait(`document.querySelector('.cards .card h2')?.textContent.trim()==='112'`, 'totales completos');
  assert.equal(await evaluate(`document.querySelectorAll('.table-box tbody tr').length`), 10);
  assert.equal(await evaluate(`document.querySelectorAll('.cards .card h2')[2].textContent.trim()`), '2');
  await screenshot('dashboard-desktop'); await width();
  await click('Estadísticas'); await wait(`document.querySelector('.stat-card strong')?.textContent==='0'`, 'rango inicial');
  for (const preset of ['90', 'year', '30']) {
    await fill('.period-select', preset);
    await wait(`document.querySelector('.period-select').value===${JSON.stringify(preset)} && !document.querySelector('.estadisticas-screen').getAttribute('aria-busy').includes('true')`, 'período ' + preset);
    const dates = await evaluate(`Array.from(document.querySelectorAll('.statistics-calendar input')).map(item=>item.value)`);
    assert.ok(dates[0] && dates[1] && dates[0] <= dates[1]);
    if (preset === 'year') assert.ok(dates[0].endsWith('-01-01'));
  }
  await fill('.statistics-calendar input:first-of-type', '2030-01-01');
  await fill('.statistics-calendar label:nth-of-type(3) input', '2030-01-31'); await click('Aplicar');
  await wait(`document.querySelector('.stat-card strong')?.textContent==='112'`, '112 publicaciones');
  assert.equal(await evaluate(`document.querySelectorAll('.progress-item small').length`), 4);
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('.progress-item small')).map(item=>Number(item.textContent.split(' ')[0]))`), [36, 4, 36, 36]);
  await screenshot('estadisticas-desktop');
  await fill('.statistics-calendar label:nth-of-type(2) input', '2030-02-01'); await click('Aplicar');
  await wait(`document.querySelector('.statistics-error')?.textContent.includes('posterior')`, 'rango inválido');
  assert.equal(await evaluate(`document.querySelector('.stat-card strong').textContent`), '112');
  await fill('.statistics-calendar label:nth-of-type(2) input', '2030-01-01'); await click('Aplicar');
  await evaluate(`(()=>{const previous=window.fetch;let fail=true;window.fetch=(input,options)=>{if(fail&&new URL(input,location.href).pathname==='/api/admin/statistics'){fail=false;return Promise.resolve(Response.json({message:'Fallo recuperable de indicadores.'},{status:503}));}return previous(input,options);};})()`);
  await wait(`document.querySelector('.estadisticas-screen')?.getAttribute('aria-busy')==='false'`, 'fin carga'); await click('Actualizar');
  await wait(`document.querySelector('.statistics-error')?.textContent.includes('Fallo recuperable')`, 'error de indicadores');
  assert.equal(await evaluate(`document.querySelector('.stat-card strong').textContent`), '—');
  await click('Reintentar indicadores'); await wait(`document.querySelector('.stat-card strong')?.textContent==='112'`, 'recuperación');
  for (const size of [390, 320]) { await send('Emulation.setDeviceMetricsOverride', { width: size, height: 844, deviceScaleFactor: 1, mobile: true }); await width(); await screenshot('estadisticas-mobile-' + size); }
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await openSettings(); assert.equal(await evaluate(`document.querySelectorAll('.settings-card').length`), 4);
  assert.equal(await evaluate(`Boolean(document.querySelector('#site-institucional-descripcion'))`), false);
  const initial = await evaluate(`document.querySelector('#site-inicio-titulo').value`);
  await fill('#site-inicio-titulo', 'Sin guardar'); await click('Cancelar cambios'); assert.equal(await evaluate(`document.querySelector('#site-inicio-titulo').value`), initial);
  await fill('#site-redes-facebook', 'javascript:alert(1)'); await click('Guardar cambios');
  await wait(`document.querySelector('#site-redes-facebook').getAttribute('aria-invalid')==='true'`, 'validación por campo');
  await fill('#site-redes-facebook', 'https://example.test/fqa');
  for (const [selector, value] of Object.entries({ '#site-inicio-titulo': 'Impacto <script>seguro</script>', '#site-inicio-subtitulo': 'Subtítulo público de prueba', '#site-inicio-descripcion': 'Descripción pública de prueba', '#site-institucional-mision': 'Misión pública de prueba', '#site-institucional-vision': 'Visión pública de prueba', '#site-contacto-correo': 'contenido@example.test', '#site-contacto-whatsapp': '+503 7000 1234' })) await fill(selector, value);
  await save(); await screenshot('configuracion-desktop');
  const token = await tokenFor('SUPER_ADMIN');
  const document = await (await fetch(api + '/api/admin/site-settings', { headers: privateHeaders(token) })).json();
  const concurrent = structuredClone(document); concurrent.configuration.inicio.subtitulo = 'Cambio desde otra sesión';
  assert.equal((await fetch(api + '/api/admin/site-settings', { method: 'PUT', headers: privateHeaders(token), body: JSON.stringify(concurrent) })).status, 200);
  await fill('#site-inicio-subtitulo', 'Edición local conservada'); await click('Guardar cambios');
  await wait(`document.querySelector('.configuration-error')?.textContent.includes('otra sesión')`, 'conflicto de versiones');
  assert.equal(await evaluate(`document.querySelector('#site-inicio-subtitulo').value`), 'Edición local conservada');
  assert.equal(await evaluate(`document.querySelector('.form-actions button[type=submit]').disabled`), true);
  await click('Recargar configuración'); await wait(`document.querySelector('#site-inicio-subtitulo')?.value==='Cambio desde otra sesión'`, 'última versión');
  await fill('#site-inicio-subtitulo', 'Edición tras recuperar el conflicto');
  await evaluate(`(()=>{const previous=window.fetch;let fail=true;window.fetch=(input,options)=>{if(fail&&new URL(input,location.href).pathname==='/api/admin/site-settings'&&options?.method==='PUT'){fail=false;return Promise.resolve(Response.json({message:'Fallo recuperable de configuración.'},{status:503}));}return previous(input,options);};})()`);
  await click('Guardar cambios'); await wait(`document.querySelector('.configuration-error')?.textContent.includes('Fallo recuperable')`, 'escritura fallida');
  assert.equal((await (await fetch(api + '/api/site-settings')).json()).inicio.subtitulo, 'Cambio desde otra sesión');
  assert.equal(await evaluate(`document.querySelector('#site-inicio-subtitulo').value`), 'Edición tras recuperar el conflicto'); await save();
  for (const size of [390, 320]) { await send('Emulation.setDeviceMetricsOverride', { width: size, height: 844, deviceScaleFactor: 1, mobile: true }); await width(); await screenshot('configuracion-mobile-' + size); }
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await navigate(web + '/'); await wait(`Boolean(document.querySelector('.topbar'))`, 'sesión restaurada'); await openSettings();
  assert.equal(await evaluate(`document.querySelector('#site-inicio-titulo').value`), 'Impacto <script>seguro</script>');
  await logout(true); await wait(`document.querySelector('.hero h1')?.textContent.includes('Impacto <script>seguro</script>')`, 'Home actualizado');
  assert.equal(await evaluate(`Boolean(document.querySelector('.hero h1 script'))`), false);
  assert.equal(await evaluate(`Boolean(document.querySelector('a[href="https://wa.me/50370001234"]'))`), true);
  assert.equal(await evaluate(`Boolean(document.querySelector('a[href="mailto:contenido@example.test"]'))`), true);
  await screenshot('home-configurado'); await click('Nosotros'); await wait(`document.body.textContent.includes('Misión pública de prueba')&&document.body.textContent.includes('Visión pública de prueba')`, 'Misión y visión');
  await login('CANDIDATE'); await evaluate(`document.querySelector('.nav-avatar').click()`); await click('Ir al perfil');
  await wait(`Boolean(document.querySelector('.profile-sidebar-help'))`, 'ayuda del candidato'); await evaluate(`document.querySelector('.profile-sidebar-help').click()`);
  await wait(`Boolean(document.querySelector('.help-contact-card[href="mailto:contenido@example.test"]'))`, 'contacto de ayuda');
  assert.equal(await evaluate(`Boolean(document.querySelector('.help-contact-card[href="https://wa.me/50370001234"]'))`), true);
  const secondEditor = await (await fetch(api + '/api/admin/site-settings', { headers: privateHeaders(token) })).json();
  secondEditor.configuration.contacto.correo = 'otra-sesion@example.test';
  assert.equal((await fetch(api + '/api/admin/site-settings', { method: 'PUT', headers: privateHeaders(token), body: JSON.stringify(secondEditor) })).status, 200);
  await evaluate(`window.dispatchEvent(new Event('focus'))`);
  await wait(`Boolean(document.querySelector('.help-contact-card[href="mailto:otra-sesion@example.test"]'))`, 'refresco al recuperar foco');
  const periodic = await (await fetch(api + '/api/admin/site-settings', { headers: privateHeaders(token) })).json();
  periodic.configuration.contacto.correo = 'periodico@example.test';
  assert.equal((await fetch(api + '/api/admin/site-settings', { method: 'PUT', headers: privateHeaders(token), body: JSON.stringify(periodic) })).status, 200);
  await wait(`Boolean(document.querySelector('.help-contact-card[href="mailto:periodico@example.test"]'))`, 'refresco periódico de treinta segundos', 35000);
  await evaluate(`(()=>{const previous=window.fetch;let fail=true;window.fetch=(input,options)=>{if(fail&&new URL(input,location.href).pathname==='/api/site-settings'){fail=false;window.__publicSettingsFailed=true;return Promise.resolve(Response.json({message:'No disponible'},{status:503}));}return previous(input,options);};window.dispatchEvent(new Event('focus'));})()`);
  await wait(`window.__publicSettingsFailed===true`, 'fallo público');
  assert.equal(await evaluate(`Boolean(document.querySelector('.help-contact-card[href="mailto:periodico@example.test"]'))`), true);
  const empty = await (await fetch(api + '/api/admin/site-settings', { headers: privateHeaders(token) })).json();
  empty.configuration.contacto = { correo: '', telefono: '', direccion: '', whatsapp: '' };
  empty.configuration.institucional = { mision: '', vision: '' };
  empty.configuration.redes = { facebook: '', instagram: '', linkedin: '', youtube: '' };
  assert.equal((await fetch(api + '/api/admin/site-settings', { method: 'PUT', headers: privateHeaders(token), body: JSON.stringify(empty) })).status, 200);
  await evaluate(`window.dispatchEvent(new Event('focus'))`); await wait(`document.querySelectorAll('.help-contact-card').length===0`, 'contacto vacío oculto');
  assert.equal(await evaluate(`document.querySelectorAll('.site-social-links a').length`), 0);
  await click('Nosotros'); await wait(`Boolean(document.querySelector('.mission-vision-section'))`, 'Nosotros'); assert.equal(await evaluate(`document.querySelectorAll('.mv-card').length`), 0);
  await logout(false);
  await login('ADMINISTRATOR'); await openSettings();
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.settings-card input,.settings-card textarea')).every(item=>item.readOnly)`), true);
  assert.equal(await evaluate(`Boolean(document.querySelector('.form-actions'))`), false); await screenshot('configuracion-consulta');
  const adminToken = await tokenFor('ADMINISTRATOR');
  assert.equal((await fetch(api + '/api/admin/site-settings', { method: 'PUT', headers: privateHeaders(adminToken), body: JSON.stringify(concurrent) })).status, 403);
  await logout(true); await login('SUPER_ADMIN'); await openSettings();
  await click('Restaurar valores iniciales'); await click('Cancelar restauración'); assert.equal(await evaluate(`Boolean(document.querySelector('.configuration-confirm'))`), false);
  await click('Restaurar valores iniciales'); await evaluate(`Array.from(document.querySelectorAll('button')).find(item=>item.textContent==='Confirmar restauración').focus()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r' }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter' });
  await wait(`document.querySelector('.configuration-notice')?.textContent.includes('restaurada correctamente')`, 'restauración con teclado');
  assert.equal(await evaluate(`document.querySelector('#site-contacto-correo').value`), 'proyectos@fundaqa.org');
  await logout(true); await wait(`document.querySelector('.hero h1')?.textContent.includes('Trabaja donde')`, 'contenido inicial restaurado');
  assert.equal(await evaluate(`Boolean(document.querySelector('a[href^="https://wa.me/"]'))`), false);
  assert.deepEqual(errors, []);
  console.info('Navegador: dashboard, estadísticas, configuración, persistencia, permisos, conflictos, fallos, móvil y teclado correctos.');
  console.info('Capturas: ' + output);
} catch (error) {
  await screenshot('fallo');
  console.error(await evaluate(`({title:document.title,text:document.body.innerText.slice(-3500)})`));
  throw error;
} finally {
  socket.close(); await fetch(debugging + '/json/close/' + target.id);
}
