CREATE TABLE IF NOT EXISTS article_likes (
  slug TEXT NOT NULL,
  voter_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (slug, voter_id)
);
