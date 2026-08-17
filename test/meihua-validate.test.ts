import { describe, expect, it } from "vitest";
import { validateInterpretRequest } from "../src/meihua/validate";
import { numberRequest, validRequest } from "./fixtures/meihua-request";

describe("meihua validateInterpretRequest", () => {
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
      for (const solar of ["2026-08-18", "2026-08-18 14:30:00", "not-a-date"]) {
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
      (body as { numbers?: [number, number] }).numbers = [1, 2];
      expect(validateInterpretRequest(body).ok).toBe(false);
    });

    it("rejects number method with wrong arity or values", () => {
      const cases: unknown[][] = [[5], [5, 10, 3], [0, 10], [-1, 10], [1.5, 10], ["5", 10], [100001, 10]];
      for (const numbers of cases) {
        const body = numberRequest();
        body.numbers = numbers as never;
        expect(validateInterpretRequest(body).ok).toBe(false);
      }
    });

    it("rejects number method carrying solar/lunar", () => {
      const body = numberRequest();
      (body as { solar?: string }).solar = "2026-08-18 14:30";
      expect(validateInterpretRequest(body).ok).toBe(false);
    });

    it("accepts boundary numbers 1 and 100000", () => {
      const body = numberRequest();
      body.numbers = [1, 100000];
      expect(validateInterpretRequest(body).ok).toBe(true);
    });
  });

  it("rejects missing or malformed hexagrams", () => {
    for (const key of ["primary", "mutual", "changed"] as const) {
      const missing = validRequest();
      delete (missing as unknown as Record<string, unknown>)[key];
      expect(validateInterpretRequest(missing).ok).toBe(false);

      const badName = validRequest();
      badName[key] = { ...badName[key], name: "" };
      expect(validateInterpretRequest(badName).ok).toBe(false);

      const badStatement = validRequest();
      badStatement[key] = { ...badStatement[key], statement: "" };
      expect(validateInterpretRequest(badStatement).ok).toBe(false);

      const badUpper = validRequest();
      badUpper[key] = { ...badUpper[key], upper: "干" as never };
      expect(validateInterpretRequest(badUpper).ok).toBe(false);

      const badLower = validRequest();
      badLower[key] = { ...badLower[key], lower: "巛" as never };
      expect(validateInterpretRequest(badLower).ok).toBe(false);
    }
  });

  it("rejects invalid movingLine", () => {
    for (const line of [0, 7, 2.5, "2"]) {
      const body = validRequest();
      body.movingLine = line as never;
      expect(validateInterpretRequest(body).ok).toBe(false);
    }
  });

  it("rejects invalid body/application trigram info", () => {
    for (const key of ["body", "application"] as const) {
      const badTrigram = validRequest();
      badTrigram[key] = { ...badTrigram[key], trigram: "八卦" as never };
      expect(validateInterpretRequest(badTrigram).ok).toBe(false);

      const badElement = validRequest();
      badElement[key] = { ...badElement[key], element: "风" as never };
      expect(validateInterpretRequest(badElement).ok).toBe(false);
    }
  });
});
