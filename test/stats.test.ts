/**
 * 统计模块单元测试
 *
 * 测试覆盖：
 * - getRealIp: IP 提取逻辑
 * - recordPageView: UV 去重 + 计数递增
 * - recordApiCall: API 调用计数
 * - getStats: 统计数据查询与聚合
 */

import { describe, expect, it, beforeEach } from "vitest";
import { getRealIp, recordPageView, recordApiCall, getStats } from "../src/stats";

// ── 简化的 Mock 类型 ──────────────────────────────────────

/** 模拟 daily_stats 表的一行（date 为字符串，计数列可选） */
type MockStatsRow = { date: string; homepage_pv?: number; bazi_usage?: number; liuyao_usage?: number };

interface MockD1Database {
  _data: {
    uv: Array<{ date: string; ip_hash: string; page_type: string }>;
    stats: MockStatsRow[];
    api: Array<{ date: string; api_path: string; call_count: number }>;
  };
  prepare(sql: string): {
    bind(...params: unknown[]): {
      run(): Promise<{ meta: { changes: number } }>;
      first<T>(): Promise<T | null>;
      all<T>(): Promise<{ results: T[] }>;
    };
  };
}

function createMockDb(): MockD1Database {
  const data = {
    uv: [] as MockD1Database["_data"]["uv"],
    stats: [] as MockD1Database["_data"]["stats"],
    api: [] as MockD1Database["_data"]["api"],
  };

  return {
    _data: data,
    prepare(sql: string) {
      // 共享状态：存储 bind 参数
      let boundParams: unknown[] = [];

      const result = {
        // 写操作
        async run() {
          // 模拟 INSERT OR IGNORE (UV 表)
          if (sql.includes("daily_unique_visitors")) {
            const [, ipHash, pageType] = boundParams;
            const exists = data.uv.some(
              (v) => v.ip_hash === ipHash && v.page_type === pageType,
            );
            if (!exists) {
              data.uv.push({
                date: boundParams[0] as string,
                ip_hash: ipHash as string,
                page_type: pageType as string,
              });
            }
            return { meta: { changes: exists ? 0 : 1 } };
          }

          // 模拟 UPSERT (daily_stats)
          if (sql.includes("daily_stats") && !sql.includes("SUM")) {
            const date = boundParams[0] as string;
            const colMatch = sql.match(/INSERT INTO daily_stats \(date, (\w+)\)/);
            const column = (colMatch?.[1] ?? "homepage_pv") as "homepage_pv" | "bazi_usage" | "liuyao_usage";
            const existing = data.stats.find((s) => s.date === date);
            if (existing) {
              existing[column] = (existing[column] ?? 0) + 1;
            } else {
              data.stats.push({ date, [column]: 1 } as MockStatsRow);
            }
            return { meta: { changes: 1 } };
          }

          // 模拟 UPSERT (api_stats)
          if (sql.includes("api_stats")) {
            const [date, apiPath] = boundParams;
            const existing = data.api.find(
              (a) => a.date === date && a.api_path === apiPath,
            );
            if (existing) {
              existing.call_count += 1;
            } else {
              data.api.push({ date: date as string, api_path: apiPath as string, call_count: 1 });
            }
            return { meta: { changes: 1 } };
          }

          return { meta: { changes: 0 } };
        },

        // 读操作 - 单行
        async first<T>(): Promise<T | null> {
          // SUM 查询（总计）- 无 WHERE 子句
          if (sql.includes("SUM(homepage_pv)") && !sql.includes("WHERE")) {
            const totalPv = data.stats.reduce((s, r) => s + (r.homepage_pv ?? 0), 0);
            const totalBazi = data.stats.reduce((s, r) => s + (r.bazi_usage ?? 0), 0);
            const totalLiuyao = data.stats.reduce((s, r) => s + (r.liuyao_usage ?? 0), 0);
            return { homepage_pv: totalPv, bazi_usage: totalBazi, liuyao_usage: totalLiuyao } as T;
          }

          // 今日查询 - 有 WHERE date = ?
          if (sql.includes("WHERE date = ?") || (sql.includes("daily_stats") && sql.includes("date ="))) {
            const today = boundParams[0] as string;
            const row = data.stats.find((s) => s.date === today);
            return (
              (row ?? { homepage_pv: 0, bazi_usage: 0, liuyao_usage: 0 }) as T
            );
          }

          return null;
        },

        // 读操作 - 多行
        async all<T>(): Promise<{ results: T[] }> {
          // API 统计 GROUP BY
          if (sql.includes("GROUP BY api_path")) {
            const today = boundParams[0] as string;
            const map = new Map<string, { total: number; today: number }>();

            for (const row of data.api) {
              const cur = map.get(row.api_path) ?? { total: 0, today: 0 };
              cur.total += row.call_count;
              if (row.date === today) cur.today += row.call_count;
              map.set(row.api_path, cur);
            }

            const results = Array.from(map.entries()).map(([path, c]) => ({
              api_path: path,
              total_calls: c.total,
              today_calls: c.today,
            }));

            return { results: results as unknown as T[] };
          }

          return { results: [] as unknown as T[] };
        },

        // bind 方法：保存参数并返回自身（链式调用）
        bind(...params: unknown[]) {
          boundParams = params;
          return result;
        },
      };

      // prepare 直接返回支持 .first()/.all()/.bind() 的对象
      // 这样无论调用 db.prepare(sql).first() 还是 db.prepare(sql).bind(x).first() 都能工作
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

    it("不同 IP 应分别计数", async () => {
      const req1 = new Request("https://example.com/zh/", {
        headers: { "cf-connecting-ip": "10.0.0.1" },
      });
      const req2 = new Request("https://example.com/zh/", {
        headers: { "cf-connecting-ip": "10.0.0.2" },
      });

      await recordPageView(db as never, req1, "homepage");
      await recordPageView(db as never, req2, "homepage");

      expect(db._data.uv).toHaveLength(2);
      expect(db._data.stats[0].homepage_pv).toBe(2);
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

  describe("recordApiCall", () => {
    let db: MockD1Database;

    beforeEach(() => {
      db = createMockDb();
    });

    it("记录 API 调用并递增计数", async () => {
      await recordApiCall(db as never, "/api/bazi/interpret");
      await recordApiCall(db as never, "/api/bazi/interpret");
      await recordApiCall(db as never, "/api/liuyao/interpret");

      expect(db._data.api).toHaveLength(2);
      expect(db._data.api.find((a) => a.api_path === "/api/bazi/interpret")?.call_count).toBe(2);
      expect(db._data.api.find((a) => a.api_path === "/api/liuyao/interpret")?.call_count).toBe(1);
    });

    it("D1 错误不应抛出异常", async () => {
      const badDb = {
        prepare() {
          return {
            bind() {
              return {
                run() {
                  throw new Error("DB error");
                },
              };
            },
          };
        },
      };

      await expect(recordApiCall(badDb as never, "/api/test")).resolves.not.toThrow();
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
      expect(stats.today.bazi_usage).toBe(0);
      expect(stats.today.liuyao_usage).toBe(0);
      expect(stats.api_calls).toHaveLength(0);
    });

    it("正确聚合多天数据", async () => {
      // 与 src/stats.ts 的 todayStr 保持一致：动态计算今天/昨天（UTC），避免测试依赖写死日期
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

      // 手动插入测试数据
      db._data.stats.push(
        { date: yesterday, homepage_pv: 100, bazi_usage: 20, liuyao_usage: 15 },
        { date: today, homepage_pv: 50, bazi_usage: 10, liuyao_usage: 5 },
      );

      db._data.api.push(
        { date: yesterday, api_path: "/api/bazi/interpret", call_count: 30 },
        { date: today, api_path: "/api/bazi/interpret", call_count: 10 },
        { date: today, api_path: "/api/liuyao/interpret", call_count: 8 },
      );

      const stats = await getStats(db as never);

      // 总计
      expect(stats.total.homepage_pv).toBe(150);
      expect(stats.total.bazi_usage).toBe(30);
      expect(stats.total.liuyao_usage).toBe(20);

      // 今日
      expect(stats.today.homepage_pv).toBe(50);
      expect(stats.today.bazi_usage).toBe(10);
      expect(stats.today.liuyao_usage).toBe(5);

      // API 调用
      expect(stats.api_calls).toHaveLength(2);
      const baziApi = stats.api_calls.find((a) => a.api_path === "/api/bazi/interpret");
      expect(baziApi?.total_calls).toBe(40);
      expect(baziApi?.today_calls).toBe(10);
    });
  });
});
