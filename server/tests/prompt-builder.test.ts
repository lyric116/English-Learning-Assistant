import test from 'node:test';
import assert from 'node:assert/strict';

import { summarizeLearningDataForReport } from '../src/utils/prompt-builder.ts';

test('summarizeLearningDataForReport compacts learning history into aggregate metrics', () => {
  const now = Date.now();
  const summary = summarizeLearningDataForReport({
    flashcards: [
      { word: 'adapt', learningStatus: 'new', accuracy: 0, reviewCount: 0, nextReviewAt: now - 1_000 },
      { word: 'iterate', learningStatus: 'reviewing', accuracy: 60, reviewCount: 4, nextReviewAt: now - 2_000 },
      { word: 'ship', learningStatus: 'mastered', accuracy: 100, reviewCount: 8, nextReviewAt: now + 86_400_000 },
    ],
    flashcardSessionSummary: {
      studiedCount: 12,
      correctCount: 9,
      incorrectCount: 3,
      accuracy: 75,
      dueCount: 2,
      updatedAt: '2026-03-20T13:00:00.000Z',
    },
    readingHistory: [
      {
        title: 'Daily Practice',
        english: 'Practice a little every day.',
        vocabulary: [{ word: 'practice' }, { word: 'daily' }],
        generationConfig: { topic: 'education', difficulty: 'easy' },
      },
      {
        title: 'Work Memo',
        english: 'Teams need concise updates.',
        vocabulary: [{ word: 'concise' }],
        generationConfig: { topic: 'work', difficulty: 'medium' },
      },
    ],
    testHistory: [
      { type: 'reading', score: 88, date: '2026-03-18T12:00:00.000Z' },
      { type: 'vocabulary', score: 76, date: '2026-03-19T12:00:00.000Z' },
    ],
  }) as {
    flashcards: {
      total: number;
      dueCount: number;
      statuses: { new: number; reviewing: number; mastered: number };
      weakestWords: Array<{ word: string }>;
    };
    reading: {
      total: number;
      topTopics: string[];
      recentTitles: string[];
    };
    tests: {
      total: number;
      averageScore: number;
      byType: Record<string, number>;
    };
  };

  assert.equal(summary.flashcards.total, 3);
  assert.equal(summary.flashcards.dueCount, 2);
  assert.deepEqual(summary.flashcards.statuses, { new: 1, reviewing: 1, mastered: 1 });
  assert.equal(summary.flashcards.weakestWords[0]?.word, 'adapt');

  assert.equal(summary.reading.total, 2);
  assert.deepEqual(summary.reading.topTopics, ['education', 'work']);
  assert.deepEqual(summary.reading.recentTitles, ['Work Memo', 'Daily Practice']);

  assert.equal(summary.tests.total, 2);
  assert.equal(summary.tests.averageScore, 82);
  assert.equal(summary.tests.byType.reading, 1);
  assert.equal(summary.tests.byType.vocabulary, 1);
});
