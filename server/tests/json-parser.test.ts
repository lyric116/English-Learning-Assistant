import test from 'node:test';
import assert from 'node:assert/strict';

import { parseJsonResponse } from '../src/utils/json-parser.ts';

test('parseJsonResponse parses markdown json code block', () => {
  const result = parseJsonResponse<{ english: string; chinese: string }>(`
\`\`\`json
{"english":"Hello","chinese":"你好"}
\`\`\`
`);

  assert.equal(result.english, 'Hello');
  assert.equal(result.chinese, '你好');
});

test('parseJsonResponse extracts json from noisy text', () => {
  const result = parseJsonResponse<{ score: number }>('before {"score": 88} after');
  assert.equal(result.score, 88);
});

test('parseJsonResponse throws on invalid json', () => {
  assert.throws(
    () => parseJsonResponse('not json at all'),
    (error: unknown) => error instanceof Error && error.message.includes('无法解析 AI 返回的 JSON 数据'),
  );
});
