import test from 'node:test';
import assert from 'node:assert/strict';

import { migrateTestDatabase } from '../helpers/db.ts';

process.env.SQLITE_DB_PATH = migrateTestDatabase('repo-learning');

const repositoryModule = await import('../../dist/repositories/learning-data-repository.js');
const repositoryExports = repositoryModule.default?.learningDataRepository ? repositoryModule.default : repositoryModule;
const { learningDataRepository } = repositoryExports;

test('repository returns empty arrays for a fresh owner', () => {
  assert.deepEqual(learningDataRepository.getReadingHistory('empty-owner', 5), []);
  assert.deepEqual(learningDataRepository.getQuizHistory('empty-owner', 5), []);
  assert.deepEqual(learningDataRepository.getReportHistory('empty-owner', 5), []);
});

test('repository inserts and reads reading history by owner', () => {
  const owner = 'repo-reading-owner';

  learningDataRepository.persistReadingContent(owner, {
    language: 'en',
    topic: 'education',
    difficulty: 'easy',
    length: 'short',
    title: 'Repository Reading',
    english: 'Repository tests keep persistence honest.',
    chinese: '仓储测试保证持久化可靠。',
    vocabulary: [{ word: 'honest', meaning: '可靠的' }],
  });

  const history = learningDataRepository.getReadingHistory(owner, 5);
  assert.equal(history.length, 1);
  assert.equal(history[0]?.title, 'Repository Reading');
  assert.equal(history[0]?.generationConfig?.topic, 'education');
  assert.deepEqual(history[0]?.vocabulary, [{ word: 'honest', meaning: '可靠的' }]);
});

test('repository inserts and reads quiz result details', () => {
  const owner = 'repo-quiz-owner';

  learningDataRepository.persistQuizResult(owner, {
    type: 'reading',
    score: 88,
    date: '2026-05-20T10:00:00.000Z',
    readingTitle: 'Quiz Reading',
    questionCount: 5,
    difficulty: 'medium',
    timedMode: true,
    timeLimitMinutes: 12,
    timeSpentSeconds: 240,
  });

  const history = learningDataRepository.getQuizHistory(owner, 5);
  assert.equal(history.length, 1);
  assert.equal(history[0]?.score, 88);
  assert.equal(history[0]?.type, 'reading');
  assert.equal(history[0]?.questionCount, 5);
  assert.equal(history[0]?.timedMode, true);
  assert.equal(history[0]?.timeSpentSeconds, 240);
});

test('repository inserts and reads reports by owner', () => {
  const owner = 'repo-report-owner';

  learningDataRepository.persistLearningReport(owner, 'weekly', {
    title: 'Repository Report',
    period: 'W20',
    summary: 'Report persistence works.',
    tests: { averageScore: 91 },
  });

  const history = learningDataRepository.getReportHistory(owner, 5);
  assert.equal(history.length, 1);
  assert.equal(history[0]?.title, 'Repository Report');
  assert.deepEqual(history[0]?.tests, { averageScore: 91 });
});

test('repository isolates anonymous session owners', () => {
  learningDataRepository.persistReadingContent('session-a', {
    language: 'en',
    topic: 'general',
    difficulty: 'medium',
    length: 'short',
    title: 'Only A',
    english: 'A owner content.',
    chinese: 'A 用户内容。',
    vocabulary: [],
  });

  assert.equal(learningDataRepository.getReadingHistory('session-a', 5).length, 1);
  assert.equal(learningDataRepository.getReadingHistory('session-b', 5).length, 0);
});

test('repository isolates authenticated users from same-id anonymous owners', () => {
  const ownerId = 'shared-owner-id';

  learningDataRepository.persistReadingContent(ownerId, {
    language: 'en',
    topic: 'general',
    difficulty: 'medium',
    length: 'short',
    title: 'Anonymous Same Id',
    english: 'Anonymous data with the same owner id.',
    chinese: '同名匿名数据。',
    vocabulary: [],
  });

  learningDataRepository.persistReadingContent({ ownerType: 'user', ownerId }, {
    language: 'en',
    topic: 'education',
    difficulty: 'easy',
    length: 'short',
    title: 'User Same Id',
    english: 'User data with the same owner id.',
    chinese: '同名用户数据。',
    vocabulary: [],
  });

  const anonymousHistory = learningDataRepository.getReadingHistory(ownerId, 5);
  const userHistory = learningDataRepository.getReadingHistory({ ownerType: 'user', ownerId }, 5);

  assert.equal(anonymousHistory.length, 1);
  assert.equal(anonymousHistory[0]?.title, 'Anonymous Same Id');
  assert.equal(userHistory.length, 1);
  assert.equal(userHistory[0]?.title, 'User Same Id');
});
