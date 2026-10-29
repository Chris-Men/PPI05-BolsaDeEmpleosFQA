import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { browserHarness } from './helpers/cdp.mjs';

/** Real acceptance uses only a disposable statistics-browser API with its exclusive _test database. */
const api = 'http://localhost:3100', web = 'http://localhost:5173';
const fixture = await (await fetch(api + '/__test/fixture')).json();
const login = await (await fetch(api + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-FQA-Request': '1', Origin: web }, body: JSON.stringify({ email: fixture.accounts.ADMINISTRATOR, password: 'Estadisticas de navegador 2026' }) })).json();
const headers = { Authorization: 'Bearer ' + login.accessToken };
const catalogs = await (await fetch(api + '/api/admin/opportunities/catalogs', { headers })).json();
const browser = await browserHarness(join(tmpdir(), 'fqa-vacancy-contact-browser'));
const { send, evaluate, wait, navigate, click, fill, screenshot, width } = browser;
const invalid = selector => wait(`document.querySelector(${JSON.stringify(selector)})?.getAttribute('aria-invalid')==='true'`, 'error por campo: ' + selector);
const valid = selector => wait(`document.querySelector(${JSON.stringify(selector)})?.getAttribute('aria-invalid')!=='true'`, 'corrección por campo: ' + selector);
const mail = 'input[name=contactEmail]', phone = 'input[name=contactPhone]';
const save = async () => { await click('Guardar borrador'); await wait(`!document.querySelector('.vacancy-editor')`, 'borrador guardado'); };
const record = async title => { const response = await fetch(api + '/api/admin/opportunities?search=' + encodeURIComponent(title), { headers }); assert.equal(response.status, 200); const page = await response.json(); assert.equal(page.items.length, 1); return page.items[0]; };
await send('Network.clearBrowserCookies');
await send('Page.addScriptToEvaluateOnNewDocument', { source: `const originalFetch=window.fetch.bind(window);window.__contactMutations=[];window.fetch=(input,options)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(url.pathname.startsWith('/api/admin/opportunities')&&['POST','PATCH'].includes(options?.method))window.__contactMutations.push(options.method+' '+url.pathname);return url.pathname.startsWith('/api')?originalFetch(${JSON.stringify(api)}+url.pathname+url.search,options):originalFetch(input,options);};` });
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate(web); await wait(`Boolean(document.querySelector('.nav .btn-ghost'))`); await click('Ingresar'); await wait(`Boolean(document.querySelector('#login-email'))`);
  await fill('#login-email', fixture.accounts.ADMINISTRATOR); await fill('#login-password', 'Estadisticas de navegador 2026'); await evaluate(`document.querySelector('.login-form').requestSubmit()`); await wait(`Boolean(document.querySelector('.topbar'))`);
  let lastTitle;
  for (const [index, kind] of ['EMPLOYMENT', 'VOLUNTEER', 'SOCIAL_HOURS', 'INTERNSHIP'].entries()) {
    await click('Nueva Vacante'); await wait(`Boolean(document.querySelector('.vacancy-editor'))`);
    lastTitle = 'Contactos ' + Date.now() + ' ' + kind;
    await fill('select[aria-label="Tipo de vacante"]', kind); await fill('input[name=title]', lastTitle); await fill('select[name=organizationId]', String(catalogs.organizations[0].id));
    const before = await evaluate(`window.__contactMutations.length`);
    await click('Guardar borrador'); await invalid(mail); await invalid(phone);
    await wait(`document.activeElement.name==='contactEmail'`, 'foco del primer contacto inválido');
    assert.equal(await evaluate(`document.activeElement.name`), 'contactEmail'); assert.equal(await evaluate(`window.__contactMutations.length`), before);
    if (index === 1) {
      await fill(phone, '123'); await invalid(phone); await click('Guardar borrador'); assert.equal(await evaluate(`window.__contactMutations.length`), before);
      await fill(phone, '50371234567'); await valid(phone); await valid(mail);
    } else {
      await fill(mail, 'incorrecto'); await invalid(mail); await fill(mail, 'CORREO@EXAMPLE.TEST'); await valid(mail); await valid(phone);
      if (index === 2) { await fill(phone, '123'); await invalid(phone); await click('Guardar borrador'); assert.equal(await evaluate(`window.__contactMutations.length`), before); await fill(phone, '+503 7123-4567'); await valid(phone); }
    }
    await save(); const saved = await record(lastTitle);
    assert.equal(saved.contactEmail, index === 1 ? null : 'correo@example.test'); assert.equal(saved.contactPhone, index === 1 || index === 2 ? '71234567' : null);
  }
  await fill('input[aria-label="Buscar vacantes"]', lastTitle); await wait(`document.querySelectorAll('.vacancy-table tbody tr').length===1`); await click('Editar'); await wait(`Boolean(document.querySelector('.vacancy-editor'))`);
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(mail)}).value`), 'correo@example.test');
  await fill(mail, ''); await invalid(mail); await invalid(phone);
  const before = await evaluate(`window.__contactMutations.length`); await click('Guardar borrador'); assert.equal(await evaluate(`window.__contactMutations.length`), before);
  await fill(phone, '+503 7987-6543'); await valid(mail); await valid(phone);
  for (const size of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width: size, height: 844, deviceScaleFactor: 1, mobile: true }); await evaluate(`document.querySelector('.vacancy-contact-group').scrollIntoView({block:'center'})`); await width();
    assert.equal(await evaluate(`(()=>{const input=document.querySelector('input[name=contactPhone]'),style=getComputedStyle(input),context=document.createElement('canvas').getContext('2d');context.font=style.font;return context.measureText(input.value).width<=input.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);})()`), true, 'teléfono completo visible a ' + size);
    await screenshot('contactos-' + size);
  }
  await evaluate(`document.querySelector(${JSON.stringify(mail)}).focus()`); await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }); assert.equal(await evaluate(`document.activeElement.name`), 'contactPhone');
  await save(); let saved = await record(lastTitle); assert.equal(saved.contactEmail, null); assert.equal(saved.contactPhone, '79876543');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await wait(`Boolean(document.querySelector('[data-action=view]'))`); await click('Ver'); await wait(`Boolean(document.querySelector('a[href="tel:+50379876543"]'))`); await screenshot('detalle-contacto'); await click('Cerrar detalle de vacante');
  await click('Editar'); await wait(`Boolean(document.querySelector('.vacancy-editor'))`); assert.equal(await evaluate(`document.querySelector(${JSON.stringify(phone)}).value`), '+503 7987-6543');
  await fill(mail, 'nuevo@example.test'); await fill(phone, ''); await valid(mail); await valid(phone); await save(); saved = await record(lastTitle); assert.equal(saved.contactEmail, 'nuevo@example.test'); assert.equal(saved.contactPhone, null);
  assert.deepEqual(browser.errors, []); console.log('Contactos verificados: cuatro tipos, uno o ambos canales, validación inmediata, limpieza, recarga, detalle, móvil y teclado.');
} catch (failure) { await screenshot('fallo'); throw failure; }
finally { await browser.close(); }
