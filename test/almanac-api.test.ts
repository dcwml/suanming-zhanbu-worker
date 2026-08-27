import { describe, expect, it } from "vitest";
import { api } from "../src/routes/api";
import type { SiteAuthEnv } from "../src/auth";

const baseEnv: SiteAuthEnv = { SITE_API_KEY: "test-key" };

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
  it("returns 503 not_configured when SITE_API_KEY is not set", async () => {
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

describe("GET /api/fortune/week", () => {
  it("returns 503 not_configured when SITE_API_KEY is not set", async () => {
    const res = await api.fetch(req("/api/fortune/week", "any"), {});
    expect(res.status).toBe(503);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("not_configured");
  });

  it("returns 401 unauthorized without x-api-key", async () => {
    const res = await api.fetch(req("/api/fortune/week"), baseEnv);
    expect(res.status).toBe(401);
  });

  it("returns 400 invalid_request on malformed monday", async () => {
    const res = await api.fetch(req("/api/fortune/week?monday=20260817", "test-key"), baseEnv);
    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("invalid_request");
  });

  it("returns 400 with correct-monday hint when monday is not a Monday", async () => {
    // 2026-08-19 是周三；buildWeek 抛错的 message 含该周正确周一 2026-08-17
    const res = await api.fetch(req("/api/fortune/week?monday=2026-08-19", "test-key"), baseEnv);
    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("invalid_request");
    expect(json.error?.message).toContain("2026-08-17");
  });

  it("reproduces the backtested 2026-08-17 week ranks", async () => {
    // 名次锚点来自 test/fortune-rules.test.ts 的黄大仙祠 2026-08-17 周回归用例
    const res = await api.fetch(req("/api/fortune/week?monday=2026-08-17", "test-key"), baseEnv);
    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiJson;
    expect(json.ok).toBe(true);
    expect(json.data.week).toEqual({ monday: "2026-08-17", sunday: "2026-08-23" });
    expect(json.data.days).toHaveLength(7);
    expect(json.data.days[0].date).toBe("2026-08-17");
    expect(json.data.zodiacs).toHaveLength(12);
    expect(json.data.ranks.teJi.map((z: { zodiac: string }) => z.zodiac)).toEqual(["鸡", "鼠", "牛"]);
    expect(json.data.ranks.ciJi.map((z: { zodiac: string }) => z.zodiac)).toEqual(["猴", "狗", "猪"]);
    expect(json.data.ranks.zhonggao.zodiac).toBe("马");
  });

  it("defaults to this week's Monday (Shanghai) when monday is omitted", async () => {
    const res = await api.fetch(req("/api/fortune/week", "test-key"), baseEnv);
    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiJson;
    const [y, m, d] = (json.data.week.monday as string).split("-").map(Number);
    expect(new Date(Date.UTC(y, m - 1, d)).getUTCDay()).toBe(1);
  });
});

describe("GET /api/fortune/month", () => {
  it("returns 503 not_configured when SITE_API_KEY is not set", async () => {
    const res = await api.fetch(req("/api/fortune/month", "any"), {});
    expect(res.status).toBe(503);
  });

  it("returns 400 invalid_request on malformed month", async () => {
    const res = await api.fetch(req("/api/fortune/month?month=2026-8", "test-key"), baseEnv);
    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("invalid_request");
  });

  it("returns deterministic 2026-08 month skeleton", async () => {
    // 2026-08 月中月柱丙申（立秋 8/7 后）；月支申：蛇六合、鼠三合、虎相冲、猪相害、猴值月
    const res = await api.fetch(req("/api/fortune/month?month=2026-08", "test-key"), baseEnv);
    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiJson;
    expect(json.ok).toBe(true);
    expect(json.data.month).toBe("2026-08");
    expect(json.data.monthGanZhi).toBe("丙申");
    expect(json.data.jieQiInMonth.map((j: { name: string }) => j.name)).toContain("立秋");
    const rel = (z: string) =>
      json.data.zodiacs.find((x: { zodiac: string }) => x.zodiac === z).monthRelation;
    expect(rel("蛇")).toBe("六合");
    expect(rel("鼠")).toBe("三合");
    expect(rel("虎")).toBe("相冲");
    expect(rel("猪")).toBe("相害");
    expect(rel("猴")).toBe("值月");
    expect(Array.isArray(json.data.luckyDays)).toBe(true);
    expect(json.data.monthPillarSegments.length).toBeGreaterThanOrEqual(1);
  });

  it("defaults to current month (Shanghai) when month is omitted", async () => {
    const res = await api.fetch(req("/api/fortune/month", "test-key"), baseEnv);
    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiJson;
    expect(json.data.month).toMatch(/^\d{4}-\d{2}$/);
  });
});
