import test, { after } from 'node:test';
import assert from 'node:assert/strict';

import { createTestHttpClient } from '../helpers/http.ts';

const client = await createTestHttpClient('route-migration');

after(async () => {
  await client.close();
});

test('POST /api/v1/migration/backfill accepts empty localStorage payload', async () => {
  const response = await client.post<{ success: boolean; data: { ok: boolean; synced: Record<string, number> } }>(
    '/api/v1/migration/backfill',
    {},
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.ok, true);
  assert.deepEqual(response.body.data.synced, {
    flashcards: 0,
    sentenceHistory: 0,
    readingHistory: 0,
    testHistory: 0,
    reportHistory: 0,
  });
});

test('POST /api/v1/migration/backfill migrates valid localStorage data', async () => {
  const response = await client.post<{ data: { synced: Record<string, number> } }>('/api/v1/migration/backfill', {
    flashcards: [{
      word: 'iterate',
      phonetic: '/ˈɪtəreɪt/',
      definition: '迭代',
      etymology: '拉丁语 iterare',
      example: 'Teams iterate quickly.',
      exampleTranslation: '团队快速迭代。',
    }],
    sentenceHistory: [{
      sentence: 'Practice makes progress.',
      result: { structure: { type: 'simple' } },
      timestamp: Date.now(),
    }],
    readingHistory: [{
      title: 'Migration Reading',
      english: 'A migrated reading entry.',
      chinese: '一条迁移来的阅读记录。',
      vocabulary: [{ word: 'migrated', meaning: '迁移的' }],
      timestamp: Date.now(),
      generationConfig: { language: 'en', topic: 'education', difficulty: 'easy', length: 'short' },
    }],
    testHistory: [{
      type: 'reading',
      score: 92,
      date: new Date().toISOString(),
      readingTitle: 'Migration Reading',
      questionCount: 5,
      difficulty: 'easy',
      timedMode: false,
    }],
    reportHistory: [{
      templateType: 'weekly',
      title: 'Migration Report',
      period: 'W20',
      summary: 'Migrated report.',
    }],
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.synced.flashcards, 1);
  assert.equal(response.body.data.synced.readingHistory, 1);
  assert.equal(response.body.data.synced.testHistory, 1);

  const status = await client.get<{ data: Record<string, number> }>('/api/v1/migration/status');
  assert.equal(status.body.data.flashcards, 1);
  assert.equal(status.body.data.reading_contents, 1);
  assert.equal(status.body.data.quiz_attempts, 1);
  assert.equal(status.body.data.learning_reports, 1);
});

