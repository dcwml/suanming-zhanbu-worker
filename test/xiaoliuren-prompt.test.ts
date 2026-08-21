import { describe, expect, it } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "../src/xiaoliuren/prompt";
import { numberRequest, validRequest } from "./fixtures/xiaoliuren-request";

describe("xiaoliuren buildSystemPrompt", () => {
  it("zh prompt sets the Xiao Liu Ren master role and Chinese output", () => {
    const s = buildSystemPrompt("zh");
    expect(s).toContain("小六壬");
    expect(s).toContain("大安");
    expect(s).toContain("空亡");
    expect(s).toContain("全文使用中文");
  });

  it("en prompt requires English and carries a palace legend", () => {
    const s = buildSystemPrompt("en");
    expect(s).toContain("Xiao Liu Ren");
    expect(s).toContain("Respond entirely in English");
    expect(s).toContain("Da An");
    expect(s).toContain("Wood");
  });

  it("forbids self-identification as artificial intelligence in the output", () => {
    expect(buildSystemPrompt("zh")).toContain("不要自称或提及人工智能");
    expect(buildSystemPrompt("en")).toContain("artificial intelligence");
    expect(buildSystemPrompt("zh")).not.toMatch(/AI|LLM/i);
  });
});

describe("xiaoliuren buildUserPrompt", () => {
  it("zh time-cast prompt carries question, timing, three palaces and the result verse", () => {
    const p = buildUserPrompt(validRequest());
    expect(p).toContain("所求之事：这次出差谈的客户能不能签下来");
    expect(p).toContain("时间起课");
    expect(p).toContain("2026-08-16 12:30");
    expect(p).toContain("丙午年七月初三午时");
    expect(p).toContain("月宫：大安（青龙·木·大吉）");
    expect(p).toContain("日宫：速喜（朱雀·火·吉）");
    expect(p).toContain("落宫：速喜（朱雀·火·吉）");
    expect(p).toContain("速喜喜来临");
    expect(p).toContain("500 字左右");
  });

  it("zh number-cast prompt carries the three numbers instead of timing", () => {
    const p = buildUserPrompt(numberRequest());
    expect(p).toContain("数字起课");
    expect(p).toContain("所报数字：3、5、7");
    expect(p).not.toContain("公历时刻");
    expect(p).toContain("落宫：大安（青龙·木·大吉）");
    expect(p).toContain("大安事事昌");
  });

  it("en prompt is English-labelled and keeps canonical Chinese palace names", () => {
    const req = validRequest();
    req.lang = "en";
    const p = buildUserPrompt(req);
    expect(p).toContain("Question: ");
    expect(p).toContain("Casting method: time casting");
    expect(p).toContain("Month palace: 大安 (Da An (Great Peace) — Green Dragon, Wood, Great Fortune)");
    expect(p).toContain("Result palace: 速喜 (Su Xi (Swift Joy) — Vermilion Bird, Fire, Favorable)");
    expect(p).toContain("About 400 words");
  });
});
