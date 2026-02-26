#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function query(sqliteBinary, dbPath, sql) {
  const result = spawnSync(sqliteBinary, ['-json', dbPath, sql], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'sqlite query failed').trim());
  }
  const raw = (result.stdout || '').trim();
  if (!raw) return [];
  return JSON.parse(raw);
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function main() {
  const sqliteBinary = process.env.SQLITE_BIN || 'sqlite3';
  const dbPath = process.env.SQLITE_DB_PATH || path.resolve(__dirname, '..', 'data', 'english-learning.db');
  const today = new Date().toISOString().slice(0, 10);
  const rootDir = path.resolve(__dirname, '..', '..');
  const outputPath = path.join(rootDir, 'code', `ops_daily_report_${today}.md`);

  const [totals] = query(sqliteBinary, dbPath, `
    SELECT
      (SELECT COUNT(*) FROM flashcards) AS flashcards,
      (SELECT COUNT(*) FROM sentence_analyses) AS sentenceAnalyses,
      (SELECT COUNT(*) FROM reading_contents) AS readings,
      (SELECT COUNT(*) FROM quiz_attempts) AS quizzes,
      (SELECT COUNT(*) FROM learning_reports) AS reports,
      (SELECT COUNT(*) FROM report_shares) AS sharedReports;
  `);

  const [quizStats] = query(sqliteBinary, dbPath, `
    SELECT
      ROUND(COALESCE(AVG(score), 0), 2) AS averageScore,
      ROUND(COALESCE(MAX(score), 0), 2) AS maxScore
    FROM quiz_attempts;
  `);

  const [shareStats] = query(sqliteBinary, dbPath, `
    SELECT
      COALESCE(SUM(view_count), 0) AS totalViews,
      COALESCE(SUM(conversion_count), 0) AS totalConversions
    FROM report_shares;
  `);

  const totalViews = toNumber(shareStats?.totalViews);
  const totalConversions = toNumber(shareStats?.totalConversions);
  const conversionRate = totalViews > 0 ? ((totalConversions / totalViews) * 100).toFixed(2) : '0.00';

  const report = `# Ops Daily Report (${today})

DB: \`${dbPath}\`

## Funnel Metrics
- Shared reports: ${toNumber(totals?.sharedReports)}
- Share views: ${totalViews}
- Share conversions: ${totalConversions}
- Share conversion rate: ${conversionRate}%

## Learning Activity
- Flashcards: ${toNumber(totals?.flashcards)}
- Sentence analyses: ${toNumber(totals?.sentenceAnalyses)}
- Readings: ${toNumber(totals?.readings)}
- Quizzes: ${toNumber(totals?.quizzes)}
- Reports: ${toNumber(totals?.reports)}
- Quiz average score: ${toNumber(quizStats?.averageScore).toFixed(2)}
- Quiz max score: ${toNumber(quizStats?.maxScore).toFixed(2)}

## Observations
- [ ] Error rate trend reviewed from structured logs.
- [ ] AI timeout/upstream failure patterns reviewed.
- [ ] Top 3 next-iteration priorities updated.
`;

  fs.writeFileSync(outputPath, report, 'utf8');
  console.log(`OPS_DAILY_REPORT_OK output=${outputPath}`);
}

try {
  main();
} catch (error) {
  console.error(`OPS_DAILY_REPORT_FAILED ${(error && error.message) || String(error)}`);
  process.exit(1);
}
