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

test('api.reading.generate sends auto generation mode payload', async () => {
  const localStorage = createStorage();
  const sessionStorage = createStorage();
  globalThis.localStorage = localStorage as Storage;
  globalThis.sessionStorage = sessionStorage as Storage;

  let requestBody: Record<string, unknown> | null = null;
  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    requestBody = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    return {
      ok: true,
      json: async () => ({
        success: true,
        code: 'OK',
        message: 'ok',
        data: {
          title: 'A Smarter City',
          english: 'A city uses sensors to save energy.',
          chinese: '一座城市使用传感器节省能源。',
          vocabulary: [],
        },
      }),
    };
  }) as typeof fetch;

  await api.reading.generate('', {
    generationMode: 'auto',
    topic: 'technology',
    difficulty: 'medium',
    length: 'short',
  });

  assert.equal(requestBody?.text, '');
  assert.equal(requestBody?.generationMode, 'auto');
  assert.equal(requestBody?.topic, 'technology');
  assert.equal(requestBody?.difficulty, 'medium');
  assert.equal(requestBody?.length, 'short');
});
