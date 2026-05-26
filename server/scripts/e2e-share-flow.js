#!/usr/bin/env node

const { randomUUID } = require('crypto');
const path = require('path');
const { spawnSync } = require('child_process');

const dbPath = process.env.SQLITE_DB_PATH || `/tmp/english-learning-e2e-share-${randomUUID()}.db`;

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

function main() {
  const serverRoot = path.resolve(__dirname, '..');
  const owner = 'e2e-owner-share-flow';

  runStep('db-migrate', () => {
    run('npm', ['run', 'db:migrate'], {
      cwd: serverRoot,
      env: { ...process.env, SQLITE_DB_PATH: dbPath },
    });
  });

  process.env.SQLITE_DB_PATH = dbPath;
  const { learningDataRepository } = require(path.join(serverRoot, 'dist', 'repositories', 'learning-data-repository.js'));

  const report = {
    title: 'Share Flow Report',
    period: 'E2E Share',
    summary: 'Share flow completed.',
    reading: { articles: 2 },
    tests: { averageScore: 88 },
  };
  let shareId = '';

  runStep('persist-report', () => {
    learningDataRepository.persistLearningReport(owner, 'weekly', report);
  });

  runStep('create-share-link', () => {
    const created = learningDataRepository.createSharedReport(owner, report);
    assert(created && created.shareId, 'shareId should be created');
    shareId = created.shareId;
  });

  runStep('access-share-page-data', () => {
    const shared = learningDataRepository.getSharedReport(shareId);
    assert(shared && shared.title === 'Share Flow Report', 'shared report should be readable');
    assert(shared.viewCount === 0, 'initial view count should be zero');
  });

  runStep('record-view-event', () => {
    assert(learningDataRepository.trackSharedReportEvent(shareId, 'visit'), 'visit event should be tracked');
  });

  runStep('record-conversion-event', () => {
    assert(learningDataRepository.trackSharedReportEvent(shareId, 'convert'), 'conversion event should be tracked');
  });

  runStep('verify-share-counters', () => {
    const shared = learningDataRepository.getSharedReport(shareId);
    assert(shared.viewCount === 1, 'view_count should be 1');
    assert(shared.conversionCount === 1, 'conversion_count should be 1');
  });

  console.log(`E2E_SHARE_FLOW_OK db=${dbPath} shareId=${shareId} viewCount=1 conversionCount=1`);
}

try {
  main();
} catch (error) {
  console.error(`E2E_SHARE_FLOW_FAILED ${(error && error.message) || String(error)}`);
  process.exit(1);
}

