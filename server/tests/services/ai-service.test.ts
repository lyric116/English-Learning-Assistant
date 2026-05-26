import test from 'node:test';
import assert from 'node:assert/strict';

import { chatCompletionResponse, TEST_AI_CONFIG } from '../helpers/ai.ts';

const previousFetch = globalThis.fetch;
const serviceModule = await import('../../dist/services/ai-service.js');
const serviceExports = serviceModule.default?.generateReadingContent ? serviceModule.default : serviceModule;
const {
  generateLearningReport,
  generateReadingContent,
  testConnection,
} = serviceExports;

function mockAiContent(content: string): () => void {
  globalThis.fetch = (async () => chatCompletionResponse(content)) as typeof fetch;

  return () => {
    globalThis.fetch = previousFetch;
  };
}

test('generateReadingContent parses valid AI JSON response', async () => {
  const restoreFetch = mockAiContent(JSON.stringify({
    title: 'Mock Reading',
    english: 'Practice builds confidence.',
    chinese: '练习建立信心。',
    vocabulary: [{ word: 'confidence', meaning: '信心' }],
  }));

  try {
    const result = await generateReadingContent('', { generationMode: 'auto' }, { ...TEST_AI_CONFIG });

    assert.equal(result.title, 'Mock Reading');
    assert.equal(result.english, 'Practice builds confidence.');
    assert.equal(result.vocabulary[0]?.word, 'confidence');
  } finally {
    restoreFetch();
  }
});

test('generateReadingContent parses markdown-wrapped JSON response', async () => {
  const restoreFetch = mockAiContent(`
\`\`\`json
{"title":"Markdown Reading","english":"AI can wrap JSON.","chinese":"AI 可能包裹 JSON。","vocabulary":[{"word":"wrap","meaning":"包裹"}]}
\`\`\`
`);

  try {
    const result = await generateReadingContent('', { generationMode: 'auto' }, { ...TEST_AI_CONFIG });

    assert.equal(result.title, 'Markdown Reading');
    assert.equal(result.vocabulary[0]?.meaning, '包裹');
  } finally {
    restoreFetch();
  }
});

test('generateLearningReport extracts JSON from noisy AI text', async () => {
  const restoreFetch = mockAiContent('Here is the report: {"title":"Noisy Report","period":"W20","summary":"ok"} thanks.');

  try {
    const result = await generateLearningReport('weekly', { testHistory: [] }, { ...TEST_AI_CONFIG }) as {
      title: string;
      period: string;
    };

    assert.equal(result.title, 'Noisy Report');
    assert.equal(result.period, 'W20');
  } finally {
    restoreFetch();
  }
});

test('generateReadingContent rejects invalid AI JSON response', async () => {
  const restoreFetch = mockAiContent('{bad}');

  try {
    await assert.rejects(
      () => generateReadingContent('', { generationMode: 'auto' }, { ...TEST_AI_CONFIG }),
      /无法解析 AI 返回的 JSON 数据/,
    );
  } finally {
    restoreFetch();
  }
});

test('testConnection converts abort errors into timeout errors', async () => {
  globalThis.fetch = (async () => {
    throw new DOMException('aborted', 'AbortError');
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => testConnection({ ...TEST_AI_CONFIG }),
      /AI 请求超时/,
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('testConnection reports missing token or model as configuration error', async () => {
  await assert.rejects(
    () => testConnection({ apiKey: '', baseUrl: TEST_AI_CONFIG.baseUrl, model: TEST_AI_CONFIG.model }),
    /请先在页面设置中配置 AI 服务/,
  );
});
