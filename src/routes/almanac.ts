import type { Hono } from "hono";
import { compute } from "../almanac/compute";
import { authProblem, type SiteAuthEnv } from "../auth";
import { addDays, buildMonth, buildWeek } from "../fortune/skeleton";
import { recordApiCall } from "../stats";
import type { StatsEnv } from "../stats";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

function err(code: string, message: string) {
  return { ok: false as const, error: { code, message } };
}

/** 上海时区今天的 ISO 日期（Workers 的 new Date() 是 UTC，不换算的话早 8 点前会差一天） */
function shanghaiToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
}

/** 上海时区本周周一 */
function shanghaiMonday(): string {
  const today = shanghaiToday();
  const [y, m, d] = today.split("-").map(Number);
  const daysSinceMonday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return addDays(today, -daysSinceMonday);
}

/** 注册历法数据路由（在 api 子应用内，basePath 已是 /api） */
export function registerAlmanacRoutes(api: Hono<{ Bindings: SiteAuthEnv & StatsEnv }>): void {
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

  api.get("/fortune/week", async (c) => {
    const db = c.env?.STATS_DB;
    if (db) {
      recordApiCall(db, "/api/fortune/week").catch(() => {});
    }

    const denied = authProblem(c.env, c.req.header("x-api-key"));
    if (denied) return c.json(err(denied.code, denied.message), denied.status);

    const raw = c.req.query("monday");
    if (raw !== undefined && !DATE_RE.test(raw)) {
      return c.json(err("invalid_request", `Invalid date: ${raw.slice(0, 128)} (expected YYYY-MM-DD)`), 400);
    }
    try {
      return c.json({ ok: true, data: buildWeek(raw ?? shanghaiMonday()) });
    } catch (e) {
      // buildWeek 对非周一参数抛错，message 含该周正确周一
      return c.json(err("invalid_request", e instanceof Error ? e.message : "Invalid monday date."), 400);
    }
  });

  api.get("/fortune/month", async (c) => {
    const db = c.env?.STATS_DB;
    if (db) {
      recordApiCall(db, "/api/fortune/month").catch(() => {});
    }

    const denied = authProblem(c.env, c.req.header("x-api-key"));
    if (denied) return c.json(err(denied.code, denied.message), denied.status);

    const raw = c.req.query("month");
    if (raw !== undefined && !MONTH_RE.test(raw)) {
      return c.json(err("invalid_request", `Invalid month: ${raw.slice(0, 128)} (expected YYYY-MM)`), 400);
    }
    try {
      return c.json({ ok: true, data: buildMonth(raw ?? shanghaiToday().slice(0, 7)) });
    } catch (e) {
      return c.json(err("invalid_request", e instanceof Error ? e.message : "Invalid month."), 400);
    }
  });
}
