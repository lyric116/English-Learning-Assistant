import test from 'node:test';
import assert from 'node:assert/strict';

import { collectBackfillPayload, hasBackfillData, readLocalArray } from '../src/lib/local-storage-migration.ts';

function createStorage(seed: Record<string, string>) {
  return {
    getItem: (key: string) => seed[key] ?? null,
  };
}

test('readLocalArray returns parsed arrays and falls back on invalid values', () => {
  const storage = createStorage({
    valid: '[{"word":"adapt"}]',
    object: '{"word":"adapt"}',
    invalid: '{bad-json}',
  });

  assert.deepEqual(readLocalArray(storage as Storage, 'valid'), [{ word: 'adapt' }]);
  assert.deepEqual(readLocalArray(storage as Storage, 'object'), []);
  assert.deepEqual(readLocalArray(storage as Storage, 'invalid'), []);
  assert.deepEqual(readLocalArray(storage as Storage, 'missing'), []);
});

test('collectBackfillPayload maps legacy localStorage keys to migration payload', () => {
  const storage = createStorage({
    flashcards: '[{"word":"adapt"}]',
    sentenceHistory: '[{"sentence":"Practice works."}]',
    readingHistory: '[{"title":"Reading"}]',
    testHistory: '[{"score":80}]',
    reportHistory: '[{"title":"Report"}]',
  });

  const payload = collectBackfillPayload(storage as Storage);

  assert.equal(payload.flashcards.length, 1);
  assert.equal(payload.sentenceHistory.length, 1);
  assert.equal(payload.readingHistory.length, 1);
  assert.equal(payload.testHistory.length, 1);
  assert.equal(payload.reportHistory.length, 1);
  assert.equal(hasBackfillData(payload), true);
});

test('hasBackfillData returns false for an empty migration payload', () => {
  assert.equal(hasBackfillData({
    flashcards: [],
    sentenceHistory: [],
    readingHistory: [],
    testHistory: [],
    reportHistory: [],
  }), false);
});

