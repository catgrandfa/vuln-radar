-- vuln-radar 第四层：D1 表结构（幂等，可重复执行）
CREATE TABLE IF NOT EXISTS bundles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  config TEXT NOT NULL,            -- JSON：名称/语言/关键词/阈值/渠道
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS daily_vulns (   -- 每天 GitHub Actions ingest 一次
  date TEXT PRIMARY KEY,             -- YYYY-MM-DD
  nvd TEXT NOT NULL,                 -- JSON 数组
  kev TEXT NOT NULL,                 -- JSON 数组
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deliveries (
  bundle_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL,              -- pushed / skipped_empty / error
  detail TEXT,                       -- 命中条数 / 错误摘要（不存渠道密钥明文）
  PRIMARY KEY (bundle_id, date)
);

CREATE INDEX IF NOT EXISTS idx_bundles_active ON bundles(active);
