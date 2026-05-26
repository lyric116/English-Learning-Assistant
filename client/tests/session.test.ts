import test from 'node:test';
import assert from 'node:assert/strict';

import { getAnonymousSessionId } from '../src/lib/session.ts';
import {
  AUTH_SESSION_KEY,
  clearAuthSession,
  clearLocalLearningCache,
  getAuthSession,
  getAuthToken,
  saveAuthSession,
} from '../src/lib/auth-session.ts';

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

test('getAnonymousSessionId creates and stores a new anonymous session id', () => {
  const storage = createStorage();
  globalThis.localStorage = storage as Storage;
  Object.defineProperty(globalThis, 'crypto', {
    value: { randomUUID: () => 'session-uuid-1' },
    configurable: true,
  });

  const id = getAnonymousSessionId();

  assert.equal(id, 'session-uuid-1');
  assert.equal(storage.getItem('anonymous-session-id'), 'session-uuid-1');
});

test('getAnonymousSessionId reuses existing anonymous session id', () => {
  const storage = createStorage();
  storage.setItem('anonymous-session-id', 'existing-session');
  globalThis.localStorage = storage as Storage;

  assert.equal(getAnonymousSessionId(), 'existing-session');
});

test('auth session helpers save, read, and clear login state', () => {
  const storage = createStorage();
  saveAuthSession({
    token: 'token-1',
    expiresAt: '2026-06-01T00:00:00.000Z',
    user: { id: 'user-1', email: 'learner@example.com', status: 'active' },
  }, storage as Storage);

  assert.equal(getAuthToken(storage as Storage), 'token-1');
  assert.equal(getAuthSession(storage as Storage)?.user.email, 'learner@example.com');

  clearAuthSession(storage as Storage);
  assert.equal(storage.getItem(AUTH_SESSION_KEY), null);
  assert.equal(getAuthSession(storage as Storage), null);
});

test('clearLocalLearningCache removes learning data but keeps anonymous session', () => {
  const storage = createStorage();
  storage.setItem('anonymous-session-id', 'anon-1');
  storage.setItem('flashcards', '[]');
  storage.setItem('readingHistory', '[]');
  storage.setItem(AUTH_SESSION_KEY, '{}');

  clearLocalLearningCache(storage as Storage);

  assert.equal(storage.getItem('anonymous-session-id'), 'anon-1');
  assert.equal(storage.getItem('flashcards'), null);
  assert.equal(storage.getItem('readingHistory'), null);
  assert.equal(storage.getItem(AUTH_SESSION_KEY), '{}');
});
