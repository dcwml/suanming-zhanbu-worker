/**
 * 统计模块：PV、工具使用量、API 调用统计
 *
 * 存储后端：Cloudflare D1
 * - page_views: 全站页面 PV（天 × 规范路径，全局中间件埋点）
 * - daily_stats: 每日聚合数据（homepage_pv, bazi_usage, liuyao_usage，供首页公开展示）
 * - api_stats: API 调用统计（天 × 路径 × HTTP 状态码，全局中间件埋点）
 * - daily_unique_visitors: UV 去重表（基于 SHA256(ip)，仅首页/八字/六爻三页）
 *
 * 埋点位置：src/index.ts 全局中间件（爬虫 UA 过滤 + waitUntil 异步写）。
 * 日期口径统一为 Asia/Shanghai（与 /api/almanac 一致）。
 */

import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types";

// ── 类型定义 ─────────────────────────────────────────────

/** 页面类型（对应 daily_stats 的列名） */
export type PageType = "homepage" | "bazi" | "liuyao";

/** 首页展示用的统计数据 */
export interface StatsData {
  /** 总 PV / 使用次数（所有时间累计） */
  total: {
    homepage_pv: number;
    bazi_usage: number;
    liuyao_usage: number;
  };
  /** 今日 PV / 使用次数 */
  today: {
    homepage_pv: number;
    bazi_usage: number;
    liuyao_usage: number;
  };
  /** API 调用统计（总计 + 今日） */
  api_calls: Array<{
    api_path: string;
    total_calls: number;
    today_calls: number;
  }>;
}

/** /api/stats/overview 响应数据 */
export interface StatsOverview {
  /** 统计日期基准（Asia/Shanghai 今天） */
  date: string;
  pv: { today: number; yesterday: number; last7: number; last30: number; total: number };
  uv: { today: number };
  api: { total: number; today: number };
}

/** /api/stats/pages 响应数据 */
export interface PageStats {
  days: number;
  since: string;
  paths: Array<{ path: string; total_views: number; recent_views: number }>;
  daily: Array<{ date: string; views: number }>;
}

/** /api/stats/apis 响应数据 */
export interface ApiStats {
  endpoints: Array<{
    api_path: string;
    total_calls: number;
    today_calls: number;
    by_status: Record<string, number>;
  }>;
}

/** D1 绑定环境（供 Env 扩展使用） */
export interface StatsEnv {
  STATS_DB?: D1Database;
}

// ── 时间与 UA 工具 ───────────────────────────────────────

/** 上海时区今天的 ISO 日期（Workers 的 new Date() 是 UTC，不换算的话早 8 点前会差一天） */
export function shanghaiTodayStr(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
}

/** YYYY-MM-DD 日期加减天数（UTC 语义下纯日历运算，与年月日字符串互转安全） */
function addDaysStr(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

/** 常见爬虫/脚本 UA 特征；命中不计入统计（搜索引擎会把每个页面刷出虚高数字） */
const BOT_UA_RE = /bot|crawl|spider|slurp|curl|wget|python|okhttp|java|headless|feedfetcher|monitor|healthcheck/i;

/** 爬虫 UA 判定：无 UA 的请求视为脚本，同样不计 */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  return BOT_UA_RE.test(userAgent);
}

/**
 * 从请求中提取真实用户 IP
 *
 * cf-connecting-ip 是 Cloudflare 推荐使用的头部，
 * 已经过滤 CDN 内部 IP，返回终端用户的真实 IP。
 * @see https://developers.cloudflare.com/fundamentals/get-started/http-request-headers/
 */
export function getRealIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "unknown";
}

/** 计算 IP 的 SHA256 哈希（保护隐私，不可逆） */
async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── 写入（埋点） ─────────────────────────────────────────

/**
 * 记录页面访问（UV 去重，仅供首页/八字/六爻三页的公开展示指标）
 *
 * 逻辑：
 * 1. 尝试插入 UV 去重表（UNIQUE 约束保证同 IP 同天同页面只算一次）
 * 2. 如果插入成功（新访客），更新 daily_stats 对应计数 +1
 */
