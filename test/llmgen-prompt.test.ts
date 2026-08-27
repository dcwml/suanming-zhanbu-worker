import { describe, expect, it } from "vitest";
import { compute } from "../src/almanac/compute";
import { dailyGenerators } from "../src/llmgen/daily";
import { buildWeek, buildMonth } from "../src/fortune/skeleton";
import { weeklyGenerators } from "../src/llmgen/weekly";
import { monthlyGenerators } from "../src/llmgen/monthly";
import { GENERATORS } from "../src/llmgen/registry";
import type { DailyGenerateData, WeeklyGenerateData, MonthlyGenerateData } from "../src/llmgen/types";

// 锚点：2026-08-17 癸亥日、生肖猪、宜含祭祀（Step 0 已复核）
const data: DailyGenerateData = { lang: "zh", date: "2026-08-17", almanac: compute("2026-08-17") };

describe("llmgen daily system prompts", () => {
  for (const type of ["daily-reading", "daily-zodiac", "daily-story"] as const) {
    it(`${type}: zh system embeds guard rule`, () => {
      expect(dailyGenerators[type].system("zh")).toContain("人工智能");
    });
    it(`${type}: en system embeds guard rule`, () => {
      expect(dailyGenerators[type].system("en")).toContain("artificial intelligence");
    });
  }
});

describe("llmgen daily user prompts", () => {
  it("daily-reading embeds date and key almanac fields", () => {
    const u = dailyGenerators["daily-reading"].user(data);
    expect(u).toContain("2026-08-17");
    expect(u).toContain("癸亥");
    expect(u).toContain("祭祀");
  });
  it("daily-zodiac names the day's zodiac protagonist and clash animal", () => {
    const u = dailyGenerators["daily-zodiac"].user(data);
    expect(u).toContain("猪");
    expect(u).toContain("蛇"); // 2026-08-17 冲蛇（亥冲巳）
  });
  it("daily-story embeds the full almanac JSON", () => {
    const u = dailyGenerators["daily-story"].user(data);
    expect(u).toContain("勾陈"); // 当日天神
  });
});

describe("llmgen daily validate", () => {
  it("accepts a well-formed payload", () => {
    const v = dailyGenerators["daily-reading"].validate(data);
    expect(v.ok).toBe(true);
  });
  it("rejects bad lang / bad date / missing almanac", () => {
    expect(dailyGenerators["daily-reading"].validate({ ...data, lang: "fr" }).ok).toBe(false);
    expect(dailyGenerators["daily-reading"].validate({ ...data, date: "2026/08/17" }).ok).toBe(false);
    expect(dailyGenerators["daily-reading"].validate({ lang: "zh", date: "2026-08-17" }).ok).toBe(false);
  });
});

const weekData: WeeklyGenerateData = { lang: "zh", monday: "2026-08-17", week: buildWeek("2026-08-17") };
const monthData: MonthlyGenerateData = { lang: "zh", month: "2026-08", skeleton: buildMonth("2026-08") };

describe("llmgen weekly/monthly system prompts", () => {
  const types = ["weekly-summary", "weekly-zodiac", "weekly-days", "monthly-summary", "monthly-zodiac", "monthly-lucky"] as const;
  for (const type of types) {
    it(`${type}: zh system embeds guard rule`, () => {
      expect(GENERATORS[type].system("zh")).toContain("人工智能");
    });
    it(`${type}: en system embeds guard rule`, () => {
      expect(GENERATORS[type].system("en")).toContain("artificial intelligence");
    });
  }
});

describe("llmgen weekly/monthly user prompts", () => {
  it("weekly-summary user embeds rank summary", () => {
    const u = weeklyGenerators["weekly-summary"].user(weekData);
    expect(u).toContain("特吉");
    expect(u).toContain("鸡"); // 锚点：特吉之首
    expect(u).toContain("2026-08-17");
  });
  it("weekly-days user embeds the full week span", () => {
    const u = weeklyGenerators["weekly-days"].user(weekData);
    expect(u).toContain("2026-08-23"); // 周日
  });
  it("monthly-summary user embeds month pillar and solar term", () => {
    const u = monthlyGenerators["monthly-summary"].user(monthData);
    expect(u).toContain("丙申");
    expect(u).toContain("立秋");
  });
  it("monthly-lucky user embeds luckyDays data", () => {
    const u = monthlyGenerators["monthly-lucky"].user(monthData);
    expect(u).toContain("luckyDays");
  });
});

describe("llmgen weekly/monthly validate", () => {
  it("weekly rejects malformed monday and missing week", () => {
    expect(weeklyGenerators["weekly-summary"].validate({ ...weekData, monday: "2026/08/17" }).ok).toBe(false);
    expect(weeklyGenerators["weekly-summary"].validate({ lang: "zh", monday: "2026-08-17" }).ok).toBe(false);
  });
  it("monthly rejects malformed month and missing skeleton", () => {
    expect(monthlyGenerators["monthly-summary"].validate({ ...monthData, month: "2026-8" }).ok).toBe(false);
    expect(monthlyGenerators["monthly-summary"].validate({ lang: "zh", month: "2026-08" }).ok).toBe(false);
  });
  it("GENERATORS covers all 9 types", () => {
    expect(Object.keys(GENERATORS).sort()).toEqual(
      [
        "daily-reading", "daily-story", "daily-zodiac",
        "monthly-lucky", "monthly-summary", "monthly-zodiac",
        "weekly-days", "weekly-summary", "weekly-zodiac",
      ].sort(),
    );
  });
});
