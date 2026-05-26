import test, { after } from 'node:test';
import assert from 'node:assert/strict';

import { TEST_AI_CONFIG, mockAiJson } from '../helpers/ai.ts';
import { createTestHttpClient } from '../helpers/http.ts';

const client = await createTestHttpClient('route-quiz');

after(async () => {
  await client.close();
});

test('POST /api/v1/quiz/reading-questions rejects missing reading content', async () => {
  const response = await client.post<{ success: boolean; code: string; message: string }>('/api/v1/quiz/reading-questions', {
    questionCount: 5,
    aiConfig: TEST_AI_CONFIG,
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'VALIDATION_ERROR');
  assert.match(response.body.message, /阅读内容必须是字符串/);
});

test('POST /api/v1/quiz/reading-questions rejects out-of-range question count', async () => {
  const response = await client.post<{ message: string }>('/api/v1/quiz/reading-questions', {
    reading: 'A short reading passage.',
    questionCount: 21,
    aiConfig: TEST_AI_CONFIG,
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /题目数量必须在 1 到 20 之间/);
});

test('POST /api/v1/quiz/reading-questions returns generated questions', async () => {
  const restoreFetch = mockAiJson([
    {
      question: 'What reduces heat?',
      options: ['Trees', 'Cars', 'Noise', 'Plastic'],
      correctIndex: 0,
      explanation: 'The text mentions trees.',
    },
  ]);

  try {
    const response = await client.post<{ success: boolean; data: Array<{ question: string; correctIndex: number }> }>(
      '/api/v1/quiz/reading-questions',
      {
        reading: 'Cities use trees to reduce heat.',
        questionCount: 1,
        difficulty: 'easy',
        aiConfig: TEST_AI_CONFIG,
      },
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data[0]?.correctIndex, 0);
  } finally {
    restoreFetch();
  }
});

test('POST /api/v1/quiz/vocabulary-questions rejects empty vocabulary data', async () => {
  const response = await client.post<{ message: string }>('/api/v1/quiz/vocabulary-questions', {
    vocabulary: [],
    aiConfig: TEST_AI_CONFIG,
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /词汇列表数量必须在 1 到 200 之间/);
});

test('POST /api/v1/quiz/vocabulary-questions returns generated vocabulary questions', async () => {
  const restoreFetch = mockAiJson([
    {
      question: 'What does resilient mean?',
      options: ['有韧性的', '昂贵的', '古老的', '复杂的'],
      correctIndex: 0,
      explanation: 'resilient means able to recover.',
    },
  ]);

  try {
    const response = await client.post<{ data: Array<{ question: string }> }>('/api/v1/quiz/vocabulary-questions', {
      vocabulary: [{ word: 'resilient', meaning: '有韧性的' }],
      questionCount: 1,
      aiConfig: TEST_AI_CONFIG,
    });

    assert.equal(response.status, 200);
    assert.match(response.body.data[0]?.question || '', /resilient/);
  } finally {
    restoreFetch();
  }
});

