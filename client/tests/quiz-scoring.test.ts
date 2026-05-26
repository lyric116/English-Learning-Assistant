import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateQuizMetrics } from '../src/lib/quiz-scoring.ts';
import type { QuizQuestion } from '../src/types/index.ts';

const questions: QuizQuestion[] = [
  { question: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: 'A' },
  { question: 'Q2', options: ['A', 'B', 'C', 'D'], correctIndex: 2, explanation: 'C' },
  { question: 'Q3', options: ['A', 'B', 'C', 'D'], correctIndex: 1, explanation: 'B' },
];

test('calculateQuizMetrics scores correct, incorrect, and unanswered answers', () => {
  const result = calculateQuizMetrics(questions, [0, 1, null]);

  assert.equal(result.total, 3);
  assert.equal(result.answered, 2);
  assert.equal(result.unanswered, 1);
  assert.equal(result.correct, 1);
  assert.equal(result.incorrect, 2);
  assert.equal(result.score, 33);
  assert.equal(result.accuracy, 50);
});

test('calculateQuizMetrics handles empty question lists safely', () => {
  const result = calculateQuizMetrics([], []);

  assert.equal(result.total, 0);
  assert.equal(result.score, 0);
  assert.equal(result.accuracy, 0);
});

