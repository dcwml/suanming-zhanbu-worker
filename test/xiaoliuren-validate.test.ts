import { describe, expect, it } from "vitest";
import { validateInterpretRequest } from "../src/xiaoliuren/validate";
import { numberRequest, validRequest } from "./fixtures/xiaoliuren-request";

describe("xiaoliuren validateInterpretRequest", () => {
  it("accepts a valid time-cast request", () => {
    const r = validateInterpretRequest(validRequest());
    expect(r.ok).toBe(true);
  });

  it("accepts a valid number-cast request", () => {
    const r = validateInterpretRequest(numberRequest());
    expect(r.ok).toBe(true);
  });

  it("accepts en lang", () => {
    const body = validRequest();
    body.lang = "en";
    expect(validateInterpretRequest(body).ok).toBe(true);
  });

  it("rejects non-object bodies", () => {
    for (const body of [null, undefined, "str", 42, [1, 2]]) {
      expect(validateInterpretRequest(body).ok).toBe(false);
    }
  });

  it("rejects invalid lang", () => {
    const body = validRequest();
    body.lang = "fr" as never;
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects empty or overlong question", () => {
    const empty = validRequest();
    empty.question = "";
    expect(validateInterpretRequest(empty).ok).toBe(false);
    const long = validRequest();
    long.question = "问".repeat(201);
    expect(validateInterpretRequest(long).ok).toBe(false);
  });

  describe("method inputs", () => {
    it("rejects unknown method", () => {
      const body = validRequest();
      body.method = "text" as never;
      expect(validateInterpretRequest(body).ok).toBe(false);
    });

    it("rejects time method with malformed solar", () => {
      for (const solar of ["2026-08-16", "2026-08-16 12:30:00", "not-a-date"]) {
        const body = validRequest();
        body.solar = solar;
        expect(validateInterpretRequest(body).ok).toBe(false);
      }
    });

    it("rejects time method missing lunar", () => {
      const body = validRequest();
      delete (body as { lunar?: string }).lunar;
      expect(validateInterpretRequest(body).ok).toBe(false);
    });

    it("rejects time method carrying numbers", () => {
      const body = validRequest();
      (body as { numbers?: [number, number, number] }).numbers = [1, 2, 3];
      expect(validateInterpretRequest(body).ok).toBe(false);
    });

    it("rejects number method with wrong arity or values", () => {
      const cases: unknown[][] = [
        [3, 5],
        [3, 5, 7, 9],
        [0, 5, 7],
        [-1, 5, 7],
        [3, 1.5, 7],
        ["3", 5, 7],
        [100001, 5, 7],
      ];
      for (const numbers of cases) {
        const body = numberRequest();
        body.numbers = numbers as never;
        expect(validateInterpretRequest(body).ok).toBe(false);
      }
    });

    it("rejects number method carrying solar/lunar", () => {
      const body = numberRequest();
      (body as { solar?: string }).solar = "2026-08-16 12:30";
      expect(validateInterpretRequest(body).ok).toBe(false);
    });

    it("accepts boundary numbers 1 and 100000", () => {
      const body = numberRequest();
      body.numbers = [1, 100000, 1];
      expect(validateInterpretRequest(body).ok).toBe(true);
    });
  });

  it("rejects missing or unknown palaces", () => {
    for (const key of ["monthPalace", "dayPalace", "resultPalace"] as const) {
      const missing = validRequest();
      delete (missing as unknown as Record<string, unknown>)[key];
      expect(validateInterpretRequest(missing).ok).toBe(false);

      const bad = validRequest();
      bad[key] = "太乙" as never;
      expect(validateInterpretRequest(bad).ok).toBe(false);

      const empty = validRequest();
      empty[key] = "" as never;
      expect(validateInterpretRequest(empty).ok).toBe(false);
    }
  });

  it("accepts every one of the six palaces as result", () => {
    for (const palace of ["大安", "留连", "速喜", "赤口", "小吉", "空亡"] as const) {
      const body = validRequest();
      body.resultPalace = palace;
      expect(validateInterpretRequest(body).ok).toBe(true);
    }
  });
});
