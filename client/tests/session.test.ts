import test from 'node:test';
import assert from 'node:assert/strict';

import { getAnonymousSessionId } from '../src/lib/session.ts';

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

