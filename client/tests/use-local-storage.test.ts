import test from 'node:test';
import assert from 'node:assert/strict';

import { safeParseStorageValue } from '../src/hooks/use-local-storage.ts';

test('safeParseStorageValue returns parsed object for valid JSON', () => {
  const result = safeParseStorageValue('{"name":"alice"}', { name: 'fallback' });
  assert.equal(result.name, 'alice');
});

test('safeParseStorageValue returns fallback for invalid JSON', () => {
  const result = safeParseStorageValue('{invalid-json}', { name: 'fallback' });
  assert.equal(result.name, 'fallback');
});

test('safeParseStorageValue returns fallback for null input', () => {
  const result = safeParseStorageValue(null, 7);
  assert.equal(result, 7);
});
