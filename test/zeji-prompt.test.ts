// test/zeji-prompt.test.ts
import { describe, expect, it } from "vitest";
import { buildZejiSystemPrompt, buildZejiUserPrompt } from "../src/zeji/prompt";
import type { ZejiInterpretRequest, ZejiPerson } from "../src/zeji/types";

function baseReq(): ZejiInterpretRequest {
  return {
    lang: "zh",
    matter: "嫁娶",
    candidate: {
      solar: "2026-08-15", lunar: "七月初二", dayGanZhi: "甲子",
      zhiXing: "成", tianShenLuck: "吉", xiu: "参",
      jiShen: ["天德合", "天马"], xiongSha: ["四耗", "白虎"],
      chongShengXiao: "马", shaDirection: "南",
    },
    persons: [],
  };
}

describe("buildZejiSystemPrompt", () => {
  it("zh demands caveat wording and forbids AI mentions", () => {
    const s = buildZejiSystemPrompt("zh");
    expect(s).toContain("仅供参考");
    expect(s).not.toMatch(/AI|LLM/i);
  });
  it("en variant mentions caveat", () => {
    expect(buildZejiSystemPrompt("en")).toContain("for reference only");
  });
});

describe("buildZejiUserPrompt", () => {
  it("includes matter and candidate fields", () => {
    const u = buildZejiUserPrompt(baseReq());
    expect(u).toContain("嫁娶");
    expect(u).toContain("2026-08-15");
    expect(u).toContain("甲子");
    expect(u).toContain("天德合");
    expect(u).toContain("冲马");
  });
  it("includes pillar analysis when persons have pillars", () => {
    const r = baseReq();
    r.persons = [{ yearBranch: "午", pillars: { year: "庚午", month: "戊寅", day: "壬子", hour: "甲辰" } }] as ZejiPerson[];
    const u = buildZejiUserPrompt(r);
    expect(u).toContain("庚午");
    expect(u).toContain("五行");
  });
  it("omits pillar analysis when persons empty", () => {
    expect(buildZejiUserPrompt(baseReq())).not.toContain("五行");
  });
  it("en request produces English task block", () => {
    const r = baseReq();
    r.lang = "en";
    expect(buildZejiUserPrompt(r)).toMatch(/interpret|Interpret/);
  });
});
