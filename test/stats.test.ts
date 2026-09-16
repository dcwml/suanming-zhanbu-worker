/**
 * 统计模块单元测试
 *
 * 测试覆盖：
 * - getRealIp: IP 提取逻辑
 * - isBotUserAgent: 爬虫 UA 过滤
 * - recordPageView: UV 去重 + 计数递增
 * - recordPagePathView: 全站页面 PV（天 × 路径）
 * - recordApiCall: API 调用计数（天 × 路径 × 状态码）
 * - getStats: 首页展示统计聚合
 * - getOverview / getPageStats / getApiCallStats: 自用统计查询（/api/stats/*）
 *
 * 与 src/stats.ts 的 shanghaiTodayStr 保持同一时区口径，避免写死日期隔天必失败。
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  getRealIp,
  isBotUserAgent,
  shanghaiTodayStr,
  recordPageView,
  recordPagePathView,
  recordApiCall,
  getStats,
  getOverview,
  getPageStats,
  getApiCallStats,
} from "../src/stats";

/** 与 src/stats.ts 的 addDaysStr 相同的日历运算（测试内复算期望值） */
function addDaysStr(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

// ── 内存 Mock D1（按 SQL 特征路由到对应表的内存数组） ──────

interface MockD1Database {
  _data: {
    uv: Array<{ date: string; ip_hash: string; page_type: string }>;
    stats: Array<{ date: string; homepage_pv?: number; bazi_usage?: number; liuyao_usage?: number }>;
    pages: Array<{ date: string; path: string; views: number }>;
    api: Array<{ date: string; api_path: string; status: string; call_count: number }>;
  };
  prepare(sql: string): {
    bind(...params: unknown[]): {
      run(): Promise<{ meta: { changes: number } }>;
      first<T>(): Promise<T | null>;
      all<T>(): Promise<{ results: T[] }>;
    };
    first<T>(): Promise<T | null>;
    all<T>(): Promise<{ results: T[] }>;
  };
}

function createMockDb(): MockD1Database {
  const data = {
    uv: [] as MockD1Database["_data"]["uv"],
    stats: [] as MockD1Database["_data"]["stats"],
    pages: [] as MockD1Database["_data"]["pages"],
    api: [] as MockD1Database["_data"]["api"],
  };

  const num = (v: unknown) => Number(v ?? 0);

  return {
    _data: data,
    prepare(sql: string) {
      let bound: unknown[] = [];

      const result = {
        async run() {
          if (sql.includes("INSERT INTO daily_unique_visitors")) {
            const [date, ipHash, pageType] = bound as [string, string, string];
            const exists = data.uv.some((v) => v.date === date && v.ip_hash === ipHash && v.page_type === pageType);
            if (!exists) data.uv.push({ date, ip_hash: ipHash, page_type: pageType });
            return { meta: { changes: exists ? 0 : 1 } };
          }
          if (sql.includes("INSERT INTO daily_stats")) {
            const date = bound[0] as string;
            const column = (sql.match(/INSERT INTO daily_stats \(date, (\w+)\)/)?.[1] ?? "homepage_pv") as
              | "homepage_pv"
              | "bazi_usage"
              | "liuyao_usage";
            const row = data.stats.find((s) => s.date === date);
            if (row) row[column] = (row[column] ?? 0) + 1;
            else data.stats.push({ date, [column]: 1 });
            return { meta: { changes: 1 } };
          }
          if (sql.includes("INSERT INTO page_views")) {
            const [date, path] = bound as [string, string];
            const row = data.pages.find((p) => p.date === date && p.path === path);
            if (row) row.views += 1;
            else data.pages.push({ date, path, views: 1 });
            return { meta: { changes: 1 } };
          }
          if (sql.includes("INSERT INTO api_stats")) {
            const [date, apiPath, status] = bound as [string, string, string];
            const row = data.api.find(
              (a) => a.date === date && a.api_path === apiPath && a.status === status,
            );
            if (row) row.call_count += 1;
            else data.api.push({ date, api_path: apiPath, status, call_count: 1 });
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        },

        async first<T>(): Promise<T | null> {
          // getStats：daily_stats 总计
          if (sql.includes("SUM(homepage_pv)")) {
            const sum = (col: "homepage_pv" | "bazi_usage" | "liuyao_usage") =>
              data.stats.reduce((s, r) => s + (r[col] ?? 0), 0);
            return { homepage_pv: sum("homepage_pv"), bazi_usage: sum("bazi_usage"), liuyao_usage: sum("liuyao_usage") } as T;
          }
          // getOverview：page_views 窗口聚合
          if (sql.includes("FROM page_views") && sql.includes("as total")) {
            const [today, yesterday, last7Start, last30Start] = bound as [string, string, string, string];
            const sumWhere = (pred: (d: string) => boolean) =>
              data.pages.filter((p) => pred(p.date)).reduce((s, p) => s + p.views, 0);
            return {
              today: sumWhere((d) => d === today),
              yesterday: sumWhere((d) => d === yesterday),
              last7: sumWhere((d) => d >= last7Start),
              last30: sumWhere((d) => d >= last30Start),
              total: data.pages.reduce((s, p) => s + p.views, 0),
            } as T;
          }
          // getOverview：UV 去重数
          if (sql.includes("COUNT(DISTINCT ip_hash)")) {
            const today = bound[0] as string;
            const set = new Set(data.uv.filter((v) => v.date === today).map((v) => v.ip_hash));
            return { uv: set.size } as T;
          }
          // getOverview：api 总计/今日
          if (sql.includes("FROM api_stats") && sql.includes("as total")) {
            const today = bound[0] as string;
            return {
              total: data.api.reduce((s, a) => s + a.call_count, 0),
              today: data.api.filter((a) => a.date === today).reduce((s, a) => s + a.call_count, 0),
            } as T;
          }
          // getStats：daily_stats 今日行
          if (sql.includes("FROM daily_stats")) {
            const today = bound[0] as string;
            const row = data.stats.find((s) => s.date === today);
            return (row ?? { homepage_pv: 0, bazi_usage: 0, liuyao_usage: 0 }) as T;
          }
          return null;
        },

        async all<T>(): Promise<{ results: T[] }> {
          // getPageStats：每路径总量/近期量
          if (sql.includes("GROUP BY path")) {
            const since = bound[0] as string;
            const map = new Map<string, { total_views: number; recent_views: number }>();
            for (const p of data.pages) {
              const cur = map.get(p.path) ?? { total_views: 0, recent_views: 0 };
              cur.total_views += p.views;
              if (p.date >= since) cur.recent_views += p.views;
              map.set(p.path, cur);
            }
            return {
              results: [...map.entries()]
                .map(([path, v]) => ({ path, ...v }))
                .sort((a, b) => b.recent_views - a.recent_views),
            } as { results: T[] };
          }
          // getPageStats：全站按日序列
          if (sql.includes("GROUP BY date")) {
            const since = bound[0] as string;
            const map = new Map<string, number>();
            for (const p of data.pages) {
              if (p.date < since) continue;
              map.set(p.date, (map.get(p.date) ?? 0) + p.views);
            }
            return {
              results: [...map.entries()]
                .map(([date, views]) => ({ date, views }))
                .sort((a, b) => b.date.localeCompare(a.date)),
            } as { results: T[] };
          }
          // getApiCallStats / getStats：按 api_path（+status）聚合
          if (sql.includes("GROUP BY api_path, status")) {
            const today = bound[0] as string;
            return {
              results: data.api.map((a) => ({
                api_path: a.api_path,
                status: a.status,
                calls: a.call_count,
                today_calls: a.date === today ? a.call_count : 0,
              })),
            } as { results: T[] };
          }
          if (sql.includes("GROUP BY api_path")) {
            const today = bound[0] as string;
            const map = new Map<string, { total_calls: number; today_calls: number }>();
            for (const a of data.api) {
              const cur = map.get(a.api_path) ?? { total_calls: 0, today_calls: 0 };
              cur.total_calls += a.call_count;
              if (a.date === today) cur.today_calls += a.call_count;
              map.set(a.api_path, cur);
            }
            return {
              results: [...map.entries()].map(([api_path, v]) => ({ api_path, ...v })),
            } as { results: T[] };
          }
          return { results: [] as unknown as T[] };
        },

        bind(...params: unknown[]) {
          bound = params;
          return result;
        },
      };

      return result as never;
    },
  };
}

// ── 测试用例 ─────────────────────────────────────────────

describe("stats module", () => {
  describe("getRealIp", () => {
    it("从 cf-connecting-ip 头部提取真实 IP", () => {
      const req = new Request("https://example.com", {
        headers: { "cf-connecting-ip": "1.2.3.4" },
      });
      expect(getRealIp(req)).toBe("1.2.3.4");
    });

    it("当头部缺失时返回 'unknown'", () => {
      const req = new Request("https://example.com");
      expect(getRealIp(req)).toBe("unknown");
    });

    it("处理 IPv6 地址", () => {
      const req = new Request("https://example.com", {
        headers: { "cf-connecting-ip": "2001:db8::1" },
      });
      expect(getRealIp(req)).toBe("2001:db8::1");
    });
  });

  describe("isBotUserAgent", () => {
    it("常见爬虫 UA 命中", () => {
      expect(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
      expect(isBotUserAgent("Mozilla/5.0 (compatible; bingbot/2.0)")).toBe(true);
      expect(isBotUserAgent("Mozilla/5.0 (compatible; Bytespider)")).toBe(true);
      expect(isBotUserAgent("GPTBot/1.0")).toBe(true);
      expect(isBotUserAgent("curl/8.0")).toBe(true);
    });

    it("正常浏览器 UA 不命中", () => {
      expect(isBotUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0")).toBe(false);
      expect(isBotUserAgent("Mozilla/5.0 (iPhone) Safari/17.0")).toBe(false);
    });

    it("无 UA 视为脚本，不计入统计", () => {
      expect(isBotUserAgent(null)).toBe(true);
      expect(isBotUserAgent(undefined)).toBe(true);
      expect(isBotUserAgent("")).toBe(true);
    });
  });

  describe("shanghaiTodayStr", () => {
    it("返回 YYYY-MM-DD 格式", () => {
      expect(shanghaiTodayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("recordPageView", () => {
    let db: MockD1Database;

    beforeEach(() => {
      db = createMockDb();
    });

    it("首次访问应记录为新访客并增加计数", async () => {
      const req = new Request("https://example.com/zh/", {
        headers: { "cf-connecting-ip": "10.0.0.1" },
      });

      await recordPageView(db as never, req, "homepage");

      expect(db._data.uv).toHaveLength(1);
      expect(db._data.stats).toHaveLength(1);
      expect(db._data.stats[0].homepage_pv).toBe(1);
    });

    it("同一 IP 同一天重复访问不应重复计数", async () => {
      const ip = "10.0.0.1";
      const req1 = new Request("https://example.com/zh/", {
        headers: { "cf-connecting-ip": ip },
      });
      const req2 = new Request("https://example.com/zh/", {
        headers: { "cf-connecting-ip": ip },
      });

      await recordPageView(db as never, req1, "homepage");
      await recordPageView(db as never, req2, "homepage");

      expect(db._data.uv).toHaveLength(1); // 去重
      expect(db._data.stats[0].homepage_pv).toBe(1); // 只计数一次
    });

    it("同一 IP 访问不同页面应分别计数", async () => {
      const ip = "10.0.0.1";
      const reqHome = new Request("https://example.com/zh/", {
        headers: { "cf-connecting-ip": ip },
      });
      const reqBazi = new Request("https://example.com/zh/bazi/", {
        headers: { "cf-connecting-ip": ip },
      });

      await recordPageView(db as never, reqHome, "homepage");
      await recordPageView(db as never, reqBazi, "bazi");

      expect(db._data.uv).toHaveLength(2); // 不同 page_type
      expect(db._data.stats[0].homepage_pv).toBe(1);
      expect(db._data.stats[0].bazi_usage).toBe(1);
    });

    it("D1 错误不应抛出异常（静默失败）", async () => {
      const badDb = {
        prepare() {
          return {
            bind() {
              return {
                run() {
                  throw new Error("D1 connection failed");
                },
              };
            },
          };
        },
      };

      const req = new Request("https://example.com", {
        headers: { "cf-connecting-ip": "1.2.3.4" },
      });

      await expect(recordPageView(badDb as never, req, "homepage")).resolves.not.toThrow();
    });
  });

  describe("recordPagePathView", () => {
    let db: MockD1Database;

    beforeEach(() => {
      db = createMockDb();
    });

    it("同一日同一路径累计，不同路径分行", async () => {
      await recordPagePathView(db as never, "/zh/daily/2026-09-16/");
      await recordPagePathView(db as never, "/zh/daily/2026-09-16/");
      await recordPagePathView(db as never, "/zh/daily/");

      expect(db._data.pages).toHaveLength(2);
      expect(db._data.pages.find((p) => p.path === "/zh/daily/2026-09-16/")?.views).toBe(2);
      expect(db._data.pages.find((p) => p.path === "/zh/daily/")?.views).toBe(1);
    });

    it("D1 错误不应抛出异常", async () => {
      const badDb = {
        prepare() {
          throw new Error("boom");
        },
      };
      await expect(recordPagePathView(badDb as never, "/zh/")).resolves.not.toThrow();
    });
  });

  describe("recordApiCall", () => {
    let db: MockD1Database;

    beforeEach(() => {
      db = createMockDb();
    });

    it("同路径同状态码累计，不同状态码分行", async () => {
      await recordApiCall(db as never, "/api/bazi/interpret", "200");
      await recordApiCall(db as never, "/api/bazi/interpret", "200");
      await recordApiCall(db as never, "/api/bazi/interpret", "429");
      await recordApiCall(db as never, "/api/liuyao/interpret", "200");

      expect(db._data.api).toHaveLength(3);
      const bazi200 = db._data.api.find((a) => a.api_path === "/api/bazi/interpret" && a.status === "200");
      expect(bazi200?.call_count).toBe(2);
      expect(db._data.api.find((a) => a.status === "429")?.call_count).toBe(1);
    });

    it("D1 错误不应抛出异常", async () => {
      const badDb = {
        prepare() {
          throw new Error("DB error");
        },
      };
      await expect(recordApiCall(badDb as never, "/api/test", "200")).resolves.not.toThrow();
    });
  });

  describe("getStats", () => {
    let db: MockD1Database;

    beforeEach(() => {
      db = createMockDb();
    });

    it("空数据库返回零值统计", async () => {
      const stats = await getStats(db as never);

      expect(stats.total.homepage_pv).toBe(0);
      expect(stats.total.bazi_usage).toBe(0);
      expect(stats.total.liuyao_usage).toBe(0);
      expect(stats.today.homepage_pv).toBe(0);
      expect(stats.api_calls).toHaveLength(0);
    });

    it("正确聚合多天数据（上海时区口径）", async () => {
      const today = shanghaiTodayStr();
      const yesterday = addDaysStr(today, -1);

      db._data.stats.push(
        { date: yesterday, homepage_pv: 100, bazi_usage: 20, liuyao_usage: 15 },
        { date: today, homepage_pv: 50, bazi_usage: 10, liuyao_usage: 5 },
      );
      db._data.api.push(
        { date: yesterday, api_path: "/api/bazi/interpret", status: "ok", call_count: 30 },
        { date: today, api_path: "/api/bazi/interpret", status: "ok", call_count: 10 },
        { date: today, api_path: "/api/liuyao/interpret", status: "ok", call_count: 8 },
      );

      const stats = await getStats(db as never);

      expect(stats.total.homepage_pv).toBe(150);
      expect(stats.today.homepage_pv).toBe(50);
      expect(stats.api_calls).toHaveLength(2);
      const baziApi = stats.api_calls.find((a) => a.api_path === "/api/bazi/interpret");
      expect(baziApi?.total_calls).toBe(40);
      expect(baziApi?.today_calls).toBe(10);
    });
  });

  describe("getOverview", () => {
    let db: MockD1Database;

    beforeEach(() => {
      db = createMockDb();
    });

    it("空数据库返回全零", async () => {
      const overview = await getOverview(db as never);
      expect(overview.pv).toEqual({ today: 0, yesterday: 0, last7: 0, last30: 0, total: 0 });
      expect(overview.uv.today).toBe(0);
      expect(overview.api.total).toBe(0);
      expect(overview.date).toBe(shanghaiTodayStr());
    });

    it("窗口口径正确（今日/昨日/近7/近30/总计）", async () => {
      const today = shanghaiTodayStr();
      db._data.pages.push(
        { date: today, path: "/zh/", views: 5 },
        { date: addDaysStr(today, -1), path: "/zh/", views: 3 },
        { date: addDaysStr(today, -3), path: "/zh/bazi/", views: 2 },
        { date: addDaysStr(today, -20), path: "/zh/daily/", views: 4 },
        { date: addDaysStr(today, -40), path: "/zh/", views: 6 },
      );
      db._data.uv.push({ date: today, ip_hash: "a", page_type: "homepage" });
      db._data.uv.push({ date: today, ip_hash: "b", page_type: "homepage" });
      db._data.api.push({ date: today, api_path: "/api/almanac", status: "200", call_count: 7 });

      const overview = await getOverview(db as never);

      expect(overview.pv.today).toBe(5);
      expect(overview.pv.yesterday).toBe(3);
      expect(overview.pv.last7).toBe(10); // 5 + 3 + 2
      expect(overview.pv.last30).toBe(14); // 10 + 4
      expect(overview.pv.total).toBe(20);
      expect(overview.uv.today).toBe(2);
      expect(overview.api).toEqual({ total: 7, today: 7 });
    });
  });

  describe("getPageStats", () => {
    let db: MockD1Database;

    beforeEach(() => {
      db = createMockDb();
    });

    it("按路径聚合并按近期量排序，daily 序列按日期倒序", async () => {
      const today = shanghaiTodayStr();
      db._data.pages.push(
        { date: today, path: "/zh/daily/", views: 9 },
        { date: today, path: "/zh/", views: 4 },
        { date: addDaysStr(today, -10), path: "/zh/", views: 1 },
      );

      const stats = await getPageStats(db as never, 7);

      expect(stats.days).toBe(7);
      expect(stats.since).toBe(addDaysStr(today, -6));
      expect(stats.paths[0]).toEqual({ path: "/zh/daily/", total_views: 9, recent_views: 9 });
      expect(stats.paths[1]).toEqual({ path: "/zh/", total_views: 5, recent_views: 4 });
      expect(stats.daily[0]).toEqual({ date: today, views: 13 });
      expect(stats.daily).toHaveLength(1); // 10 天前的那条不在 7 天窗口内
    });
  });

  describe("getApiCallStats", () => {
    let db: MockD1Database;

    beforeEach(() => {
      db = createMockDb();
    });

    it("按端点聚合并在 by_status 中分布，历史 'ok' 归并为 '200'", async () => {
      const today = shanghaiTodayStr();
      db._data.api.push(
        { date: today, api_path: "/api/bazi/interpret", status: "ok", call_count: 3 },
        { date: today, api_path: "/api/bazi/interpret", status: "200", call_count: 2 },
        { date: today, api_path: "/api/bazi/interpret", status: "429", call_count: 1 },
        { date: today, api_path: "/api/almanac", status: "200", call_count: 5 },
      );

      const stats = await getApiCallStats(db as never);

      expect(stats.endpoints).toHaveLength(2);
      const bazi = stats.endpoints.find((e) => e.api_path === "/api/bazi/interpret")!;
      expect(bazi.total_calls).toBe(6);
      expect(bazi.today_calls).toBe(6);
      expect(bazi.by_status).toEqual({ "200": 5, "429": 1 }); // ok + 200 归并
      expect(bazi.total_calls).toBeGreaterThanOrEqual(
        stats.endpoints.find((e) => e.api_path === "/api/almanac")!.total_calls,
      );
    });
  });
});
