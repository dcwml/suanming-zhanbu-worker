import { describe, expect, it } from "vitest";
import { api } from "../src/routes/api";
import type { AlmanacEnv } from "../src/routes/almanac";

const baseEnv: AlmanacEnv = { ALMANAC_API_KEY: "test-key" };

function req(path: string, key?: string): Request {
  const headers: Record<string, string> = {};
  if (key !== undefined) headers["x-api-key"] = key;
  return new Request(`http://localhost${path}`, { headers });
}

type ApiJson = {
  ok: boolean;
  data?: any;
  error?: { code: string; message?: string };
};

describe("GET /api/almanac", () => {
  it("returns 503 not_configured when ALMANAC_API_KEY is not set", async () => {
    const res = await api.fetch(req("/api/almanac", "any"), {});
    expect(res.status).toBe(503);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("not_configured");
  });

  it("returns 401 unauthorized without x-api-key", async () => {
    const res = await api.fetch(req("/api/almanac"), baseEnv);
    expect(res.status).toBe(401);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("unauthorized");
  });

  it("returns 401 unauthorized with wrong key", async () => {
    const res = await api.fetch(req("/api/almanac", "wrong"), baseEnv);
    expect(res.status).toBe(401);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("unauthorized");
  });

  it("returns 400 invalid_request on malformed date", async () => {
    const res = await api.fetch(req("/api/almanac?date=2026/08/17", "test-key"), baseEnv);
    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("invalid_request");
  });

  it("returns known-day data matching local CLI output (2026-08-17)", async () => {
    // 锚点值来自 npm run almanac -- 2026-08-17 的实际输出（黄金文件 tmp/almanac-0817-before.json）
    const res = await api.fetch(req("/api/almanac?date=2026-08-17", "test-key"), baseEnv);
    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiJson;
    expect(json.ok).toBe(true);
    expect(json.data).toMatchObject({
      yearGanZhi: "丙午",
      monthGanZhi: "丙申",
      dayGanZhi: "癸亥",
      lunar: "二〇二六年七月初五",
      tianShen: "勾陈",
    });
    expect(json.data.yi).toContain("祭祀");
    expect(json.data.ji).toContain("嫁娶");
  });

  it("defaults to today (Shanghai) when date is omitted", async () => {
    const res = await api.fetch(req("/api/almanac", "test-key"), baseEnv);
    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiJson;
    expect(json.ok).toBe(true);
    expect(json.data.dayGanZhi).toMatch(/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
  });
});
