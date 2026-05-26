import test from 'node:test';
import assert from 'node:assert/strict';

import { asReportText, getSharedReportDisplayFields } from '../src/lib/report-format.ts';

test('asReportText formats numbers and falls back for blank text', () => {
  assert.equal(asReportText(88, '-'), '88');
  assert.equal(asReportText('  Summary  ', '-'), '  Summary  ');
  assert.equal(asReportText('', '-'), '-');
  assert.equal(asReportText(null, '-'), '-');
});

test('getSharedReportDisplayFields reads safe fields from shared report payload', () => {
  const result = getSharedReportDisplayFields({
    title: '',
    summary: '',
    report: {
      title: 'Weekly Report',
      period: '2026-W20',
      summary: 'Consistent progress.',
      tests: { averageScore: 91 },
      reading: { articles: 4 },
    },
  });

  assert.equal(result.reportTitle, 'Weekly Report');
  assert.equal(result.period, '2026-W20');
  assert.equal(result.summary, 'Consistent progress.');
  assert.equal(result.averageScore, '91');
  assert.equal(result.readingCount, '4');
});

test('getSharedReportDisplayFields provides fallbacks for malformed report data', () => {
  const result = getSharedReportDisplayFields(null);

  assert.equal(result.reportTitle, '学习报告');
  assert.equal(result.period, '近期学习');
  assert.equal(result.averageScore, '-');
  assert.equal(result.readingCount, '-');
});

