import { describe, expect, it } from "vitest";
import { validateInterpretRequest } from "../src/ziwei/validate";
import { validBody } from "./fixtures/ziwei-request";

describe("validateInterpretRequest", () => {
  it("accepts a valid request", () => {
    expect(validateInterpretRequest(validBody()).ok).toBe(true);
  });

  it("accepts all three parts", () => {
    for (const part of ["mingpan", "daxian", "liunian"]) {
      expect(validateInterpretRequest(validBody(part)).ok).toBe(true);
    }
  });

  it("rejects non-object body", () => {
    expect(validateInterpretRequest("nope").ok).toBe(false);
    expect(validateInterpretRequest(null).ok).toBe(false);
  });

  it("rejects unknown part", () => {
    expect(validateInterpretRequest(validBody("tarot")).ok).toBe(false);
  });

  it("rejects unknown lang", () => {
    expect(validateInterpretRequest(validBody("mingpan", "fr")).ok).toBe(false);
  });

  it("rejects invalid gender", () => {
    const body = validBody();
    (body.chart as { gender: string }).gender = "other";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects malformed solar", () => {
    const body = validBody();
    body.chart.solar = "1990/08/15";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects palaces not of length 12", () => {
    const body = validBody();
    body.chart.palaces.pop();
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects unknown palace name", () => {
    const body = validBody();
    body.chart.palaces[5].name = "奴仆";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects invalid branch", () => {
    const body = validBody();
    body.chart.palaces[0].branch = "猫";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects invalid mutagen", () => {
    const body = validBody();
    body.chart.palaces[7].majors[0].mutagen = "喜";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects unknown minor kind", () => {
    const body = validBody();
    (body.chart.palaces[6].minors[0] as { kind: string }).kind = "凶";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects majors longer than 3", () => {
    const body = validBody();
    const m = { name: "紫微", brightness: "庙", mutagen: "" };
    body.chart.palaces[11].majors = [m, m, m, m];
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects missing decadal ageRange", () => {
    const body = validBody();
    delete body.chart.decadal.ageRange;
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects malformed decadal ageRange", () => {
    const body = validBody();
    body.chart.decadal.ageRange = "36~45";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects decadal palaceNames not 12", () => {
    const body = validBody();
    body.chart.decadal.palaceNames = body.chart.decadal.palaceNames.slice(0, 11);
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects scope mutagen not 4", () => {
    const body = validBody();
    body.chart.yearly.mutagen = ["天同", "天机", "文昌"];
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects yearly year out of range", () => {
    const body = validBody();
    body.chart.yearly.year = 1800;
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects overlong string field", () => {
    const body = validBody();
    body.chart.lunar = "月".repeat(61);
    expect(validateInterpretRequest(body).ok).toBe(false);
  });
});
