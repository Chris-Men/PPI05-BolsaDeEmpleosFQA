import '../helpers/unit-environment.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { updateProfileSchema } from '../../src/validation/profile.schema.js';
import { assertCandidateAccess } from '../../src/services/profile.service.js';
import { PERMISSIONS } from '../../src/constants/authorization.constants.js';
import { FilesystemResumeStorage, getResumeStorage } from '../../src/services/resume-storage.service.js';
import { MAX_RESUME_BYTES, safeResumeName, validateResume } from '../../src/services/resume.service.js';

test('perfil distingue campos omitidos, nulos y colecciones vacías; rechaza campos internos', () => {
  assert.deepEqual(updateProfileSchema.parse({ phone: '  ', skills: [] }), { phone: null, skills: [] });
  for (const input of [{}, { email: 'other@example.test' }, { userId: 12 }, { resumeFileId: 4 }, { firstName: '' }, { phone: 'x'.repeat(31) }]) {
    assert.equal(updateProfileSchema.safeParse(input).success, false);
  }
  assert.equal(updateProfileSchema.safeParse({ firstName: 'x'.repeat(100), lastName: '' }).success, true);
});

test('perfil valida fechas reales y orden cronológico con estudios y empleos actuales', () => {
  const experience = { companyName: 'Empresa', position: 'Analista', startDate: '2024-02-29', endDate: null };
  assert.equal(updateProfileSchema.safeParse({ workExperiences: [experience] }).success, true);
  assert.equal(updateProfileSchema.safeParse({ workExperiences: [{ ...experience, startDate: '2025-02-29' }] }).success, false);
  assert.equal(updateProfileSchema.safeParse({ workExperiences: [{ ...experience, endDate: '2020-01-01' }] }).success, false);
  assert.equal(updateProfileSchema.safeParse({ educations: [{ institution: 'Universidad', degree: 'Carrera', startDate: '2020-01-01', endDate: '2024-01-01' }] }).success, true);
});

test('perfil exige rol candidato y permiso incluso ante grants administrativos incorrectos', () => {
  assert.doesNotThrow(() => assertCandidateAccess({ userId: 1, roles: ['CANDIDATE'], permissions: [PERMISSIONS.PROFILE_READ_OWN] }, PERMISSIONS.PROFILE_READ_OWN));
  assert.throws(() => assertCandidateAccess({ userId: 1, roles: ['ADMINISTRATOR'], permissions: [PERMISSIONS.PROFILE_READ_OWN] }, PERMISSIONS.PROFILE_READ_OWN));
  assert.throws(() => assertCandidateAccess({ userId: 1, roles: ['CANDIDATE'], permissions: [] }, PERMISSIONS.PROFILE_READ_OWN));
});

test('CV verifica bytes, extensión, MIME, tamaño y nombre seguro', () => {
  const buffer = Buffer.from('%PDF-1.4\ncontenido\n%%EOF');
  const file = { originalname: 'curriculum.pdf', mimetype: 'application/pdf', buffer, size: buffer.length };
  assert.doesNotThrow(() => validateResume(file));
  for (const patch of [{ originalname: 'cv.doc' }, { mimetype: 'text/plain' }, { size: 0 }, { buffer: Buffer.from('no PDF') }, { size: MAX_RESUME_BYTES + 1 }]) {
    assert.throws(() => validateResume({ ...file, ...patch }));
  }
  assert.equal(safeResumeName('..\\folder\\curriculum.pdf'), 'curriculum.pdf');
  assert.ok(safeResumeName('x'.repeat(400) + '.pdf').length <= 250);
});

test('filesystem conserva bytes, impide traversal, evita sobrescrituras y elimina idempotentemente', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fqa-storage-unit-'));
  try {
    const storage = new FilesystemResumeStorage(directory); const key = randomUUID() + '.pdf'; const bytes = Buffer.from('document');
    await storage.put(key, bytes);
    assert.deepEqual(await storage.get(key), bytes);
    await assert.rejects(storage.put(key, bytes));
    await assert.rejects(storage.get('../../secret'));
    assert.deepEqual(await storage.listOlderThan(new Date(Date.now() + 10_000)), [key]);
    await storage.remove(key); await storage.remove(key);
    assert.deepEqual(await storage.listOlderThan(new Date()), []);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('sin proveedor configurado CV está indisponible sin impedir otras funciones', () => {
  assert.throws(() => getResumeStorage(), /almacenamiento de CV no está disponible/);
});
