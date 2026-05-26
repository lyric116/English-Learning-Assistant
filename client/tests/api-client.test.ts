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

test('api requests include anonymous session and saved auth token', async () => {
  const localStorage = createStorage();
  const sessionStorage = createStorage();
  localStorage.setItem('anonymous-session-id', 'anon-session-1');
  localStorage.setItem('auth-session-v1', JSON.stringify({
    token: 'auth-token-1',
    expiresAt: '2026-06-01T00:00:00.000Z',
    user: { id: 'user-1', email: 'learner@example.com', status: 'active' },
  }));
  globalThis.localStorage = localStorage as Storage;
  globalThis.sessionStorage = sessionStorage as Storage;

  let headers: Headers | null = null;
  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    headers = new Headers(init?.headers);
    return {
      ok: true,
      json: async () => ({ success: true, code: 'OK', message: 'ok', data: { status: 'ok' } }),
    };
  }) as typeof fetch;

  await api.health();

  assert.equal(headers?.get('x-anonymous-session-id'), 'anon-session-1');
  assert.equal(headers?.get('authorization'), 'Bearer auth-token-1');
});

test('api.auth.register sends anonymous import options without AI usage prompt', async () => {
  const localStorage = createStorage();
  const sessionStorage = createStorage();
  localStorage.setItem('anonymous-session-id', 'anon-session-2');
  globalThis.localStorage = localStorage as Storage;
  globalThis.sessionStorage = sessionStorage as Storage;
  globalThis.window = { confirm: () => {
    throw new Error('auth request should not ask for AI over-limit confirmation');
  } } as Window & typeof globalThis;

  let requestBody: Record<string, unknown> | null = null;
  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    requestBody = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    return {
      ok: true,
      json: async () => ({
        success: true,
        code: 'REGISTERED',
        message: 'registered',
        data: {
          token: 'token-2',
          expiresAt: '2026-06-01T00:00:00.000Z',
          user: { id: 'user-2', email: 'new@example.com', status: 'active' },
          importedAnonymousData: { readingHistory: 1 },
        },
      }),
    };
  }) as typeof fetch;

  const result = await api.auth.register({
    email: 'new@example.com',
    password: 'strong-pass-1',
    anonymousSessionId: 'anon-session-2',
    importAnonymousData: true,
  });

  assert.equal(requestBody?.anonymousSessionId, 'anon-session-2');
  assert.equal(requestBody?.importAnonymousData, true);
  assert.equal(result.token, 'token-2');
  assert.equal(result.importedAnonymousData?.readingHistory, 1);
});
