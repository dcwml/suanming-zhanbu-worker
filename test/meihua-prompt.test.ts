import { describe, expect, it } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "../src/meihua/prompt";
import { numberRequest, validRequest } from "./fixtures/meihua-request";

describe("meihua buildSystemPrompt", () => {
  it("zh prompt sets the Plum Blossom master role and Chinese output", () => {
    const s = buildSystemPrompt("zh");
    expect(s).toContain("梅花易数");
    expect(s).toContain("体用");
    expect(s).toContain("全文使用中文");
  });

  it("en prompt requires English and carries a trigram legend", () => {
    const s = buildSystemPrompt("en");
    expect(s).toContain("Plum Blossom");
    expect(s).toContain("Respond entirely in English");
    expect(s).toContain("乾 Qian");
    expect(s).toContain("Metal");
  });

  it("forbids self-identification as artificial intelligence in the output", () => {
    expect(buildSystemPrompt("zh")).toContain("不要自称或提及人工智能");
    expect(buildSystemPrompt("en")).toContain("artificial intelligence");
    expect(buildSystemPrompt("zh")).not.toMatch(/AI|LLM/i);
  });
});

describe("meihua buildUserPrompt", () => {
  it("zh time-cast prompt carries question, timing, three hexagrams, moving line and ti-yong", () => {
    const p = buildUserPrompt(validRequest());
    expect(p).toContain("所求之事：近期洽谈的合作能否谈成");
    expect(p).toContain("时间起卦");
    expect(p).toContain("2026-08-18 14:30");
    expect(p).toContain("丙午年七月初五未时");
    expect(p).toContain("本卦：火天大有（上离下乾）");
    expect(p).toContain("互卦：泽天夬");
    expect(p).toContain("变卦：离为火");
    expect(p).toContain("动爻：第2爻（二爻）");
    expect(p).toContain("体卦：离（五行火）");
    expect(p).toContain("用卦：乾（五行金）");
  });

  it("zh number-cast prompt carries the two numbers instead of timing", () => {
    const p = buildUserPrompt(numberRequest());
    expect(p).toContain("数字起卦");
    expect(p).toContain("所报数字：5、10");
    expect(p).not.toContain("公历时刻");
    expect(p).toContain("本卦：风泽中孚（上巽下兑）");
  });

  it("en prompt is English-labelled and keeps canonical Chinese names", () => {
    const req = validRequest();
    req.lang = "en";
    const p = buildUserPrompt(req);
    expect(p).toContain("Question: ");
    expect(p).toContain("Casting method: time casting");
    expect(p).toContain("Primary hexagram: 火天大有 (离 above, 乾 below)");
    expect(p).toContain("Mutual hexagram: 泽天夬");
    expect(p).toContain("Changed hexagram: 离为火");
    expect(p).toContain("Moving line: line 2");
    expect(p).toContain("Body trigram: 离 (火)");
    expect(p).toContain("About 400 words");
  });
});
