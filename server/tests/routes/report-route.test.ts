import test, { after } from 'node:test';
import assert from 'node:assert/strict';

import { TEST_AI_CONFIG, mockAiJson } from '../helpers/ai.ts';
import { createTestHttpClient } from '../helpers/http.ts';

const client = await createTestHttpClient('route-report');

after(async () => {
  await client.close();
});

test('POST /api/v1/report/generate rejects missing learning data', async () => {
  const response = await client.post<{ success: boolean; code: string; message: string }>('/api/v1/report/generate', {
    reportType: 'weekly',
    aiConfig: TEST_AI_CONFIG,
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.code, 'VALIDATION_ERROR');
  assert.match(response.body.message, /学习数据必须是 JSON 对象/);
});

test('POST /api/v1/report/generate returns report and persists history', async () => {
  const restoreFetch = mockAiJson({
    title: 'Weekly Learning Report',
    period: '2026-W20',
    summary: 'Reading and quiz practice stayed consistent.',
    timeStats: { totalHours: 5, averageDaily: 0.7, trend: '稳定' },
    vocabulary: { learned: 12, mastered: 6, needReview: 3 },
    reading: { articles: 2, topTopics: ['technology'], averageDifficulty: 'medium' },
    tests: { completed: 2, averageScore: 86, improvement: '上升' },
    strengths: ['阅读细节定位'],
    weaknesses: ['词汇辨析'],
    suggestions: ['每天复习错词'],
  });

  try {
    const response = await client.post<{ success: boolean; data: { title: string; tests: { averageScore: number } } }>(
      '/api/v1/report/generate',
      {
        reportType: 'weekly',
        learningData: {
          readingHistory: [{ title: 'Green Cities', generationConfig: { topic: 'technology' } }],
          testHistory: [{ type: 'reading', score: 86 }],
        },
        aiConfig: TEST_AI_CONFIG,
      },
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.tests.averageScore, 86);

    const history = await client.get<{ data: Array<{ title: string }> }>('/api/v1/report/history?limit=5');
    assert.equal(history.body.data[0]?.title, 'Weekly Learning Report');
  } finally {
    restoreFetch();
  }
});

test('GET /api/v1/report/share/:shareId returns 404 for missing share id', async () => {
  const response = await client.get<{ success: boolean; code: string; message: string }>('/api/v1/report/share/not-exists');

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
  assert.equal(response.body.code, 'NOT_FOUND');
  assert.match(response.body.message, /分享内容不存在/);
});

test('POST /api/v1/report/share rejects missing report object', async () => {
  const response = await client.post<{ code: string; message: string }>('/api/v1/report/share', {});

  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'BAD_REQUEST');
  assert.match(response.body.message, /report 数据/);
});

