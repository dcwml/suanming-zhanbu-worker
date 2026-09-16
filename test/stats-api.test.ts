/**
 * GET /api/stats/* 集成测试（自用统计查询接口）
 *
 * 鉴权行为与 /api/almanac 一致：未配置 SITE_API_KEY → 503 not_configured，
 * key 缺失/错误 → 401 unauthorized。数据层用最小内存 mock（safeFirst/safeAll 降级路径）。
 */

import { describe, expect, it } from "vitest";
import { api } from "../src/routes/api";
import type { SiteAuthEnv } from "../src/auth";
import type { StatsEnv } from "../src/stats";

/** 空库 mock：prepare().bind() 后 first 返回 null、all 返回空（触发 getStats 同款降级逻辑） */
const emptyDb = {
  prepare(_sql: string) {
    return {
      bind(..._params: unknown[]) {
        return {
          run: async () => ({ meta: { changes: 0 } }),
          first: async () => null,
          all: async () => ({ results: [] }),
        };
      },
      first: async () => null,
      all: async () => ({ results: [] }),
    };
  },
} as unknown as NonNullable<StatsEnv["STATS_DB"]>;

function req(path: string, key?: string): Request {
  const headers: Record<string, string> = {};
  if (key !== undefined) headers["x-api-key"] = key;
  return new Request(`http://localhost${path}`, { headers });
}

describe("GET /api/stats/overview", () => {
  it("returns 503 not_configured when SITE_API_KEY is not set", async () => {
    const res = await api.fetch(req("/api/stats/overview", "any"), {});
    expect(res.status).toBe(503);
    const json = (await res.json()) as { error?: { code: string } };
    expect(json.error?.code).toBe("not_configured");
  });

  it("returns 401 unauthorized without x-api-key", async () => {
    const res = await api.fetch(req("/api/stats/overview"), { SITE_API_KEY: "test-key" } satisfies SiteAuthEnv);
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong key", async () => {
    const res = await api.fetch(req("/api/stats/overview", "wrong"), { SITE_API_KEY: "test-key" } satisfies SiteAuthEnv);
    expect(res.status).toBe(401);
  });

  it("returns 503 when STATS_DB is not bound", async () => {
    const res = await api.fetch(req("/api/stats/overview", "test-key"), { SITE_API_KEY: "test-key" } satisfies SiteAuthEnv);
    expect(res.status).toBe(503);
    const json = (await res.json()) as { error?: { code: string } };
    expect(json.error?.code).toBe("not_configured");
  });

  it("returns zero-value overview with empty database", async () => {
    const env = { SITE_API_KEY: "test-key", STATS_DB: emptyDb } satisfies SiteAuthEnv & StatsEnv;
    const res = await api.fetch(req("/api/stats/overview", "test-key"), env);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; data: { pv: Record<string, number>; date: string } };
    expect(json.ok).toBe(true);
    expect(json.data.pv.total).toBe(0);
    expect(json.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("GET /api/stats/pages", () => {
  it("returns 401 without key", async () => {
    const res = await api.fetch(req("/api/stats/pages"), { SITE_API_KEY: "test-key" } satisfies SiteAuthEnv);
    expect(res.status).toBe(401);
  });

  it("returns 400 invalid_request on out-of-range days", async () => {
    const env = { SITE_API_KEY: "test-key", STATS_DB: emptyDb } satisfies SiteAuthEnv & StatsEnv;
    const res = await api.fetch(req("/api/stats/pages?days=999", "test-key"), env);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: { code: string } };
    expect(json.error?.code).toBe("invalid_request");
  });

  it("returns empty page stats with empty database", async () => {
    const env = { SITE_API_KEY: "test-key", STATS_DB: emptyDb } satisfies SiteAuthEnv & StatsEnv;
    const res = await api.fetch(req("/api/stats/pages?days=7", "test-key"), env);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; data: { days: number; paths: unknown[]; daily: unknown[] } };
    expect(json.ok).toBe(true);
    expect(json.data.days).toBe(7);
    expect(json.data.paths).toEqual([]);
  });
});

describe("GET /api/stats/apis", () => {
  it("returns 401 without key", async () => {
    const res = await api.fetch(req("/api/stats/apis"), { SITE_API_KEY: "test-key" } satisfies SiteAuthEnv);
    expect(res.status).toBe(401);
  });

  it("returns empty endpoint list with empty database", async () => {
    const env = { SITE_API_KEY: "test-key", STATS_DB: emptyDb } satisfies SiteAuthEnv & StatsEnv;
    const res = await api.fetch(req("/api/stats/apis", "test-key"), env);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; data: { endpoints: unknown[] } };
    expect(json.ok).toBe(true);
    expect(json.data.endpoints).toEqual([]);
  });
});
