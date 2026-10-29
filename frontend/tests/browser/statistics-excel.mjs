import assert from 'node:assert/strict';
import { readdir, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { browserHarness } from './helpers/cdp.mjs';

const api = 'http://localhost:3100'; const web = 'http://localhost:5173';
const fixture = await (await fetch(api + '/__test/fixture')).json();
const output = join(tmpdir(), 'fqa-statistics-excel-browser'); const downloads = join(output, 'files-' + Date.now()); await mkdir(downloads, { recursive: true });
const browser = await browserHarness(output); const { send, evaluate, wait, navigate, click, fill, screenshot, width } = browser;
/** CDP can replace a repeated filename, so manual retries use a separate download directory. */
const downloadedFiles = async () => {
  const files = [];
  for (const item of await readdir(downloads, { withFileTypes: true })) {
    if (item.isDirectory()) for (const name of await readdir(join(downloads, item.name))) { if (name.endsWith('.xlsx')) files.push(join(item.name, name)); }
    else if (item.name.endsWith('.xlsx')) files.push(item.name);
  }
  return files;
};
/** Only the guarded disposable API exposes these controls; no development DB is used. */
const worker = async enabled => { assert.equal((await fetch(api + '/__test/export-worker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) })).status, 204); };
const login = async role => { await click('Ingresar'); await wait(`Boolean(document.querySelector('#login-email'))`); await fill('#login-email', fixture.accounts[role]); await fill('#login-password', 'Estadisticas de navegador 2026'); await evaluate(`document.querySelector('.login-form').requestSubmit()`); await wait(`Boolean(document.querySelector('.topbar'))`, 'sesión'); };
const logout = async () => { await evaluate(`document.querySelector('.topbar .profile').click()`); await click('Cerrar sesión'); await wait(`Boolean(document.querySelector('.nav .btn-ghost'))`); };
const statistics = async () => { await click('Estadísticas'); await wait(`Boolean(document.querySelector('.statistics-excel-button'))&&!document.querySelector('.estadisticas-screen').getAttribute('aria-busy').includes('true')`, 'Estadísticas'); };
const downloaded = async count => {
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    const files = await downloadedFiles();
    if (files.length === count) { for (const name of files) { const bytes = await readFile(join(downloads, name)); assert.deepEqual(Array.from(bytes.subarray(0, 4)), [80, 75, 3, 4]); assert.ok(bytes.length > 5000); } return files; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('No se completó la descarga XLSX esperada.');
};
const token = async role => { const response = await fetch(api + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-FQA-Request': '1', Origin: web }, body: JSON.stringify({ email: fixture.accounts[role], password: 'Estadisticas de navegador 2026' }) }); assert.equal(response.status, 200); return (await response.json()).accessToken; };
await send('Network.clearBrowserCookies'); await send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
await send('Page.addScriptToEvaluateOnNewDocument', { source: `const originalFetch=window.fetch.bind(window);window.fetch=(input,options)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(url.pathname.startsWith('/api'))return originalFetch(${JSON.stringify(api)}+url.pathname+url.search,options);return originalFetch(input,options);};` });
try {
  await worker(false); await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await navigate(web + '/'); await wait(`Boolean(document.querySelector('.nav .btn-ghost'))`); await login('SUPER_ADMIN'); await statistics();
  await fill('.statistics-calendar label:nth-of-type(2) input', '2030-01-01'); await fill('.statistics-calendar label:nth-of-type(3) input', '2030-01-31');
  assert.equal(await evaluate(`document.querySelector('.statistics-excel-button').disabled`), true); await click('Aplicar'); await wait(`document.querySelector('.stat-card strong').textContent==='112'`);
  await click('Exportar Excel'); await wait(`Boolean(document.querySelector('.configuration-dialog[open]'))`);
  assert.ok(await evaluate(`document.querySelector('.configuration-dialog').textContent.includes('01/01/2030 — 31/01/2030')`));
  await screenshot('confirmacion-desktop'); await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 }); await wait(`!document.querySelector('.configuration-dialog')`);
  assert.equal(await evaluate(`document.querySelectorAll('.statistics-export-jobs li').length`), 0);
  await click('Exportar Excel'); await evaluate(`document.querySelector('.configuration-dialog button[data-role=confirm]').focus()`); await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', windowsVirtualKeyCode: 13 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await wait(`!document.querySelector('.configuration-dialog')&&document.querySelector('.statistics-export-jobs')?.textContent.includes('En cola')`, 'encolado');
  assert.equal(await evaluate(`document.querySelectorAll('.statistics-export-jobs li').length`), 1);
  const superToken = await token('SUPER_ADMIN'); const headers = { Authorization: 'Bearer ' + superToken, 'X-FQA-Request': '1' };
  const queued = (await (await fetch(api + '/api/admin/statistics/exports', { headers })).json()).items[0];
  await click('Dashboard'); await navigate(web + '/'); await wait(`Boolean(document.querySelector('.topbar'))`); await statistics(); await wait(`document.querySelector('.statistics-export-jobs')?.textContent.includes('En cola')`, 'cola tras recarga');
  for (const size of [390, 320]) { await send('Emulation.setDeviceMetricsOverride', { width: size, height: 844, deviceScaleFactor: 1, mobile: true }); await width(); await evaluate(`document.querySelector('.statistics-export-panel').scrollIntoView({block:'start'})`); await screenshot('cola-mobile-' + size); }
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false }); await click('Dashboard'); await worker(true);
  const files = await downloaded(1); assert.ok(files[0].includes('2030-01-01_2030-01-31')); await wait(`document.querySelector('.statistics-export-monitor')?.textContent.includes('Descarga del Excel iniciada')`); await screenshot('descarga-otra-seccion');
  await navigate(web + '/'); await wait(`Boolean(document.querySelector('.topbar'))`); await new Promise(resolve => setTimeout(resolve, 3600)); assert.equal((await downloadedFiles()).length, 1);
  await statistics(); await wait(`document.querySelector('.statistics-export-jobs')?.textContent.includes('Listo')`);
  await evaluate(`(()=>{const previous=window.fetch;let fail=true;window.fetch=(input,options)=>{if(fail&&String(input).includes('/exports/')&&String(input).endsWith('/file')){fail=false;return Promise.resolve(Response.json({message:'Fallo recuperable de Excel.'},{status:503}));}return previous(input,options);};})()`);
  await click('Descargar'); await wait(`document.querySelector('.statistics-export-panel')?.textContent.includes('Fallo recuperable')`, 'fallo de descarga');
  const retryDirectory = join(downloads, 'manual'); await mkdir(retryDirectory); await send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: retryDirectory });
  await click('Descargar'); await downloaded(2);
  await worker(false); assert.equal((await fetch(api + '/__test/expire-export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: queued.id }) })).status, 204);
  await wait(`document.querySelector('.statistics-export-jobs')?.textContent.includes('Vencido')`); await click('Generar de nuevo'); assert.ok(await evaluate(`document.querySelector('.configuration-dialog').textContent.includes('01/01/2030 — 31/01/2030')`));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await width(); await screenshot('confirmacion-mobile');
  await click('Confirmar exportación'); await wait(`!document.querySelector('.configuration-dialog')&&document.querySelector('.statistics-export-jobs')?.textContent.includes('En cola')`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false }); await logout(); await login('ADMINISTRATOR'); await statistics(); assert.equal(await evaluate(`document.querySelectorAll('.statistics-export-jobs li').length`), 0); await worker(true);
  const until = Date.now() + 20000; let ready = false;
  while (Date.now() < until) { const jobs = (await (await fetch(api + '/api/admin/statistics/exports', { headers })).json()).items; if (jobs[0].status === 'READY') { ready = true; break; } await new Promise(resolve => setTimeout(resolve, 200)); }
  assert.ok(ready); assert.equal((await downloadedFiles()).length, 2);
  await logout(); await login('SUPER_ADMIN'); await downloaded(3); assert.deepEqual(browser.errors, []);
  console.info('Excel: confirmación, teclado, cola persistente, recarga, navegación, descargas, reintento, vencimiento, aislamiento y móvil correctos.'); console.info('Capturas y archivos: ' + output);
} catch (error) { await screenshot('fallo'); throw error; }
finally { await browser.close(); }
