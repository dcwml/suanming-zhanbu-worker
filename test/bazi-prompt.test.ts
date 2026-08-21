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

  it("forbids self-identification as artificial intelligence in the output", () => {
    expect(buildSystemPrompt("zh")).toContain("不要自称或提及人工智能");
    expect(buildSystemPrompt("en")).toContain("artificial intelligence");
    expect(buildSystemPrompt("zh")).not.toMatch(/AI|LLM/i);
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

  it("bazi part includes shensha overview when present", () => {
    const p = buildUserPrompt("bazi", "zh", chart);
    expect(p).toContain("命局神煞：吉神");
    expect(p).toContain("天乙贵人");
    expect(p).toContain("魁罡");
    expect(p).toContain("吉神");
    expect(p).toContain("凶煞");
  });

  it("bazi part omits shensha data line when field is absent (graceful degradation)", () => {
    const noSs = validChart();
    delete noSs.shenSha;
    const p = buildUserPrompt("bazi", "zh", noSs);
    // 任务指示文字含"命局神煞"四字，但不应出现数据行"命局神煞：吉神"
    expect(p).not.toContain("命局神煞：吉神");
  });

  it("bazi part omits shensha data line when both lists are empty", () => {
    const emptySs = validChart();
    emptySs.shenSha = { auspicious: [], inauspicious: [] };
    const p = buildUserPrompt("bazi", "zh", emptySs);
    expect(p).not.toContain("命局神煞：吉神");
  });

  it("dayun part lists all dayun and marks the current one", () => {
    const p = buildUserPrompt("dayun", "zh", chart);
    expect(p).toContain("壬午");
    expect(p).toContain("甲申");
    expect(p).toContain("当前大运");
  });

  it("liunian part includes now info, liunian and liuyue by ganzhi", () => {
    const p = buildUserPrompt("liunian", "zh", chart);
    expect(p).toContain("2026");
    expect(p).toContain("乙未月");
    expect(p).toContain("节气月");
    expect(p).toContain("当前月");
    expect(p).toContain("2026-07-31");
    // 不应出现纯公历月份序号格式（如 "7月 乙未"）
    expect(p).not.toMatch(/\d+月 [\u4e00-\u9fff]{2}/);
  });

  it("en prompt keeps chinese ganzhi terms", () => {
    const p = buildUserPrompt("bazi", "en", chart);
    expect(p).toContain("庚午");
  });
});
