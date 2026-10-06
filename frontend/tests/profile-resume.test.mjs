import './helpers/typescript.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const { configureAuthentication, ApiError } = await import('../src/services/api.ts');
const { getProfile, updateProfile, getResume, uploadResume, deleteResume, downloadResume } = await import('../src/services/profileService.ts');
const { profileToPersonalForm } = await import('../src/utils/profileForm.ts');

test('perfil envía campos editables y precarga el formulario sin compartir sus objetos', async (context) => {
  const profile = { firstName: 'Ana', lastName: 'Rivera', email: 'ana@example.test', phone: null,
    department: 'San Salvador', municipality: null, profession: 'Docente', educationLevel: null,
    professionalSummary: null, workExperiences: [], educations: [], skills: [] };
  const personal = profileToPersonalForm(profile);
  assert.equal(personal.name, 'Ana'); assert.equal(personal.lastname, 'Rivera'); assert.equal(personal.phone, '');
  personal.name = 'Edición en formulario'; assert.equal(profile.firstName, 'Ana');
  const calls = [];
  configureAuthentication({ getToken: () => 'fixture', refresh: async () => {}, invalidate: () => {} });
  context.mock.method(globalThis, 'fetch', async (url, options) => { calls.push({ url, options }); return Response.json(profile); });
  await getProfile(); await updateProfile({ phone: null, educations: [] });
  assert.equal(calls[0].url, '/api/profile/me');
  assert.equal(calls[1].options.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[1].options.body), { phone: null, educations: [] });
});

test('CV usa multipart sin Content-Type artificial y descarga bytes mediante autenticación', async (context) => {
  const pdf = '%PDF-1.4\n%%EOF'; const calls = [];
  configureAuthentication({ getToken: () => 'fixture', refresh: async () => {}, invalidate: () => {} });
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options }); assert.equal(options.headers.get('Authorization'), 'Bearer fixture');
    if (url.endsWith('/download')) return new Response(pdf, { headers: { 'Content-Type': 'application/pdf' } });
    return options.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json(null);
  });
  await getResume();
  await uploadResume(new File([pdf], 'curriculum.pdf', { type: 'application/pdf' }));
  assert.equal(calls[1].options.method, 'PUT'); assert.equal(calls[1].options.headers.has('Content-Type'), false);
  assert.ok(calls[1].options.body instanceof FormData); assert.equal(calls[1].options.body.get('file').name, 'curriculum.pdf');
  assert.equal(await (await downloadResume()).text(), pdf);
  await deleteResume(); assert.equal(calls[3].options.method, 'DELETE');
});

test('CV renueva sesión una vez y mantiene errores de disponibilidad y validación', async (context) => {
  let token = 'old'; let attempts = 0; let refreshed = 0;
  configureAuthentication({ getToken: () => token, refresh: async () => { refreshed++; token = 'new'; }, invalidate: () => {} });
  context.mock.method(globalThis, 'fetch', async (_url, options) => {
    attempts++; if (attempts === 1) return Response.json({ message: 'Sesión vencida.' }, { status: 401 });
    assert.equal(options.headers.get('Authorization'), 'Bearer new'); return new Response('pdf');
  });
  assert.equal(await (await downloadResume()).text(), 'pdf'); assert.equal(refreshed, 1);
  context.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'Almacenamiento no disponible.' }, { status: 503 }));
  await assert.rejects(getResume(), (failure) => failure instanceof ApiError && failure.status === 503);
});
