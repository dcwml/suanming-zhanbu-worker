-- 0002_page_views.sql
-- 统计升级：按「天 × 页面路径」记录全站页面 PV + api_stats 增加 status 维度

-- 页面 PV 表（全局中间件埋点，覆盖所有 HTML 页面，含 daily/weekly/monthly/tuiyan 单篇与归档）
CREATE TABLE IF NOT EXISTS page_views (
  date TEXT NOT NULL,               -- 'YYYY-MM-DD'（Asia/Shanghai）
  path TEXT NOT NULL,               -- 规范路径（尾斜杠，无 query），如 '/zh/daily/2026-09-16/'
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, path)
);

CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);

-- api_stats 重建：UNIQUE 键加入 status（HTTP 状态码），可区分成功/限流/报错次数
CREATE TABLE IF NOT EXISTS api_stats_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                -- 'YYYY-MM-DD'（Asia/Shanghai）
  api_path TEXT NOT NULL,            -- '/api/bazi/interpret'
  status TEXT NOT NULL DEFAULT 'ok', -- HTTP 状态码字符串，如 '200' / '401' / '429'
  call_count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(date, api_path, status)
);

INSERT INTO api_stats_v2 (date, api_path, status, call_count, created_at)
  SELECT date, api_path, 'ok', call_count, created_at FROM api_stats;

DROP TABLE api_stats;
ALTER TABLE api_stats_v2 RENAME TO api_stats;

-- 重建索引（表重建后原索引随 DROP 一并消失）
CREATE INDEX IF NOT EXISTS idx_api_stats_date ON api_stats(date);
CREATE INDEX IF NOT EXISTS idx_api_stats_path ON api_stats(api_path);
