/**
 * 统计模块：PV、工具使用量、API 调用统计
 *
 * 存储后端：Cloudflare D1
 * - daily_stats: 每日聚合数据（homepage_pv, bazi_usage, liuyao_usage）
 * - api_stats: API 调用明细（通用设计，支持未来扩展）
 * - daily_unique_visitors: UV 去重表（基于 SHA256(ip)）
 */

import type { D1Database } from "@cloudflare/workers-types";

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

/** D1 绑定环境（供 Env 扩展使用） */
export interface StatsEnv {
  STATS_DB?: D1Database;
}

// ── 工具函数 ─────────────────────────────────────────────

/** 获取今天日期字符串 (YYYY-MM-DD, UTC) */
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 从请求中提取真实用户 IP
 *
 * cf-connecting-ip 是 Cloudflare 推荐使用的头部，
 * 已经过滤 CDN 内部 IP，返回终端用户的真实 IP。
 * @see https://developers.cloudflare.com/fundamentals/get-started/http/request-headers/
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

// ── 核心操作 ─────────────────────────────────────────────

/**
 * 记录页面访问（UV 去重）
 *
 * 逻辑：
 * 1. 尝试插入 UV 去重表（UNIQUE 约束保证同 IP 同天同页面只算一次）
 * 2. 如果插入成功（新访客），更新 daily_stats 对应计数 +1
 *
 * 使用事务保证原子性。
 */
export async function recordPageView(db: D1Database, request: Request, pageType: PageType): Promise<void> {
  const date = todayStr();
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
    // 步骤 1：尝试插入 UV 表
    const uvResult = await db
      .prepare(
        `INSERT INTO daily_unique_visitors (date, ip_hash, page_type) VALUES (?, ?, ?)`,
      )
      .bind(date, ipHash, pageType)
      .run();

    // 步骤 2：如果是新访客（插入了行），更新计数
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
 * 记录 API 调用（不去重，每次请求都 +1）
 *
 * @param apiPath API 路径，如 '/api/bazi/interpret'
 */
export async function recordApiCall(db: D1Database, apiPath: string): Promise<void> {
  const date = todayStr();

  try {
    await db
      .prepare(
        `INSERT INTO api_stats (date, api_path, call_count) VALUES (?, ?, 1)
         ON CONFLICT(date, api_path) DO UPDATE SET call_count = call_count + 1`,
      )
      .bind(date, apiPath)
      .run();
  } catch {
    /* 忽略统计错误，不影响主流程 */
  }
}

/**
 * 查询统计数据（用于首页渲染）
 *
 * 返回：
 * - 总计数（所有时间累计）
 * - 今日计数
 * - API 调用明细（每个路径的总计和今日）
 *
 * 注意：如果 D1 表尚未创建（首次部署或测试环境），返回零值统计而非抛错。
 */
export async function getStats(db: D1Database): Promise<StatsData> {
  const today = todayStr();

  // 封装查询：表不存在时返回 null 而非抛错
  const safeFirst = async <T>(stmt: D1PreparedStatement): Promise<T | null> => {
    try {
      return await stmt.first<T>();
    } catch (e) {
      // 表不存在等错误返回 null
      if (e instanceof Error && e.message.includes("no such table")) return null;
      throw e;
    }
  };

  const safeAll = async <T>(stmt: D1PreparedStatement): Promise<{ results: T[] }> => {
    try {
      return await stmt.all<T>();
    } catch (e) {
      if (e instanceof Error && e.message.includes("no such table")) return { results: [] };
      throw e;
    }
  };

  // 查询总计（所有时间的总和）
  const totalResult = await safeFirst<{ homepage_pv: number; bazi_usage: number; liuyao_usage: number }>(
    db.prepare(
      `SELECT
         COALESCE(SUM(homepage_pv), 0) as homepage_pv,
         COALESCE(SUM(bazi_usage), 0) as bazi_usage,
         COALESCE(SUM(liuyao_usage), 0) as liuyao_usage
       FROM daily_stats`,
    ),
  );

  // 查询今日数据
  const todayResult = await safeFirst<{ homepage_pv: number; bazi_usage: number; liuyao_usage: number }>(
    db.prepare(
      `SELECT
         COALESCE(homepage_pv, 0) as homepage_pv,
         COALESCE(bazi_usage, 0) as bazi_usage,
         COALESCE(liuyao_usage, 0) as liuyao_usage
       FROM daily_stats WHERE date = ?`,
    ).bind(today),
  );

  // 查询 API 调用统计（每个路径的总计和今日）
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
