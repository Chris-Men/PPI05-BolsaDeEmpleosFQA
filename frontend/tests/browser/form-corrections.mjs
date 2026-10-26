import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { browserHarness } from './helpers/cdp.mjs';

/** Acceptance uses only the guarded statistics-browser API and its disposable _test database. */
const api = 'http://localhost:3100', web = 'http://localhost:5173';
const fixture = await (await fetch(api + '/__test/fixture')).json();
const browser = await browserHarness(join(tmpdir(), 'fqa-form-corrections-browser'));
const { send, evaluate, wait, navigate, click, fill, screenshot, width } = browser;
const edit = async (selector, value) => { await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`); await fill(selector, value); };
const invalid = async selector => { await wait(`document.querySelector(${JSON.stringify(selector)})?.getAttribute('aria-invalid')==='true'`, 'error inmediato: ' + selector); };
const valid = async selector => { await wait(`document.querySelector(${JSON.stringify(selector)})?.getAttribute('aria-invalid')!=='true'`, 'corrección inmediata: ' + selector); };
const login = async role => { await click('Ingresar'); await wait(`Boolean(document.querySelector('#login-email'))`); await fill('#login-email', fixture.accounts[role]); await fill('#login-password', 'Estadisticas de navegador 2026'); await evaluate(`document.querySelector('.login-form').requestSubmit()`); await wait(role === 'CANDIDATE' ? `Boolean(document.querySelector('.nav-avatar'))` : `Boolean(document.querySelector('.topbar'))`, 'sesión'); };
const logout = async admin => { await evaluate(admin ? `document.querySelector('.topbar .profile').click()` : `document.querySelector('.nav-avatar').click()`); await click('Cerrar sesión'); await wait(`Boolean(document.querySelector('.nav .btn-ghost'))`); };
const escape = async () => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); };
const credentials = await (await fetch(api + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-FQA-Request': '1', Origin: web }, body: JSON.stringify({ email: fixture.accounts.SUPER_ADMIN, password: 'Estadisticas de navegador 2026' }) })).json();
const headers = { Authorization: 'Bearer ' + credentials.accessToken, 'Content-Type': 'application/json', 'X-FQA-Request': '1', Origin: web };
const request = async (path, method = 'GET', body) => { const response = await fetch(api + '/api' + path, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) }); assert.ok(response.ok, path + ': ' + response.status); return response.json(); };
const catalogs = await request('/admin/opportunities/catalogs');
const originalSettings = await request('/admin/site-settings');
await request('/admin/site-settings/reset', 'POST', { version: originalSettings.version });
const candidateLogin = await (await fetch(api + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-FQA-Request': '1', Origin: web }, body: JSON.stringify({ email: fixture.accounts.CANDIDATE, password: 'Estadisticas de navegador 2026' }) })).json();
assert.equal((await fetch(api + '/api/profile/me', { method: 'PATCH', headers: { ...headers, Authorization: 'Bearer ' + candidateLogin.accessToken }, body: JSON.stringify({ firstName: 'Prueba', phone: null, municipality: null }) })).status, 200);
const published = await request('/admin/opportunities', 'POST', { kind: 'EMPLOYMENT', title: 'Aceptación de formularios ' + Date.now(), organizationId: catalogs.organizations[0].id, categoryId: catalogs.categories[0].id, description: 'Descripción completa para probar los formularios y sus validaciones.', department: 'San Salvador', municipality: 'San Salvador Centro', slots: 3, contactEmail: 'contacto@example.test', employmentTypeId: catalogs.employmentTypes[0].id, expiresAt: '2099-12-31' });
await request('/admin/opportunities/' + published.key + '/status', 'PATCH', { status: 'OPEN' });
await send('Network.clearBrowserCookies');
await send('Page.addScriptToEvaluateOnNewDocument', { source: `const originalFetch=window.fetch.bind(window);window.fetch=(input,options)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);return url.pathname.startsWith('/api')?originalFetch(${JSON.stringify(api)}+url.pathname+url.search,options):originalFetch(input,options);};` });
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate(web); await wait(`Boolean(document.querySelector('.nav .btn-ghost'))`); await click('Ingresar'); await wait(`Boolean(document.querySelector('#login-email'))`);
  await edit('#login-email', 'incorrecto'); await invalid('#login-email'); await edit('#login-email', 'persona@example.test'); await valid('#login-email');
  await click('Crear cuenta'); await wait(`Boolean(document.querySelector('input[name=name]'))`);
  await edit('input[name=name]', 'A'); await invalid('input[name=name]'); await edit('input[name=name]', 'Ana María'); await valid('input[name=name]');
  await edit('input[name=password]', 'corta'); await invalid('input[name=password]');
  await edit('input[name=password]', 'Una contraseña larga 2026'); await valid('input[name=password]');
  await edit('input[name=confirmPassword]', 'diferente'); await invalid('input[name=confirmPassword]');
  await edit('input[name=confirmPassword]', 'Una contraseña larga 2026'); await valid('input[name=confirmPassword]');
  await screenshot('registro-validacion'); await navigate(web); await wait(`Boolean(document.querySelector('.nav .btn-ghost'))`); await login('SUPER_ADMIN');

  await click('Configuración'); await wait(`Boolean(document.querySelector('#site-contacto-correoSoporte'))`);
  await edit('#site-contacto-correoSoporte', 'incorrecto'); await invalid('#site-contacto-correoSoporte');
  await edit('#site-contacto-correoSoporte', 'soporte@example.test'); await valid('#site-contacto-correoSoporte');
  await edit('#site-contacto-correo', 'contacto@example.test');
  await edit('#site-contacto-telefono', '50371234567'); assert.equal(await evaluate(`document.querySelector('#site-contacto-telefono').value`), '+503 7123-4567');
  await edit('#site-contacto-whatsapp', '+503 7000-1234');
  await edit('#site-redes-facebook', 'http://example.test'); await invalid('#site-redes-facebook'); await edit('#site-redes-facebook', 'https://example.test'); await valid('#site-redes-facebook');
  await click('Guardar cambios'); await wait(`Boolean(document.querySelector('.configuration-success-dialog[open]'))`); await wait(`!document.querySelector('.configuration-success-dialog[open]')`);
  const settings = await request('/admin/site-settings'); assert.equal(settings.configuration.contacto.correoSoporte, 'soporte@example.test'); assert.equal(settings.configuration.contacto.telefono, '+503 7123-4567');
  await click('Ayuda'); await wait(`Boolean(document.querySelector('a[href="mailto:soporte@example.test"]'))`);
  await click('Usuarios'); await click('+ Nuevo usuario'); await wait(`Boolean(document.querySelector('#managed-name'))`);
  await edit('#managed-name', 'A'); await invalid('#managed-name'); await edit('#managed-name', 'Usuario de prueba'); await valid('#managed-name');
  await edit('#managed-email', 'incorrecto'); await invalid('#managed-email'); await edit('#managed-email', 'nuevo@example.test'); await valid('#managed-email'); await escape();
  await click('Organizaciones'); await click('+ Nueva organización'); await wait(`Boolean(document.querySelector('#organization-name'))`);
  await edit('#organization-name', 'A'); await invalid('#organization-name'); await edit('#organization-name', 'Organización'); await valid('#organization-name');
  await edit('#organization-email', 'incorrecto'); await invalid('#organization-email'); await edit('#organization-email', ''); await valid('#organization-email'); await escape();
  await click('Categorías'); await click('+ Nueva categoría'); await wait(`Boolean(document.querySelector('input[name=name]'))`);
  await edit('input[name=name]', '!!'); await invalid('input[name=name]'); await edit('input[name=name]', 'Categoría'); await valid('input[name=name]'); await escape();

  await click('Nueva Vacante'); await wait(`Boolean(document.querySelector('.vacancy-editor'))`);
  await edit('input[name=title]', 'Prueba de máscara y validación');
  await edit('input[name=salaryMin]', '0'); await invalid('input[name=salaryMin]');
  await edit('input[name=salaryMin]', '100'); await valid('input[name=salaryMin]');
  for (const value of ['-1', 'texto', '1e3', '1.001']) { await edit('input[name=salaryMin]', value); assert.equal(await evaluate(`document.querySelector('input[name=salaryMin]').value`), '100'); await invalid('input[name=salaryMin]'); }
  await edit('input[name=salaryMin]', '100'); await edit('input[name=salaryMax]', '99'); await invalid('input[name=salaryMax]');
  await edit('input[name=salaryMin]', '90'); await valid('input[name=salaryMax]');
  await edit('input[name=slots]', '0'); await invalid('input[name=slots]'); await edit('input[name=slots]', '1'); await valid('input[name=slots]');
  await edit('input[name=expiresAt]', '2020-01-01'); await invalid('input[name=expiresAt]'); await edit('input[name=expiresAt]', '2099-12-31'); await valid('input[name=expiresAt]');
  await screenshot('vacante-validacion-desktop');
  for (const size of [390, 320]) { await send('Emulation.setDeviceMetricsOverride', { width: size, height: 844, deviceScaleFactor: 1, mobile: true }); await width(); await screenshot('vacante-' + size); }
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await click('Cancelar'); await request('/admin/opportunities/' + published.key, 'DELETE'); await click('Administrar Vacantes');
  await fill('input[aria-label="Buscar vacantes"]', published.title); await fill('select[aria-label="Estado de vacante"]', 'ARCHIVED'); await wait(`Boolean(document.querySelector('[data-action=unarchive]'))`);
  await click('Desarchivar'); await wait(`document.querySelector('.vacancy-confirm-dialog')?.textContent.includes('Cerrada')`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await click('Confirmar'); await wait(`!document.querySelector('.vacancy-confirm-dialog')`);
  const restored = await request('/admin/opportunities/' + published.key); assert.equal(restored.status, 'CLOSED'); assert.equal(restored.archivedAt, null);
  await fill('select[aria-label="Estado de vacante"]', 'CLOSED'); await wait(`Boolean(document.querySelector('[data-action=edit]'))`); await click('Editar'); await wait(`Boolean(document.querySelector('.vacancy-editor'))`);
  await edit('input[name=salaryMin]', '0'); await invalid('input[name=salaryMin]'); await edit('input[name=salaryMin]', '100'); await valid('input[name=salaryMin]'); await click('Cancelar');
  await request('/admin/opportunities/' + published.key + '/status', 'PATCH', { status: 'OPEN' });
  await logout(true); await login('CANDIDATE'); await evaluate(`document.querySelector('.nav-avatar').click()`); await click('Ir al perfil');
  await wait(`Boolean(document.querySelector('.profile-sidebar'))`); await evaluate(`Array.from(document.querySelectorAll('.profile-sidebar button')).find(item=>item.textContent.includes('Datos Personales')).click()`); await wait(`Boolean(document.querySelector('.candidate-editor-heading button'))`); await click('Editar perfil');
  await edit('input[name=firstName]', 'Ana1'); await invalid('input[name=firstName]'); await edit('input[name=firstName]', 'Ana María'); await valid('input[name=firstName]');
  await edit('input[name=phone]', '123'); await invalid('input[name=phone]'); await edit('input[name=phone]', '50371234567'); await valid('input[name=phone]');
  assert.equal(await evaluate(`document.querySelector('input[name=phone]').value`), '+503 7123-4567');
  await evaluate(`document.querySelector('input[name=phone]').setSelectionRange(6,7)`); await send('Input.insertText', { text: '9' });
  assert.equal(await evaluate(`document.querySelector('input[name=phone]').value`), '+503 7923-4567');
  assert.equal(await evaluate(`document.querySelector('input[name=phone]').selectionStart`), 7);
  await evaluate(`document.querySelector('input[name=phone]').select()`); await send('Input.insertText', { text: '50371234567' }); await valid('input[name=phone]');
  assert.equal(await evaluate(`document.querySelector('input[name=phone]').value`), '+503 7123-4567');
  await edit('input[name=birthDate]', '2020-01-01'); await invalid('input[name=birthDate]'); await edit('input[name=birthDate]', '2000-02-29'); await valid('input[name=birthDate]');
  await fill('select[name=municipality]', 'San Salvador Centro'); await click('Guardar perfil'); await wait(`document.querySelector('.candidate-editor [role=status]')?.textContent.includes('Perfil actualizado')`);
  await navigate(web + '/?postular=' + published.key); await wait(`Boolean(document.querySelector('input[name="personal.firstName"]'))`);
  await edit('input[name="personal.firstName"]', 'Ana9'); await invalid('input[name="personal.firstName"]');
  await new Promise(resolve => setTimeout(resolve, 1400)); await navigate(web + '/?postular=' + published.key); await wait(`document.querySelector('input[name="personal.firstName"]')?.value==='Ana9'`, 'borrador incompleto conservado');
  await edit('input[name="personal.firstName"]', 'Ana María'); await valid('input[name="personal.firstName"]');
  await fill('select[name="personal.department"]', 'Santa Ana'); assert.equal(await evaluate(`document.querySelector('select[name="personal.municipality"]').value`), ''); await invalid('select[name="personal.municipality"]');
  await fill('select[name="personal.municipality"]', 'Santa Ana Centro'); await valid('select[name="personal.municipality"]');
  for (const size of [390, 320]) { await send('Emulation.setDeviceMetricsOverride', { width: size, height: 844, deviceScaleFactor: 1, mobile: true }); await width(); await screenshot('postulacion-' + size); }
  await evaluate(`document.querySelector('input[name="personal.phone"]').focus()`); await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  assert.equal(await evaluate(`document.activeElement.name`), 'personal.birthDate');
  assert.deepEqual(browser.errors, []); console.log('Formularios verificados: errores inmediatos, máscaras, persistencia, desarchivado, teclado y anchos 1440/390/320.');
} catch (failure) { await screenshot('fallo'); throw failure; }
finally { await browser.close(); }