export async function recordPageView(db: D1Database, request: Request, pageType: PageType): Promise<void> {
  const date = shanghaiTodayStr();
  const ip = getRealIp(request);
  const ipHash = await hashIp(ip);

  // 列名白名单（防止 SQL 注入）
  const columnMap: Record<PageType, string> = {
    homepage: "homepage_pv",
    bazi: "bazi_usage",
    liuyao: "liuyao_usage",
  };
  const column = columnMap[pageType];

  try {
    const uvResult = await db
      .prepare(`INSERT INTO daily_unique_visitors (date, ip_hash, page_type) VALUES (?, ?, ?)`)
      .bind(date, ipHash, pageType)
      .run();

    if (uvResult.meta.changes > 0) {
      await db
        .prepare(
          `INSERT INTO daily_stats (date, ${column}) VALUES (?, 1)
           ON CONFLICT(date) DO UPDATE SET ${column} = ${column} + 1`,
        )
        .bind(date)
        .run();
    }
  } catch {
    /* 忽略统计错误，不影响主流程（如 D1 未绑定、约束冲突等） */
  }
}

/**
 * 记录全站页面 PV（天 × 路径，不去重）
 *
 * @param path 规范路径（尾斜杠、无 query），如 '/zh/daily/2026-09-16/'
 */
export async function recordPagePathView(db: D1Database, path: string): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO page_views (date, path, views) VALUES (?, ?, 1)
         ON CONFLICT(date, path) DO UPDATE SET views = views + 1`,
      )
      .bind(shanghaiTodayStr(), path)
      .run();
  } catch {
    /* 忽略统计错误，不影响主流程 */
  }
}

/**
 * 记录 API 调用（天 × 路径 × HTTP 状态码，不去重）
 *
 * @param status HTTP 状态码字符串，如 '200' / '429'；历史数据（0001 迁移前）为 'ok'
 */
export async function recordApiCall(db: D1Database, apiPath: string, status: string): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO api_stats (date, api_path, status, call_count) VALUES (?, ?, ?, 1)
         ON CONFLICT(date, api_path, status) DO UPDATE SET call_count = call_count + 1`,
      )
      .bind(shanghaiTodayStr(), apiPath, status)
      .run();
  } catch {
    /* 忽略统计错误，不影响主流程 */
  }
}

// ── 查询 ─────────────────────────────────────────────────

/** 表不存在（首次部署未跑 migration）等错误降级为空值，不抛错 */
function safeFirst<T>(stmt: D1PreparedStatement): Promise<T | null> {
  return stmt.first<T>().catch((e: unknown) => {
    if (e instanceof Error && e.message.includes("no such table")) return null;
    throw e;
  }) as Promise<T | null>;
}

function safeAll<T>(stmt: D1PreparedStatement): Promise<{ results: T[] }> {
  return stmt.all<T>().catch((e: unknown) => {
    if (e instanceof Error && e.message.includes("no such table")) return { results: [] };
    throw e;
  }) as Promise<{ results: T[] }>;
}

/**
 * 查询统计数据（用于首页渲染）
 *
 * 注意：如果 D1 表尚未创建（首次部署或测试环境），返回零值统计而非抛错。
 */
export async function getStats(db: D1Database): Promise<StatsData> {
  const today = shanghaiTodayStr();

  const totalResult = await safeFirst<{ homepage_pv: number; bazi_usage: number; liuyao_usage: number }>(
    db.prepare(
      `SELECT
         COALESCE(SUM(homepage_pv), 0) as homepage_pv,
         COALESCE(SUM(bazi_usage), 0) as bazi_usage,
         COALESCE(SUM(liuyao_usage), 0) as liuyao_usage
       FROM daily_stats`,
    ),
  );

  const todayResult = await safeFirst<{ homepage_pv: number; bazi_usage: number; liuyao_usage: number }>(
    db.prepare(
      `SELECT
         COALESCE(homepage_pv, 0) as homepage_pv,
         COALESCE(bazi_usage, 0) as bazi_usage,
         COALESCE(liuyao_usage, 0) as liuyao_usage
       FROM daily_stats WHERE date = ?`,
    ).bind(today),
  );

  const apiResult = await safeAll<{ api_path: string; total_calls: number; today_calls: number }>(
    db.prepare(
      `SELECT
         api_path,
         SUM(call_count) as total_calls,
         SUM(CASE WHEN date = ? THEN call_count ELSE 0 END) as today_calls
       FROM api_stats
       GROUP BY api_path
       ORDER BY total_calls DESC`,
    ).bind(today),
  );

  return {
    total: {
      homepage_pv: totalResult?.homepage_pv ?? 0,
      bazi_usage: totalResult?.bazi_usage ?? 0,
      liuyao_usage: totalResult?.liuyao_usage ?? 0,
    },
    today: {
      homepage_pv: todayResult?.homepage_pv ?? 0,
      bazi_usage: todayResult?.bazi_usage ?? 0,
      liuyao_usage: todayResult?.liuyao_usage ?? 0,
    },
    api_calls: apiResult.results.map((row) => ({
      api_path: row.api_path,
      total_calls: row.total_calls,
      today_calls: row.today_calls,
    })),
  };
}

