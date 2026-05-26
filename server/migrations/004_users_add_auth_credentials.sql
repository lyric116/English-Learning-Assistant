ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN password_salt TEXT;
ALTER TABLE users ADD COLUMN password_algorithm TEXT NOT NULL DEFAULT 'scrypt';
ALTER TABLE users ADD COLUMN last_login_at TEXT;

CREATE INDEX IF NOT EXISTS idx_users_email_status
  ON users(email, status);
