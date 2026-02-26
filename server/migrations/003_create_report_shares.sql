CREATE TABLE IF NOT EXISTS report_shares (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  report_json TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  conversion_count INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_view_at DATETIME,
  last_conversion_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_report_shares_created_at
  ON report_shares(created_at DESC);
