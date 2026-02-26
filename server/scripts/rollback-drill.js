#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `${cmd} failed`).trim());
  }
}

function query(sqliteBinary, dbPath, query) {
  const result = spawnSync(sqliteBinary, [dbPath, query], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'sqlite query failed').trim());
  }
  return (result.stdout || '').trim();
}

function main() {
  const start = Date.now();
  const serverRoot = path.resolve(__dirname, '..');
  const sqliteBinary = process.env.SQLITE_BIN || 'sqlite3';
  const dbPath = process.env.SQLITE_DB_PATH || `/tmp/english-learning-rollback-${randomUUID()}.db`;
  const backupPath = `${dbPath}.bak`;
  const markerKeep = `keep-${randomUUID()}`;
  const markerMutate = `mutate-${randomUUID()}`;

  run('npm', ['run', 'db:migrate'], {
    cwd: serverRoot,
    env: { ...process.env, SQLITE_DB_PATH: dbPath },
  });

  query(sqliteBinary, dbPath, `
    INSERT INTO report_shares (id, owner_type, owner_id, title, summary, report_json, created_at, updated_at)
    VALUES ('${markerKeep}', 'anonymous', 'rollback-owner', 'keep', 'keep', '{"title":"keep"}', datetime('now'), datetime('now'));
  `);

  fs.copyFileSync(dbPath, backupPath);

  query(sqliteBinary, dbPath, `
    INSERT INTO report_shares (id, owner_type, owner_id, title, summary, report_json, created_at, updated_at)
    VALUES ('${markerMutate}', 'anonymous', 'rollback-owner', 'mutate', 'mutate', '{"title":"mutate"}', datetime('now'), datetime('now'));
  `);

  fs.copyFileSync(backupPath, dbPath);

  const keepCount = Number(query(sqliteBinary, dbPath, `SELECT COUNT(*) FROM report_shares WHERE id='${markerKeep}';`) || 0);
  const mutateCount = Number(query(sqliteBinary, dbPath, `SELECT COUNT(*) FROM report_shares WHERE id='${markerMutate}';`) || 0);

  if (keepCount !== 1) {
    throw new Error('rollback verification failed: keep marker missing after restore');
  }
  if (mutateCount !== 0) {
    throw new Error('rollback verification failed: mutate marker still exists after restore');
  }

  const durationMs = Date.now() - start;
  console.log(`ROLLBACK_DRILL_OK db=${dbPath} durationMs=${durationMs}`);
}

try {
  main();
} catch (error) {
  console.error(`ROLLBACK_DRILL_FAILED ${(error && error.message) || String(error)}`);
  process.exit(1);
}
