import type { Hono } from "hono";
import { authProblem, type SiteAuthEnv } from "../auth";
import { getApiCallStats, getOverview, getPageStats, type StatsEnv } from "../stats";

function err(code: string, message: string) {
  return { ok: false as const, error: { code, message } };
}

/** 注册统计查询路由（自用端点：SITE_API_KEY + x-api-key；在 api 子应用内，basePath 已是 /api） */
export function registerStatsRoutes(api: Hono<{ Bindings: SiteAuthEnv & StatsEnv }>): void {
  api.get("/stats/overview", async (c) => {
    const denied = authProblem(c.env, c.req.header("x-api-key"));
    if (denied) return c.json(err(denied.code, denied.message), denied.status);

    const db = c.env?.STATS_DB;
    if (!db) return c.json(err("not_configured", "Stats database is not bound."), 503);

    return c.json({ ok: true, data: await getOverview(db) });
  });

  api.get("/stats/pages", async (c) => {
    const denied = authProblem(c.env, c.req.header("x-api-key"));
    if (denied) return c.json(err(denied.code, denied.message), denied.status);

    const db = c.env?.STATS_DB;
    if (!db) return c.json(err("not_configured", "Stats database is not bound."), 503);

    // 近 N 天窗口（1..365，默认 30）
    const raw = c.req.query("days");
    let days = 30;
    if (raw !== undefined) {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || n > 365) {
        return c.json(err("invalid_request", `Invalid days: ${raw.slice(0, 128)} (expected integer 1-365)`), 400);
      }
      days = n;
    }

    return c.json({ ok: true, data: await getPageStats(db, days) });
  });

  api.get("/stats/apis", async (c) => {
    const denied = authProblem(c.env, c.req.header("x-api-key"));
    if (denied) return c.json(err(denied.code, denied.message), denied.status);

    const db = c.env?.STATS_DB;
    if (!db) return c.json(err("not_configured", "Stats database is not bound."), 503);

    return c.json({ ok: true, data: await getApiCallStats(db) });
  });
}
