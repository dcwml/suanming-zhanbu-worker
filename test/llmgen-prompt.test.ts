import { describe, expect, it } from "vitest";
import { compute } from "../src/almanac/compute";
import { dailyGenerators } from "../src/llmgen/daily";
import type { DailyGenerateData } from "../src/llmgen/types";

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
