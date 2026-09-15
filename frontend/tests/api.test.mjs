import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, apiRequest } from '../src/services/api.ts';

const withMockFetch = async (mockFetch, callback) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;
  try {
    await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
};

test('muestra un error en español cuando la API no está disponible', async () => {
  await withMockFetch(
    async () => {
      throw new TypeError('connection refused');
    },
    async () => {
      await assert.rejects(
        () => apiRequest('/health'),
        (error) => {
          assert.ok(error instanceof ApiError);
          assert.equal(error.status, 0);
          assert.equal(
            error.message,
            'No fue posible conectar con el servidor. Inténtalo de nuevo.',
          );
          return true;
        },
      );
    },
  );
});

test('conserva el mensaje de correo duplicado enviado por el backend', async () => {
  await withMockFetch(
    async () =>
      new Response(
        JSON.stringify({ message: 'Ya existe una cuenta con este correo electrónico.' }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    async () => {
      await assert.rejects(
        () => apiRequest('/auth/register', { method: 'POST', body: '{}' }),
        (error) => {
          assert.ok(error instanceof ApiError);
          assert.equal(error.status, 409);
          assert.equal(
            error.message,
            'Ya existe una cuenta con este correo electrónico.',
          );
          return true;
        },
      );
    },
  );
});