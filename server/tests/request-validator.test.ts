import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ValidationError,
  validateAiTestPayload,
  validateReadingGeneratePayload,
  validateReadingQuestionsPayload,
} from '../src/utils/request-validator.ts';

test('validateReadingGeneratePayload accepts valid input with defaults', () => {
  const payload = validateReadingGeneratePayload({
    text: 'Learning English through daily practice.',
  });

  assert.equal(payload.language, 'en');
  assert.equal(payload.generationMode, 'fromText');
  assert.equal(payload.topic, 'general');
  assert.equal(payload.difficulty, 'medium');
  assert.equal(payload.length, 'medium');
});

test('validateReadingGeneratePayload accepts auto mode without source text', () => {
  const payload = validateReadingGeneratePayload({
    generationMode: 'auto',
    topic: 'technology',
    difficulty: 'medium',
    length: 'short',
  });

  assert.equal(payload.text, '');
  assert.equal(payload.generationMode, 'auto');
  assert.equal(payload.topic, 'technology');
  assert.equal(payload.difficulty, 'medium');
  assert.equal(payload.length, 'short');
});

test('validateReadingGeneratePayload rejects non-string text', () => {
  assert.throws(
    () => validateReadingGeneratePayload({ text: 123 }),
    (error: unknown) => error instanceof ValidationError && error.message.includes('文本内容必须是字符串'),
  );
});

test('validateReadingQuestionsPayload rejects out-of-range questionCount', () => {
  assert.throws(
    () => validateReadingQuestionsPayload({ reading: 'abc', questionCount: 99 }),
    (error: unknown) => error instanceof ValidationError && error.message.includes('题目数量必须在 1 到 20 之间'),
  );
});

test('validateAiTestPayload requires aiConfig', () => {
  assert.throws(
    () => validateAiTestPayload({}),
    (error: unknown) => error instanceof ValidationError && error.message.includes('请提供 aiConfig 配置'),
  );
});
