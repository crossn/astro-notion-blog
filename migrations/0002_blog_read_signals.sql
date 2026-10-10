CREATE TABLE IF NOT EXISTS blog_read_signals (
  slug TEXT PRIMARY KEY,
  views INTEGER NOT NULL CHECK (views >= 0),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  generated_at TEXT NOT NULL
);