/** 自用统计总览（/api/stats/overview） */
export async function getOverview(db: D1Database): Promise<StatsOverview> {
  const today = shanghaiTodayStr();
  const yesterday = addDaysStr(today, -1);
  const last7Start = addDaysStr(today, -6);
  const last30Start = addDaysStr(today, -29);

  const pv = await safeFirst<{
    today: number;
    yesterday: number;
    last7: number;
    last30: number;
    total: number;
  }>(
    db.prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN date = ? THEN views END), 0) as today,
         COALESCE(SUM(CASE WHEN date = ? THEN views END), 0) as yesterday,
         COALESCE(SUM(CASE WHEN date >= ? THEN views END), 0) as last7,
         COALESCE(SUM(CASE WHEN date >= ? THEN views END), 0) as last30,
         COALESCE(SUM(views), 0) as total
       FROM page_views`,
    ).bind(today, yesterday, last7Start, last30Start),
  );

  const uv = await safeFirst<{ uv: number }>(
    db.prepare(`SELECT COUNT(DISTINCT ip_hash) as uv FROM daily_unique_visitors WHERE date = ?`).bind(today),
  );

  const api = await safeFirst<{ total: number; today: number }>(
    db.prepare(
      `SELECT
         COALESCE(SUM(call_count), 0) as total,
         COALESCE(SUM(CASE WHEN date = ? THEN call_count END), 0) as today
       FROM api_stats`,
    ).bind(today),
  );

  return {
    date: today,
    pv: {
      today: pv?.today ?? 0,
      yesterday: pv?.yesterday ?? 0,
      last7: pv?.last7 ?? 0,
      last30: pv?.last30 ?? 0,
      total: pv?.total ?? 0,
    },
    uv: { today: uv?.uv ?? 0 },
    api: { total: api?.total ?? 0, today: api?.today ?? 0 },
  };
}

/** 自用页面 PV 明细（/api/stats/pages）：每路径总量/近期量 + 全站按日序列 */
export async function getPageStats(db: D1Database, days: number): Promise<PageStats> {
  const today = shanghaiTodayStr();
  const since = addDaysStr(today, -(days - 1));

  const paths = await safeAll<{ path: string; total_views: number; recent_views: number }>(
    db.prepare(
      `SELECT
         path,
         SUM(views) as total_views,
         SUM(CASE WHEN date >= ? THEN views ELSE 0 END) as recent_views
       FROM page_views
       GROUP BY path
       ORDER BY recent_views DESC, total_views DESC`,
    ).bind(since),
  );

  const daily = await safeAll<{ date: string; views: number }>(
    db.prepare(
      `SELECT date, SUM(views) as views
       FROM page_views
       WHERE date >= ?
       GROUP BY date
       ORDER BY date DESC`,
    ).bind(since),
  );

  return {
    days,
    since,
    paths: paths.results,
    daily: daily.results,
  };
}

/** 自用 API 调用明细（/api/stats/apis）：每端点按状态码分布（历史 'ok' 归并为 '200'） */
export async function getApiCallStats(db: D1Database): Promise<ApiStats> {
  const today = shanghaiTodayStr();

  const rows = await safeAll<{
    api_path: string;
    status: string;
    calls: number;
    today_calls: number;
  }>(
    db.prepare(
      `SELECT
         api_path,
         status,
         SUM(call_count) as calls,
         SUM(CASE WHEN date = ? THEN call_count ELSE 0 END) as today_calls
       FROM api_stats
       GROUP BY api_path, status
       ORDER BY api_path, status`,
    ).bind(today),
  );

  const map = new Map<string, ApiStats["endpoints"][number]>();
  for (const row of rows.results) {
    let entry = map.get(row.api_path);
    if (!entry) {
      entry = { api_path: row.api_path, total_calls: 0, today_calls: 0, by_status: {} };
      map.set(row.api_path, entry);
    }
    const status = row.status === "ok" ? "200" : row.status;
    entry.total_calls += row.calls;
    entry.today_calls += row.today_calls;
    entry.by_status[status] = (entry.by_status[status] ?? 0) + row.calls;
  }

  return { endpoints: [...map.values()].sort((a, b) => b.total_calls - a.total_calls) };
}
