import test from 'node:test';
import assert from 'node:assert/strict';

import { migrateTestDatabase } from '../helpers/db.ts';

process.env.SQLITE_DB_PATH = migrateTestDatabase('repo-share');

const repositoryModule = await import('../../dist/repositories/learning-data-repository.js');
const repositoryExports = repositoryModule.default?.learningDataRepository ? repositoryModule.default : repositoryModule;
const { learningDataRepository } = repositoryExports;

test('repository creates shared reports and reads them by shareId', () => {
  const created = learningDataRepository.createSharedReport('share-owner', {
    title: 'Shareable Report',
    summary: 'A concise shared summary.',
    tests: { averageScore: 90 },
  });

  assert.ok(created?.shareId);

  const report = learningDataRepository.getSharedReport(created.shareId);
  assert.equal(report?.shareId, created.shareId);
  assert.equal(report?.title, 'Shareable Report');
  assert.equal(report?.summary, 'A concise shared summary.');
  assert.deepEqual(report?.report.tests, { averageScore: 90 });
});

test('repository increments shared report visit and conversion counters', () => {
  const created = learningDataRepository.createSharedReport('share-events-owner', {
    title: 'Event Report',
    summary: 'Track events.',
  });

  assert.ok(created?.shareId);
  assert.equal(learningDataRepository.trackSharedReportEvent(created.shareId, 'visit'), true);
  assert.equal(learningDataRepository.trackSharedReportEvent(created.shareId, 'visit'), true);
  assert.equal(learningDataRepository.trackSharedReportEvent(created.shareId, 'convert'), true);

  const report = learningDataRepository.getSharedReport(created.shareId);
  assert.equal(report?.viewCount, 2);
  assert.equal(report?.conversionCount, 1);
});

test('repository returns null for unknown shared report ids', () => {
  assert.equal(learningDataRepository.getSharedReport('missing-share-id'), null);
});
