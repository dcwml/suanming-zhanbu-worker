import { describe, expect, it } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "../src/bazi/prompt";
import { validChart } from "./fixtures/bazi-chart";

describe("buildSystemPrompt", () => {
  it("zh prompt asks for Markdown output in Chinese", () => {
    const s = buildSystemPrompt("zh");
    expect(s).toContain("Markdown");
    expect(s).toContain("中文");
  });

  it("en prompt asks for English output", () => {
    const s = buildSystemPrompt("en");
    expect(s).toContain("Markdown");
    expect(s).toContain("English");
  });
});

describe("buildUserPrompt", () => {
  const chart = validChart();

  it("bazi part includes four pillars and day master, no liuyue", () => {
    const p = buildUserPrompt("bazi", "zh", chart);
    expect(p).toContain("庚午");
    expect(p).toContain("癸未");
    expect(p).toContain("庚金");
    expect(p).not.toContain("流月");
  });

  it("dayun part lists all dayun and marks the current one", () => {
    const p = buildUserPrompt("dayun", "zh", chart);
    expect(p).toContain("壬午");
    expect(p).toContain("甲申");
    expect(p).toContain("当前大运");
  });

  it("liunian part includes now info, liunian and liuyue", () => {
    const p = buildUserPrompt("liunian", "zh", chart);
    expect(p).toContain("2026");
    expect(p).toContain("乙未");
    expect(p).toContain("流月");
    expect(p).toContain("2026-07-31");
  });

  it("en prompt keeps chinese ganzhi terms", () => {
    const p = buildUserPrompt("bazi", "en", chart);
    expect(p).toContain("庚午");
  });
});
