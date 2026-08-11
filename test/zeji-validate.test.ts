import { describe, expect, it } from "vitest";
import type { ZejiCandidate, ZejiPerson } from "../src/zeji/types";
import { validateZejiInterpretRequest } from "../src/zeji/validate";

type RequestBody = { lang: string; matter: string; candidate: ZejiCandidate; persons: ZejiPerson[] };

function validRequest(): RequestBody {
  return {
    lang: "zh",
    matter: "嫁娶",
    candidate: {
      solar: "2026-08-15", lunar: "七月初二", dayGanZhi: "甲子",
      zhiXing: "成", tianShenLuck: "吉", xiu: "参",
      jiShen: ["天德合", "天马"], xiongSha: ["四耗", "白虎"],
      chongShengXiao: "马", shaDirection: "南",
    },
    persons: [{ yearBranch: "午" }],
  };
}

describe("validateZejiInterpretRequest", () => {
  it("accepts a valid request", () => {
    expect(validateZejiInterpretRequest(validRequest()).ok).toBe(true);
  });
  it("rejects bad lang", () => {
    const b = validRequest() as Record<string, unknown>;
    b.lang = "fr";
    expect(validateZejiInterpretRequest(b)).toMatchObject({ ok: false });
  });
  it("rejects empty matter", () => {
    const b = validRequest();
    b.matter = "";
    expect(validateZejiInterpretRequest(b)).toMatchObject({ ok: false });
  });
  it("rejects malformed ganzhi in candidate", () => {
    const b = validRequest();
    b.candidate.dayGanZhi = "甲丑";
    expect(validateZejiInterpretRequest(b)).toMatchObject({ ok: false });
  });
  it("rejects yin-yang mismatched pillar", () => {
    const b = validRequest();
    b.persons = [{ pillars: { year: "甲丑", month: "丙寅", day: "戊辰", hour: "庚午" } }];
    expect(validateZejiInterpretRequest(b)).toMatchObject({ ok: false });
  });
  it("accepts yin-yang matched pillars", () => {
    const b = validRequest();
    b.persons = [{ pillars: { year: "甲子", month: "丙寅", day: "戊辰", hour: "庚午" } }];
    expect(validateZejiInterpretRequest(b).ok).toBe(true);
  });
  it("rejects bad yearBranch", () => {
    const b = validRequest();
    b.persons = [{ yearBranch: "猫" }];
    expect(validateZejiInterpretRequest(b)).toMatchObject({ ok: false });
  });
  it("rejects more than 2 persons", () => {
    const b = validRequest();
    b.persons = [{ yearBranch: "子" }, { yearBranch: "丑" }, { yearBranch: "寅" }];
    expect(validateZejiInterpretRequest(b)).toMatchObject({ ok: false });
  });
  it("accepts empty persons", () => {
    const b = validRequest();
    b.persons = [];
    expect(validateZejiInterpretRequest(b).ok).toBe(true);
  });
  it("rejects tianShenLuck other than 吉/凶", () => {
    const b = validRequest() as Record<string, unknown>;
    b.candidate = { ...validRequest().candidate, tianShenLuck: "中" };
    expect(validateZejiInterpretRequest(b)).toMatchObject({ ok: false });
  });
  it("rejects bad solar format", () => {
    const b = validRequest();
    b.candidate.solar = "2026/08/15";
    expect(validateZejiInterpretRequest(b)).toMatchObject({ ok: false });
  });
});
