import test from 'node:test';
import assert from 'node:assert/strict';

import {
  estimateCompactFlashcardsMaxTokens,
  estimateFlashcardsMaxTokens,
  estimateReadingMaxTokens,
  estimateSentenceMaxTokens,
  estimateTextTokens,
} from '../src/utils/ai-request-planner.ts';

test('estimateTextTokens handles mixed English and Chinese input', () => {
  const mixed = estimateTextTokens('Learning English 每天坚持，效果会更稳定。');
  const shortInput = estimateTextTokens('Hello');

  assert.ok(mixed > 0);
  assert.ok(mixed > shortInput);
});

test('estimateFlashcardsMaxTokens grows with requested word count and stays capped', () => {
  assert.ok(estimateFlashcardsMaxTokens(5) < estimateFlashcardsMaxTokens(10));
  assert.equal(estimateFlashcardsMaxTokens(100), 640);
});

test('estimateCompactFlashcardsMaxTokens stays below standard flashcard budgets', () => {
  assert.ok(estimateCompactFlashcardsMaxTokens(10) < estimateFlashcardsMaxTokens(10));
  assert.equal(estimateCompactFlashcardsMaxTokens(100), 460);
});

test('estimateSentenceMaxTokens stays within tuned sentence-analysis range', () => {
  const shortSentence = estimateSentenceMaxTokens('The cat sat on the mat.');
  const longSentence = estimateSentenceMaxTokens(
    'The book, which was written by a famous author, has won several awards and is now being adapted into a movie that will be released next year.',
  );

  assert.ok(shortSentence >= 760);
  assert.ok(longSentence > shortSentence);
  assert.ok(longSentence <= 1400);
});

test('estimateReadingMaxTokens adapts to language direction and caps extreme input', () => {
  const source = 'Artificial intelligence can support language learning when the tasks are clear and the feedback is immediate.';
  const enToZh = estimateReadingMaxTokens(source, 'en');
  const zhToEn = estimateReadingMaxTokens('人工智能可以在任务清晰、反馈及时的情况下帮助语言学习。', 'zh');
  const extreme = estimateReadingMaxTokens('a'.repeat(100_000), 'en');

  assert.ok(enToZh >= 700);
  assert.ok(zhToEn >= 700);
  assert.equal(extreme, 3200);
});
