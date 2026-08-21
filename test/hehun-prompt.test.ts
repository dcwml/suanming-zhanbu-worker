import { describe, expect, it } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "../src/hehun/prompt";
import { validRequest } from "./fixtures/hehun-request";

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
  it("includes both charts with pillars, day masters and element tallies", () => {
    const req = validRequest();
    const p = buildUserPrompt(req);
    expect(p).toContain("男方命盘");
    expect(p).toContain("女方命盘");
    expect(p).toContain("1996-02-19");
    expect(p).toContain("一九九六年正月初一 午时");
    expect(p).toContain("丙火");
    expect(p).toContain("庚金");
    expect(p).toContain("丙子");
    expect(p).toContain("庚戌");
    expect(p).toContain("金1 木2 水1 火3 土1");
    expect(p).toContain("六个部分");
  });

  it("includes pairing relations with branch/stem chars", () => {
    const req = validRequest();
    const p = buildUserPrompt(req);
    expect(p).toContain("年支关系：六合（子丑）");
    expect(p).toContain("日支关系：同支（戌戌）");
    expect(p).toContain("日干关系：无五合（丙庚）");
  });

  it("maps clash and stem five-union labels", () => {
    const req = validRequest();
    req.male.pillars.year.ganZhi = "甲子";
    req.female.pillars.year.ganZhi = "庚午";
    req.pairing.yearZhi = "chong";
    req.male.pillars.day.ganZhi = "丙戌";
    req.female.pillars.day.ganZhi = "辛未";
    req.pairing.dayGan = "wuhe";
    const p = buildUserPrompt(req);
    expect(p).toContain("年支关系：相冲（子午）");
    expect(p).toContain("日干关系：天干五合（丙辛）");
  });

  it("en prompt keeps chinese chart labels and asks for the six-part reading", () => {
    const req = validRequest();
    req.lang = "en";
    const p = buildUserPrompt(req);
    expect(p).toContain("男方命盘");
    expect(p).toContain("six parts");
  });
});
