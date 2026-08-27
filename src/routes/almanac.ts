import type { Hono } from "hono";
import { compute } from "../almanac/compute";
import { recordApiCall } from "../stats";
import type { StatsEnv } from "../stats";

/** 历法数据 API 环境变量（鉴权 secret：生产 wrangler secret put / 本地 .dev.vars） */
export interface AlmanacEnv {
  ALMANAC_API_KEY?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

function err(code: string, message: string) {
  return { ok: false as const, error: { code, message } };
}

/** 鉴权：未配置 secret → 503（防忘配裸奔）；key 缺失/不匹配 → 401 */
function authProblem(
  env: AlmanacEnv | undefined,
  apiKeyHeader: string | undefined,
): { code: string; message: string; status: 503 | 401 } | null {
  const expected = env?.ALMANAC_API_KEY;
  if (!expected) return { code: "not_configured", message: "Almanac API is not configured.", status: 503 };
  if (apiKeyHeader !== expected) return { code: "unauthorized", message: "Invalid or missing x-api-key header.", status: 401 };
  return null;
}

/** 上海时区今天的 ISO 日期（Workers 的 new Date() 是 UTC，不换算的话早 8 点前会差一天） */
function shanghaiToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
}

/** 注册历法数据路由（在 api 子应用内，basePath 已是 /api） */
export function registerAlmanacRoutes(api: Hono<{ Bindings: AlmanacEnv & StatsEnv }>): void {
  api.get("/almanac", async (c) => {
    // 0. 记录 API 调用（异步，不阻塞主流程；与 zeji 等现有路由一致）
    const db = c.env?.STATS_DB;
    if (db) {
      recordApiCall(db, "/api/almanac").catch(() => {});
    }

    // 1. 鉴权
    const denied = authProblem(c.env, c.req.header("x-api-key"));
    if (denied) return c.json(err(denied.code, denied.message), denied.status);

    // 2. 参数校验（回显截断，同 404 兜底惯例）
    const raw = c.req.query("date");
    if (raw !== undefined && !DATE_RE.test(raw)) {
      return c.json(err("invalid_request", `Invalid date: ${raw.slice(0, 128)} (expected YYYY-MM-DD)`), 400);
    }

    // 3. 计算（与 npm run almanac 同一核心）
    return c.json({ ok: true, data: compute(raw ?? shanghaiToday()) });
  });
}
