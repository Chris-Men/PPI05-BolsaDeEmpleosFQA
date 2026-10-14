import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/** Real HTTP/DB browser acceptance uses the backend's guarded, disposable saved-browser fixture. */
const web = 'http://localhost:5173';
const api = 'http://localhost:3100';
const debugging = 'http://127.0.0.1:9340';
const fixture = await (await fetch(api + '/__test/fixture')).json();
assert.equal((await fetch(api + '/__test/reset', { method: 'POST' })).status, 204);
const output = join(tmpdir(), 'fqa-saved-opportunities-browser');
await mkdir(output, { recursive: true });
const target = await (await fetch(debugging + '/json/new?' + encodeURIComponent(web), { method: 'PUT' })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
let sequence = 0;
const pending = new Map();
const errors = [];
let browserSocket;
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
const wait = async (expression, label = expression) => {
  const until = Date.now() + 20000;
  while (Date.now() < until) { if (await evaluate(expression)) return; await new Promise(resolve => setTimeout(resolve, 100)); }
  throw new Error('Tiempo agotado: ' + label);
};
const navigate = async url => {
  const loaded = new Promise(resolve => {
    const listener = event => { if (JSON.parse(event.data).method === 'Page.loadEventFired') { socket.removeEventListener('message', listener); resolve(); } };
    socket.addEventListener('message', listener);
  });
  await send('Page.navigate', { url }); await loaded;
};
const click = async label => evaluate(`(()=>{const button=Array.from(document.querySelectorAll('button')).find(item=>(item.textContent.trim()===${JSON.stringify(label)}||item.getAttribute('aria-label')===${JSON.stringify(label)})&&!item.disabled);if(!button)throw new Error('Botón no disponible: '+${JSON.stringify(label)});button.click();})()`);
const fill = async (selector, value) => evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});if(!input)throw new Error('Campo no disponible');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
const screenshot = async name => { const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(join(output, name + '.png'), Buffer.from(result.data, 'base64')); };
const login = async email => { await wait(`Boolean(document.querySelector('#login-email'))`, 'login'); await fill('#login-email', email); await fill('#login-password', 'Guardados de prueba 2026'); await evaluate(`document.querySelector('.login-form').requestSubmit()`); };
const openProfile = async () => { await wait(`Boolean(document.querySelector('.nav-avatar'))`, 'menú autenticado'); await evaluate(`document.querySelector('.nav-avatar').click()`); await click('Ir al perfil'); await wait(`Boolean(document.querySelector('.profile-stats'))`, 'perfil'); await click('Ver resumen de guardadas'); };
const total = async value => wait(`document.querySelector('[aria-label="Ver resumen de guardadas"] strong')?.textContent===${JSON.stringify(String(value))}`, 'contador ' + value);
const logout = async () => { await evaluate(`document.querySelector('.nav-avatar').click()`); await click('Cerrar sesión'); await wait(`!document.querySelector('.nav-avatar')`, 'cierre de sesión'); };
const assertWidth = async () => {
  const width = await evaluate(`({viewport:document.documentElement.clientWidth,content:document.documentElement.scrollWidth})`);
  assert.ok(width.content <= width.viewport + 1, JSON.stringify(width));
};
await send('Page.enable'); await send('Runtime.enable');
await send('Network.clearBrowserCookies');
await send('Page.addScriptToEvaluateOnNewDocument', { source: `const originalFetch=window.fetch.bind(window);window.fetch=(input,options)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(url.pathname.startsWith('/api'))return originalFetch(${JSON.stringify(api)}+url.pathname+url.search,options);return originalFetch(input,options);};` });
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await navigate(web + '/');
  await wait(`document.querySelectorAll('.jcard-save').length>0`, 'tarjetas de Home');
  const employment = fixture.spares.find(item => item.kind === 'EMPLOYMENT');
  await evaluate(`(()=>{const card=Array.from(document.querySelectorAll('.jcard')).find(item=>item.textContent.includes(${JSON.stringify(employment.title)}));if(!card)throw new Error('Tarjeta empleo no disponible');card.querySelector('.jcard-save').click();})()`);
  await wait(`Boolean(document.querySelector('#login-email'))`, 'guardar anónimo');
  assert.equal(await evaluate(`new URLSearchParams(location.search).get('guardar')`), employment.key);
  await navigate(web + '/?guardar=' + employment.key);
  await login(fixture.candidateEmail);
  await total(13);
  await wait(`document.querySelectorAll('.saved-opportunity-item').length===10`, 'página de diez guardadas');
  await wait(`!new URLSearchParams(location.search).has('guardar')`, 'intención consumida');
  await wait(`document.querySelector('.saved-pagination')?.textContent.includes('13 guardadas')`, 'total paginado');
  await wait(`document.querySelector('.saved-unavailable')?.closest('article').querySelector('button').disabled`, 'consulta cerrada deshabilitada');
  assert.equal(await evaluate(`Boolean(document.querySelector('.profile-documents-card'))`), true);
  await screenshot('guardadas-desktop'); await assertWidth();
  await evaluate(`document.querySelector('.saved-pagination button:last-child').click()`);
  await wait(`document.querySelectorAll('.saved-opportunity-item').length===3`, 'segunda página');
  await evaluate(`document.querySelector('.saved-pagination button:first-child').click()`);
  await wait(`document.querySelectorAll('.saved-opportunity-item').length===10`, 'primera página');
  await evaluate(`document.querySelector('.saved-opportunity-item button').click()`);
  await wait(`Boolean(document.querySelector('dialog[open]'))`, 'consulta desde guardadas');
  await click('Cerrar detalle de vacante');
  await navigate(web + '/');
  await wait(`document.querySelectorAll('.jcard').length>0`, 'Home después de recargar');
  await evaluate(`document.querySelector('.jcard').click()`);
  await wait(`Boolean(document.querySelector('.btn-save-h'))`, 'detalle empleo');
  assert.equal(await evaluate(`document.querySelector('.btn-save-h').getAttribute('aria-pressed')`), 'true');
  await openProfile(); await total(13);
  await wait(`Boolean(document.querySelector('.saved-unavailable'))`, 'vacante cerrada tras volver al perfil');
  await evaluate(`document.querySelector('.saved-unavailable').closest('article').querySelector('[aria-label="Quitar vacante de guardadas"]').click()`);
  await total(12);
  await wait(`!document.querySelector('.saved-unavailable')`, 'quitar cerrada');
  let expectedTotal = 12;
  for (const [kind, section] of [['VOLUNTEER', 'Voluntariado'], ['SOCIAL_HOURS', 'Estudiantes'], ['INTERNSHIP', 'Estudiantes']]) {
    await click(section);
    if (kind === 'INTERNSHIP') await evaluate(`Array.from(document.querySelectorAll('.panel-tab')).find(item=>item.textContent.includes('Prácticas')).click()`);
    const vacancy = fixture.spares.find(item => item.kind === kind);
    await wait(`Array.from(document.querySelectorAll('.volunteer-card')).some(item=>item.textContent.includes(${JSON.stringify(vacancy.title)}))`, 'tarjeta ' + kind);
    const selector = `Array.from(document.querySelectorAll('.volunteer-card')).find(item=>item.textContent.includes(${JSON.stringify(vacancy.title)})).querySelector('.save-opportunity-button')`;
    if (kind === 'VOLUNTEER') {
      await evaluate(`(()=>{const previous=window.fetch;let fail=true;window.fetch=(input,options)=>{if(fail&&new URL(input,location.href).pathname.includes('/saved-opportunities/')&&options?.method==='PUT'){fail=false;return Promise.resolve(Response.json({message:'Fallo recuperable de guardado.'},{status:503}));}return previous(input,options);};})()`);
      await evaluate(selector + '.click()');
      await wait(`document.querySelector('.saved-operation-error')?.textContent.includes('Fallo recuperable')`, 'error recuperable');
      assert.equal(await evaluate(selector + `.getAttribute('aria-pressed')`), 'false');
    }
    if (kind === 'SOCIAL_HOURS') {
      await evaluate(`(()=>{const previous=window.fetch;let hold=true;window.__savedPutCount=0;window.fetch=async(input,options)=>{if(hold&&new URL(input,location.href).pathname.includes('/saved-opportunities/')&&options?.method==='PUT'){hold=false;window.__savedPutCount++;const response=await previous(input,options);await new Promise(resolve=>{window.__releaseSavedResponse=resolve;});return response;}return previous(input,options);};})()`);
    }
    await evaluate(selector + '.focus()');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter' });
    if (kind === 'SOCIAL_HOURS') {
      await wait(`typeof window.__releaseSavedResponse==='function'`, 'respuesta de guardado pendiente');
      assert.equal(await evaluate(selector + '.disabled'), true);
      assert.equal(await evaluate(selector + `.getAttribute('aria-pressed')`), 'false');
      await evaluate(selector + '.click()');
      assert.equal(await evaluate(`window.__savedPutCount`), 1);
      await evaluate(`window.__releaseSavedResponse();delete window.__releaseSavedResponse;`);
    }
    await wait(selector + `.getAttribute('aria-pressed')==='true'`, 'guardado ' + kind);
    expectedTotal += 1;
    await screenshot('tarjeta-' + kind.toLowerCase());
    await openProfile(); await total(expectedTotal);
  }
  await navigate(web + '/'); await openProfile(); await total(15);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await wait(`document.querySelector('.profile-sidebar').getBoundingClientRect().right<=1`, 'menú móvil cerrado');
  await screenshot('guardadas-mobile'); await assertWidth();
  await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await screenshot('guardadas-mobile-320'); await assertWidth();
  await logout();
  assert.equal(await evaluate(`new URLSearchParams(location.search).has('guardar')`), false);
  await navigate(web + '/?guardar=' + employment.key); await wait(`Boolean(document.querySelector('#login-email'))`, 'login para cancelar'); await click('Cancelar guardado');
  assert.equal(await evaluate(`new URLSearchParams(location.search).has('guardar')`), false);
  await login(fixture.otherEmail);
  await wait(`Boolean(document.querySelector('.nav-avatar'))`, 'otra cuenta'); await openProfile(); await total(0);
  await wait(`document.body.textContent.includes('No tienes vacantes guardadas todavía.')`, 'aislamiento');
  await logout();
  await navigate(web + '/?guardar=' + fixture.spares.find(item => item.kind === 'VOLUNTEER').key);
  await wait(`Boolean(document.querySelector('#login-email'))`, 'login para registro');
  await click('Crear cuenta');
  await wait(`Boolean(document.querySelector('input[name="name"]'))`, 'registro');
  await fill('input[name="name"]', 'Registro Guardados');
  await fill('input[name="email"]', fixture.runId + '-registro-' + Date.now() + '@example.test');
  await fill('input[name="password"]', 'Saved.1234567890'); await fill('input[name="confirmPassword"]', 'Saved.1234567890');
  await evaluate(`document.querySelector('.login-form').requestSubmit()`);
  await total(1); await wait(`document.querySelectorAll('.saved-opportunity-item').length===1`, 'guardar después del registro');
  await logout();
  await navigate(web + '/?guardar=' + employment.key); await wait(`Boolean(document.querySelector('#login-email'))`, 'login recuperado'); await click('Cancelar guardado'); await login(fixture.candidateEmail);
  await wait(`Boolean(document.querySelector('.nav-avatar'))`, 'nuevo inicio de sesión'); await openProfile(); await total(15);
  // A fresh browser context has no shared cookies, storage or BroadcastChannel session.
  const browserInfo = await (await fetch(debugging + '/json/version')).json();
  browserSocket = new WebSocket(browserInfo.webSocketDebuggerUrl);
  await new Promise(resolve => browserSocket.addEventListener('open', resolve, { once: true }));
  let browserSequence = 0; const browserPending = new Map();
  browserSocket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id) { const task = browserPending.get(message.id); browserPending.delete(message.id); if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result); } });
  const browserSend = (method, params = {}) => new Promise((resolve, reject) => { const id = ++browserSequence; browserPending.set(id, { resolve, reject }); browserSocket.send(JSON.stringify({ id, method, params })); });
  const { browserContextId } = await browserSend('Target.createBrowserContext');
  const second = await browserSend('Target.createTarget', { url: 'about:blank', browserContextId });
  const secondInfo = (await (await fetch(debugging + '/json/list')).json()).find(item => item.id === second.targetId);
  const secondSocket = new WebSocket(secondInfo.webSocketDebuggerUrl);
  await new Promise(resolve => secondSocket.addEventListener('open', resolve, { once: true }));
  let secondSequence = 0; const secondPending = new Map();
  secondSocket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id) { const task = secondPending.get(message.id); secondPending.delete(message.id); if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result); } });
  const secondSend = (method, params = {}) => new Promise((resolve, reject) => { const id = ++secondSequence; secondPending.set(id, { resolve, reject }); secondSocket.send(JSON.stringify({ id, method, params })); });
  const secondEvaluate = async expression => { const result = await secondSend('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
  const secondWait = async expression => { const until = Date.now() + 20000; while (Date.now() < until) { if (await secondEvaluate(expression)) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error('Segundo dispositivo: tiempo agotado'); };
  try {
    await secondSend('Page.enable');
    await secondSend('Page.addScriptToEvaluateOnNewDocument', { source: `const originalFetch=window.fetch.bind(window);window.fetch=(input,options)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);return url.pathname.startsWith('/api')?originalFetch(${JSON.stringify(api)}+url.pathname+url.search,options):originalFetch(input,options);};` });
    await secondSend('Page.navigate', { url: web + '/?guardar=' + employment.key });
    await secondWait(`Boolean(document.querySelector('#login-email'))`);
    await secondEvaluate(`(()=>{for(const [selector,value] of [['#login-email',${JSON.stringify(fixture.candidateEmail)}],['#login-password','Guardados de prueba 2026']]){const input=document.querySelector(selector);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));}document.querySelector('.login-form').requestSubmit();})()`);
    await secondWait(`document.querySelector('[aria-label="Ver resumen de guardadas"] strong')?.textContent==='15'&&document.querySelector('[aria-label="Quitar vacante de guardadas"]')&&!document.querySelector('[aria-label="Quitar vacante de guardadas"]').disabled`);
    await secondEvaluate(`document.querySelector('[aria-label="Quitar vacante de guardadas"]').click()`);
    await secondWait(`document.querySelector('[aria-label="Ver resumen de guardadas"] strong')?.textContent==='14'`);
    await send('Page.bringToFront'); await evaluate(`window.dispatchEvent(new Event('focus'))`); await total(14);
  } finally { secondSocket.close(); await browserSend('Target.disposeBrowserContext', { browserContextId }); }
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(JSON.stringify({ kinds: fixture.spares.map(item => item.kind), reload: true, pagination: true, closedRetained: true, loginIntent: true, registrationIntent: true, keyboard: true, networkRetry: true, accountIsolation: true, secondDevice: true, focusRefresh: true, desktop: true, mobile: [390, 320], screenshots: output }));
} catch (error) { await screenshot('fallo'); throw error; }
finally { socket.close(); browserSocket?.close(); await fetch(debugging + '/json/close/' + target.id); }
