/**
 * 全局埋点中间件端到端测试（src/index.ts）
 *
 * 直接 app.fetch 驱动完整应用，用可捕获的 mock ExecutionContext 验证
 * waitUntil 埋点任务确实被调度——防止中间件注册顺序回归（Hono 后注册不包裹先注册路由）。
 */

import { describe, expect, it } from "vitest";
import app from "../src/index";
import type { StatsEnv } from "../src/stats";

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0";

/** 捕获 waitUntil 任务的 mock 执行上下文 + 记录调用的 mock D1 */
function makeEnv() {
  const waited: Promise<unknown>[] = [];
  const recorded: Array<{ sql: string; params: unknown[] }> = [];
  const env = {
    SITE_API_KEY: "test-key",
    STATS_DB: {
      prepare(sql: string) {
        return {
          bind(...params: unknown[]) {
            return {
              run: async () => {
                recorded.push({ sql, params });
                return { meta: { changes: 1 } };
              },
              first: async () => null,
              all: async () => ({ results: [] }),
            };
          },
          first: async () => null,
          all: async () => ({ results: [] }),
        };
      },
    },
  } as unknown as StatsEnv & Record<string, unknown>;
  const ctx = {
    waitUntil: (p: Promise<unknown>) => waited.push(p),
    passThroughOnException: () => {},
  } as never;
  return { waited, recorded, env, ctx };
}

describe("stats instrumentation middleware", () => {
  it("浏览器 UA 访问 HTML 页面：调度 page_views 写入", async () => {
    const { waited, recorded, env, ctx } = makeEnv();
    const res = await app.fetch(
      new Request("https://example.com/zh/daily/", { headers: { "user-agent": BROWSER_UA } }),
      env,
      ctx,
    );
    expect(res.status).toBe(200);
    await Promise.all(waited);
    expect(recorded.some((r) => r.sql.includes("INSERT INTO page_views") && r.params[1] === "/zh/daily/")).toBe(true);
  });

  it("浏览器 UA 调 API：按状态码调度 api_stats 写入", async () => {
    const { waited, recorded, env, ctx } = makeEnv();
    const res = await app.fetch(
      new Request("https://example.com/api/almanac", { headers: { "user-agent": BROWSER_UA } }),
      env,
      ctx,
    );
    expect(res.status).toBe(401); // 无 key 被拒，但请求本身仍计入统计
    await Promise.all(waited);
    expect(
      recorded.some((r) => r.sql.includes("INSERT INTO api_stats") && r.params[1] === "/api/almanac" && r.params[2] === "401"),
    ).toBe(true);
  });

  it("爬虫 UA：不调度任何埋点", async () => {
    const { waited, recorded, env, ctx } = makeEnv();
    const res = await app.fetch(
      new Request("https://example.com/zh/daily/", { headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" } }),
      env,
      ctx,
    );
    expect(res.status).toBe(200);
    await Promise.all(waited);
    expect(waited).toHaveLength(0);
    expect(recorded).toHaveLength(0);
  });

  it("无 STATS_DB 绑定：静默跳过不抛错", async () => {
    const { waited, env, ctx } = makeEnv();
    const res = await app.fetch(
      new Request("https://example.com/zh/", { headers: { "user-agent": BROWSER_UA } }),
      {},
      ctx,
    );
    expect(res.status).toBe(200);
    expect(waited).toHaveLength(0);
  });
});
