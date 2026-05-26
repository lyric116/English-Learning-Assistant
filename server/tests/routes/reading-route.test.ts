import test, { after } from 'node:test';
import assert from 'node:assert/strict';

import { TEST_AI_CONFIG, mockAiJson } from '../helpers/ai.ts';
import { createTestHttpClient } from '../helpers/http.ts';

const client = await createTestHttpClient('route-reading');

after(async () => {
  await client.close();
});

test('POST /api/v1/reading/generate rejects empty source text in fromText mode', async () => {
  const response = await client.post<{ success: boolean; code: string; message: string }>('/api/v1/reading/generate', {
    text: '',
    generationMode: 'fromText',
    aiConfig: TEST_AI_CONFIG,
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.code, 'VALIDATION_ERROR');
  assert.match(response.body.message, /文本内容不能为空/);
});

test('POST /api/v1/reading/generate rejects unsupported difficulty', async () => {
  const response = await client.post<{ success: boolean; message: string }>('/api/v1/reading/generate', {
    text: 'Daily reading improves vocabulary.',
    difficulty: 'expert',
    aiConfig: TEST_AI_CONFIG,
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /阅读难度不支持/);
});

test('POST /api/v1/reading/generate returns AI reading and persists history', async () => {
  const restoreFetch = mockAiJson({
    title: 'Green Cities',
    english: 'Cities use trees and sensors to reduce heat.',
    chinese: '城市使用树木和传感器来降低热量。',
    vocabulary: [{ word: 'sensor', meaning: '传感器', example: 'A sensor measures heat.' }],
  });

  try {
    const response = await client.post<{
      success: boolean;
      data: { title: string; english: string; vocabulary: Array<{ word: string }> };
    }>('/api/v1/reading/generate', {
      text: '',
      generationMode: 'auto',
      topic: 'technology',
      difficulty: 'medium',
      length: 'short',
      aiConfig: TEST_AI_CONFIG,
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.title, 'Green Cities');
    assert.equal(response.body.data.vocabulary[0]?.word, 'sensor');

    const history = await client.get<{ data: Array<{ title: string; english: string }> }>('/api/v1/reading/history?limit=5');
    assert.equal(history.status, 200);
    assert.equal(history.body.data[0]?.title, 'Green Cities');
  } finally {
    restoreFetch();
  }
});

