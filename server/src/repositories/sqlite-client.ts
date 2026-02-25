import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

function canExecuteBinary(binaryPath: string): boolean {
  const probe = spawnSync(binaryPath, ['--version'], { encoding: 'utf8' });
  return probe.status === 0;
}

function resolveSqliteBinary(): string {
  const configured = (process.env.SQLITE_BIN || '').trim();
  if (configured) return configured;

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

function resolveDbPath(): string {
  const serverRoot = path.resolve(__dirname, '..', '..');
  const configured = (process.env.SQLITE_DB_PATH || '').trim();

  if (!configured) {
    return path.join(serverRoot, 'data', 'english-learning.db');
  }

  return path.isAbsolute(configured)
    ? configured
    : path.resolve(serverRoot, configured);
}

export class SqliteClient {
  private readonly dbPath: string;
  private readonly sqliteBinary: string;

  constructor() {
    this.dbPath = resolveDbPath();
    this.sqliteBinary = resolveSqliteBinary();
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
  }

  execute(script: string): string {
    const combined = `PRAGMA foreign_keys=ON;\n${script}`;
    const result = spawnSync(this.sqliteBinary, [this.dbPath, combined], { encoding: 'utf8' });

    if (result.status !== 0) {
      const detail = (result.stderr || result.stdout || '').trim();
      throw new Error(detail || 'sqlite3 执行失败');
    }

    return (result.stdout || '').trim();
  }

  queryJson<T>(query: string): T[] {
    const result = spawnSync(this.sqliteBinary, ['-json', this.dbPath, query], { encoding: 'utf8' });

    if (result.status !== 0) {
      const detail = (result.stderr || result.stdout || '').trim();
      throw new Error(detail || 'sqlite3 查询失败');
    }

    const text = (result.stdout || '').trim();
    if (!text) return [];

    try {
      return JSON.parse(text) as T[];
    } catch {
      throw new Error('sqlite3 查询结果 JSON 解析失败');
    }
  }

  getDatabasePath(): string {
    return this.dbPath;
  }

  static sqlLiteral(value: unknown): string {
    if (value === undefined || value === null) return 'NULL';

    if (typeof value === 'number') {
      return Number.isFinite(value) ? String(value) : 'NULL';
    }

    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }

    return `'${String(value).replace(/'/g, "''")}'`;
  }
}
