#!/usr/bin/env node

const { randomUUID } = require('crypto');
const path = require('path');
const { spawnSync } = require('child_process');

const dbPath = process.env.SQLITE_DB_PATH || `/tmp/english-learning-e2e-${randomUUID()}.db`;

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `${cmd} failed`).trim());
  }
  return (result.stdout || '').trim();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runStep(name, action) {
  try {
    action();
    console.log(`STEP_OK ${name}`);
  } catch (error) {
    throw new Error(`STEP_FAILED ${name}: ${error.message}`);
  }
}

async function main() {
  const serverRoot = path.resolve(__dirname, '..');

  runStep('db-migrate', () => {
    run('npm', ['run', 'db:migrate'], {
      cwd: serverRoot,
      env: { ...process.env, SQLITE_DB_PATH: dbPath },
    });
  });

  process.env.SQLITE_DB_PATH = dbPath;
  const { learningDataRepository } = require(path.join(serverRoot, 'dist', 'repositories', 'learning-data-repository.js'));

  const owner = 'e2e-owner-main-flow';

  runStep('persist-reading', () => {
    learningDataRepository.persistReadingContent(owner, {
      language: 'en',
      topic: 'general',
      difficulty: 'medium',
      length: 'short',
      title: 'Main Flow Reading',
      english: 'Reading content for test flow.',
      chinese: '用于测试流程的阅读内容。',
      vocabulary: [{ word: 'flow', meaning: '流程' }],
    });
  });

  runStep('persist-quiz', () => {
    learningDataRepository.persistQuizResult(owner, {
      type: 'reading',
      score: 84,
      date: new Date().toISOString(),
      readingTitle: 'Main Flow Reading',
      questionCount: 5,
      difficulty: 'medium',
      timedMode: false,
      timeLimitMinutes: 15,
      timeSpentSeconds: 120,
    });
  });

  runStep('persist-report', () => {
    learningDataRepository.persistLearningReport(owner, 'weekly', {
      title: 'Main Flow Report',
      period: 'P4-E2E',
      summary: 'Flow completed',
    });
  });

  let reading = [];
  let quiz = [];
  let report = [];

  runStep('verify-history', () => {
    reading = learningDataRepository.getReadingHistory(owner, 5);
    quiz = learningDataRepository.getQuizHistory(owner, 5);
    report = learningDataRepository.getReportHistory(owner, 5);

    assert(reading.length >= 1, 'reading history should contain at least one item');
    assert(quiz.length >= 1, 'quiz history should contain at least one item');
    assert(report.length >= 1, 'report history should contain at least one item');
    assert((quiz[0]?.score ?? 0) > 0, 'quiz score should be greater than 0');
  });

  console.log(`E2E_SIM_OK db=${dbPath} reading=${reading.length} quiz=${quiz.length} report=${report.length}`);
}

main().catch(err => {
  console.error(`E2E_SIM_FAILED ${err.message}`);
  process.exit(1);
});
