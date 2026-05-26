import test from 'node:test';
import assert from 'node:assert/strict';

import { migrateTestDatabase, querySqliteJson } from '../helpers/db.ts';

test('database migration creates core learning and sharing tables', () => {
  const dbPath = migrateTestDatabase('migration-core');
  const rows = querySqliteJson<{ name: string }>(dbPath, `
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name IN (
        'flashcards',
        'sentence_analyses',
        'reading_contents',
        'quiz_attempts',
        'learning_reports',
        'report_shares',
        'schema_migrations'
      )
    ORDER BY name;
  `);

  const tableNames = rows.map(row => row.name);
  assert.deepEqual(tableNames, [
    'flashcards',
    'learning_reports',
    'quiz_attempts',
    'reading_contents',
    'report_shares',
    'schema_migrations',
    'sentence_analyses',
  ]);
});

test('database migration records every applied migration file', () => {
  const dbPath = migrateTestDatabase('migration-metadata');
  const rows = querySqliteJson<{ count: number }>(dbPath, 'SELECT COUNT(*) AS count FROM schema_migrations;');

  assert.equal(rows[0]?.count, 3);
});

