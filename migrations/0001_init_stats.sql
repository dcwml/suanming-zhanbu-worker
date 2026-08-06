-- 0001_init_stats.sql
-- 统计模块：PV、工具使用量、API 调用次数

-- 每日聚合统计表（核心指标）
CREATE TABLE IF NOT EXISTS daily_stats (
  date TEXT PRIMARY KEY,            -- '2026-08-05' (UTC 日期)
  homepage_pv INTEGER NOT NULL DEFAULT 0,   -- 首页 UV（去重后）
  bazi_usage INTEGER NOT NULL DEFAULT 0,    -- 八字工具使用次数
  liuyao_usage INTEGER NOT NULL DEFAULT 0  -- 六爻工具使用次数
);

-- API 调用统计表（通用设计，支持未来扩展）
CREATE TABLE IF NOT EXISTS api_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                -- '2026-08-05'
  api_path TEXT NOT NULL,            -- '/api/bazi/interpret'
  call_count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(date, api_path)
);

-- UV 去重表（基于真实 IP 的 SHA256 哈希）
CREATE TABLE IF NOT EXISTS daily_unique_visitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                -- '2026-08-05'
  ip_hash TEXT NOT NULL,             -- SHA256(真实 IP)
  page_type TEXT NOT NULL,           -- 'homepage' | 'bazi' | 'liuyao'
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(date, ip_hash, page_type)
);

-- 索引：加速按日期查询
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_api_stats_date ON api_stats(date);
CREATE INDEX IF NOT EXISTS idx_api_stats_path ON api_stats(api_path);
CREATE INDEX IF NOT EXISTS idx_uv_date ON daily_unique_visitors(date);
