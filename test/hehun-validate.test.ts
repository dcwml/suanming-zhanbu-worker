import { describe, expect, it } from "vitest";
import { validateInterpretRequest } from "../src/hehun/validate";
import { validRequest } from "./fixtures/hehun-request";

describe("validateInterpretRequest", () => {
  it("accepts a valid request", () => {
    expect(validateInterpretRequest(validRequest()).ok).toBe(true);
  });

  it("rejects non-object body", () => {
    expect(validateInterpretRequest("nope").ok).toBe(false);
    expect(validateInterpretRequest(null).ok).toBe(false);
  });

  it("rejects unknown lang", () => {
    const body = validRequest();
    (body as { lang: string }).lang = "fr";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects malformed male.solar", () => {
    const body = validRequest();
    body.male.solar = "1996/02/19";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects ganZhi outside the 60 jiazi cycle", () => {
    const body = validRequest();
    body.female.pillars.month.ganZhi = "丙丙";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects missing female hour pillar", () => {
    const body = validRequest();
    delete (body.female.pillars as { hour?: unknown }).hour;
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects overlong lunar text (>100 chars)", () => {
    const body = validRequest();
    body.male.lunar = "字".repeat(101);
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects wuxingCount with unknown element key", () => {
    const body = validRequest();
    (body.male.wuxingCount as Record<string, number>).风 = 1;
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects wuxingCount value out of range (9)", () => {
    const body = validRequest();
    body.male.wuxingCount.火 = 9;
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects unknown pairing enum values", () => {
    const body = validRequest();
    (body.pairing as { yearZhi: string }).yearZhi = "bogus";
    expect(validateInterpretRequest(body).ok).toBe(false);
    const body2 = validRequest();
    (body2.pairing as { dayGan: string }).dayGan = "chong";
    expect(validateInterpretRequest(body2).ok).toBe(false);
  });

  it("rejects missing pairing", () => {
    const body = validRequest();
    delete (body as { pairing?: unknown }).pairing;
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects missing male", () => {
    const body = validRequest();
    delete (body as { male?: unknown }).male;
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("does not echo user input in error message", () => {
    const body = validRequest();
    body.male.lunar = "我的秘密生日uniqueToken123";
    (body.pairing as { yearZhi: string }).yearZhi = "bogus";
    const r = validateInterpretRequest(body);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).not.toContain("uniqueToken123");
  });
});
