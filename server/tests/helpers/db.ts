import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

export function createTempDbPath(prefix: string): string {
  return `/tmp/english-learning-${prefix}-${randomUUID()}.db`;
}

export function migrateTestDatabase(prefix: string): string {
  const dbPath = createTempDbPath(prefix);
  const result = spawnSync('npm', ['run', 'db:migrate'], {
    cwd: process.cwd(),
    env: { ...process.env, SQLITE_DB_PATH: dbPath },
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'database migration failed').trim());
  }

  return dbPath;
}

export function querySqliteJson<T>(dbPath: string, query: string): T[] {
  const sqliteBinary = process.env.SQLITE_BIN || 'sqlite3';
  const result = spawnSync(sqliteBinary, ['-json', dbPath, query], { encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'sqlite query failed').trim());
  }

  const text = (result.stdout || '').trim();
  return text ? JSON.parse(text) as T[] : [];
}

