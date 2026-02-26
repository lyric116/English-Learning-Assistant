import test from 'node:test';
import assert from 'node:assert/strict';

import { api, unwrapApiPayload } from '../src/lib/api.ts';

function createStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

test('unwrapApiPayload returns envelope data when success', () => {
  const result = unwrapApiPayload<{ value: number }>({ success: true, data: { value: 42 } });
  assert.equal(result.value, 42);
});

test('api.health unwraps standardized response envelope', async () => {
  const localStorage = createStorage();
  const sessionStorage = createStorage();
  globalThis.localStorage = localStorage as Storage;
  globalThis.sessionStorage = sessionStorage as Storage;

  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => ({ success: true, code: 'OK', message: 'ok', data: { status: 'ok' } }),
  })) as typeof fetch;

  const result = await api.health();
  assert.equal(result.status, 'ok');
});

test('api request throws code-aware error message on non-2xx', async () => {
  const localStorage = createStorage();
  const sessionStorage = createStorage();
  globalThis.localStorage = localStorage as Storage;
  globalThis.sessionStorage = sessionStorage as Storage;

  globalThis.fetch = (async () => ({
    ok: false,
    statusText: 'Bad Request',
    json: async () => ({ success: false, code: 'VALIDATION_ERROR', message: '参数错误' }),
  })) as typeof fetch;

  await assert.rejects(
    () => api.health(),
    (error: unknown) => {
      assert.match(String((error as Error).message), /\[VALIDATION_ERROR\] 参数错误/);
      return true;
    },
  );
});
