PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT,
  refresh_token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS flashcards (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('anonymous', 'user')),
  owner_id TEXT NOT NULL,
  word TEXT NOT NULL,
  phonetic TEXT,
  definition TEXT NOT NULL,
  etymology TEXT,
  example TEXT,
  example_translation TEXT,
  learning_status TEXT NOT NULL DEFAULT 'new',
  accuracy REAL NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  next_review_at TEXT,
  source_text_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (owner_type, owner_id, word)
);

CREATE TABLE IF NOT EXISTS flashcard_sessions (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('anonymous', 'user')),
  owner_id TEXT NOT NULL,
  extracted_count INTEGER NOT NULL DEFAULT 0,
  studied_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  accuracy REAL NOT NULL DEFAULT 0,
  due_count INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  ended_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sentence_analyses (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('anonymous', 'user')),
  owner_id TEXT NOT NULL,
  sentence_text TEXT NOT NULL,
  analysis_json TEXT NOT NULL,
  grammar_tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sentence_notes (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('anonymous', 'user')),
  owner_id TEXT NOT NULL,
  analysis_id TEXT,
  note_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (analysis_id) REFERENCES sentence_analyses(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reading_contents (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('anonymous', 'user')),
  owner_id TEXT NOT NULL,
  title TEXT,
  english_text TEXT NOT NULL,
  chinese_text TEXT NOT NULL,
  topic TEXT,
  difficulty TEXT,
  length TEXT,
  language TEXT,
  vocabulary_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reading_favorites (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('anonymous', 'user')),
  owner_id TEXT NOT NULL,
  reading_id TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  saved_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (owner_type, owner_id, reading_id),
  FOREIGN KEY (reading_id) REFERENCES reading_contents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('anonymous', 'user')),
  owner_id TEXT NOT NULL,
  quiz_type TEXT NOT NULL,
  difficulty TEXT,
  question_count INTEGER NOT NULL DEFAULT 0,
  timed_mode INTEGER NOT NULL DEFAULT 0,
  time_limit_minutes INTEGER,
  time_spent_seconds INTEGER,
  score REAL NOT NULL DEFAULT 0,
  accuracy REAL NOT NULL DEFAULT 0,
  reading_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (reading_id) REFERENCES reading_contents(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS quiz_attempt_questions (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  question_index INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  options_json TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  user_answer INTEGER,
  explanation TEXT,
  is_wrong INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (attempt_id, question_index),
  FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wrong_question_book (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('anonymous', 'user')),
  owner_id TEXT NOT NULL,
  quiz_type TEXT NOT NULL,
  question_fingerprint TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options_json TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  last_user_answer INTEGER,
  wrong_reason TEXT,
  repeat_count INTEGER NOT NULL DEFAULT 1,
  first_wrong_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_practiced_at TEXT NOT NULL DEFAULT (datetime('now')),
  difficulty TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (owner_type, owner_id, quiz_type, question_fingerprint)
);

CREATE TABLE IF NOT EXISTS learning_reports (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('anonymous', 'user')),
  owner_id TEXT NOT NULL,
  template_type TEXT NOT NULL,
  title TEXT NOT NULL,
  period TEXT,
  summary TEXT,
  report_json TEXT NOT NULL,
  share_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_last_seen ON sessions(user_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(user_id, revoked_at, expires_at);

CREATE INDEX IF NOT EXISTS idx_flashcards_owner_review ON flashcards(owner_type, owner_id, next_review_at ASC);
CREATE INDEX IF NOT EXISTS idx_flashcards_owner_status ON flashcards(owner_type, owner_id, learning_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_flashcard_sessions_owner_time ON flashcard_sessions(owner_type, owner_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sentence_owner_time ON sentence_analyses(owner_type, owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sentence_notes_owner_time ON sentence_notes(owner_type, owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reading_owner_time ON reading_contents(owner_type, owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_owner_topic ON reading_contents(owner_type, owner_id, topic, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_fav_owner_saved ON reading_favorites(owner_type, owner_id, saved_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_owner_time ON quiz_attempts(owner_type, owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_owner_type ON quiz_attempts(owner_type, owner_id, quiz_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_attempt ON quiz_attempt_questions(attempt_id, question_index);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_wrong ON quiz_attempt_questions(attempt_id, is_wrong);

CREATE INDEX IF NOT EXISTS idx_wrong_owner_type_repeat ON wrong_question_book(owner_type, owner_id, quiz_type, repeat_count DESC, last_practiced_at ASC);
CREATE INDEX IF NOT EXISTS idx_wrong_owner_recent ON wrong_question_book(owner_type, owner_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_owner_time ON learning_reports(owner_type, owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_owner_template ON learning_reports(owner_type, owner_id, template_type, created_at DESC);
