#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const serverRoot = path.resolve(__dirname, '..');
const migrationsDir = path.join(serverRoot, 'migrations');
const dbPath = resolveDbPath();
const sqliteBinary = resolveSqliteBinary();

function resolveDbPath() {
  const configured = (process.env.SQLITE_DB_PATH || '').trim();
  if (!configured) {
    return path.join(serverRoot, 'data', 'english-learning.db');
  }
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
}

function ensureSqliteAvailable() {
  if (!canExecuteBinary(sqliteBinary)) {
    throw new Error('sqlite3 命令不可用，请先安装 sqlite3 CLI');
  }
}

function canExecuteBinary(binaryPath) {
  const probe = spawnSync(binaryPath, ['--version'], { encoding: 'utf8' });
  return probe.status === 0;
}

function resolveSqliteBinary() {
  const configured = (process.env.SQLITE_BIN || '').trim();
  if (configured) {
    return configured;
  }

  const candidates = [
    'sqlite3',
    path.join(process.env.HOME || '', 'miniconda3', 'bin', 'sqlite3'),
    '/usr/local/bin/sqlite3',
    '/usr/bin/sqlite3',
  ];

  for (const candidate of candidates) {
    if (candidate && canExecuteBinary(candidate)) {
      return candidate;
    }
  }

  return 'sqlite3';
}

function runSql(script) {
  const combined = `PRAGMA foreign_keys=ON;\n${script}`;
  const result = spawnSync(sqliteBinary, [dbPath, combined], { encoding: 'utf8' });

  if (result.status !== 0) {
    if (result.error) {
      throw result.error;
    }
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(detail || 'sqlite3 执行失败');
  }

  return (result.stdout || '').trim();
}

function sqlLiteral(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function checksumOf(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function ensureMetadataTable() {
  runSql(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
}

function getAppliedChecksum(name) {
  const query = `SELECT checksum FROM schema_migrations WHERE name = ${sqlLiteral(name)} LIMIT 1;`;
  const out = runSql(query);
  return out || null;
}

function applyMigration(name, checksum, sqlContent) {
  const statement = [
    'BEGIN;',
    sqlContent,
    `INSERT INTO schema_migrations (name, checksum, applied_at) VALUES (${sqlLiteral(name)}, ${sqlLiteral(checksum)}, datetime('now'));`,
    'COMMIT;',
  ].join('\n');

  runSql(statement);
}

function listMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
}

function main() {
  ensureSqliteAvailable();

  const dbDir = path.dirname(dbPath);
  fs.mkdirSync(dbDir, { recursive: true });

  const files = listMigrationFiles();
  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  ensureMetadataTable();

  let appliedCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const checksum = checksumOf(content);
    const existingChecksum = getAppliedChecksum(file);

    if (existingChecksum) {
      if (existingChecksum !== checksum) {
        throw new Error(`迁移文件校验失败: ${file} 已执行但 checksum 不一致`);
      }
      skippedCount += 1;
      console.log(`skip ${file}`);
      continue;
    }

    applyMigration(file, checksum, content);
    appliedCount += 1;
    console.log(`apply ${file}`);
  }

  console.log(`done: applied=${appliedCount}, skipped=${skippedCount}, db=${dbPath}`);
}

try {
  main();
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`migration failed: ${message}`);
  process.exit(1);
}
