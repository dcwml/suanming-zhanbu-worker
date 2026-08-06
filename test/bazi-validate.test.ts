import { describe, expect, it } from "vitest";
import { validateInterpretRequest } from "../src/bazi/validate";
import { validBody } from "./fixtures/bazi-chart";

describe("validateInterpretRequest", () => {
  it("accepts a valid request", () => {
    const r = validateInterpretRequest(validBody());
    expect(r.ok).toBe(true);
  });

  it("rejects non-object body", () => {
    expect(validateInterpretRequest("nope").ok).toBe(false);
    expect(validateInterpretRequest(null).ok).toBe(false);
  });

  it("rejects unknown part", () => {
    const body = validBody("tarot");
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects unknown lang", () => {
    const body = validBody("bazi", "fr");
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects invalid ganzhi combination (甲丑 不在六十甲子)", () => {
    const body = validBody();
    body.chart.pillars.year.ganZhi = "甲丑";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects overlong string field", () => {
    const body = validBody();
    body.chart.qiYun = "运".repeat(101);
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects missing pillar", () => {
    const body = validBody();
    delete (body.chart.pillars as Record<string, unknown>).hour;
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects invalid gender", () => {
    const body = validBody();
    (body.chart as { gender: string }).gender = "other";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects liuYue longer than 12", () => {
    const body = validBody();
    body.chart.now.liuYue = Array.from({ length: 13 }, () => ({ month: 1, ganZhi: "己丑" }));
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects malformed now.solar", () => {
    const body = validBody();
    body.chart.now.solar = "2026/07/31";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects wuxingCount with unknown key", () => {
    const body = validBody();
    (body.chart.wuxingCount as Record<string, number>)["风"] = 1;
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("accepts request without shensha (optional field)", () => {
    const body = validBody();
    delete (body.chart as { shenSha?: unknown }).shenSha;
    expect(validateInterpretRequest(body).ok).toBe(true);
  });
});
