import { describe, expect, it } from "vitest";
import { validateInterpretRequest } from "../src/liuyao/validate";
import { validRequest, staticRequest } from "./fixtures/liuyao-request";

describe("validateInterpretRequest", () => {
  it("accepts a valid request with moving lines", () => {
    expect(validateInterpretRequest(validRequest()).ok).toBe(true);
  });

  it("accepts a valid request with 0 moving lines (no changed/moving)", () => {
    expect(validateInterpretRequest(staticRequest()).ok).toBe(true);
  });

  it("accepts empty moving array as equivalent to absent", () => {
    const body = validRequest();
    body.moving = [];
    delete body.changed;
    expect(validateInterpretRequest(body).ok).toBe(true);
  });

  it("rejects non-object body", () => {
    expect(validateInterpretRequest("nope").ok).toBe(false);
    expect(validateInterpretRequest(null).ok).toBe(false);
  });

  it("rejects lines with wrong length", () => {
    const body = validRequest();
    (body as { lines: number[] }).lines = [7, 8, 9];
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects lines with invalid value (5)", () => {
    const body = validRequest();
    (body as { lines: number[] }).lines = [7, 5, 8, 6, 7, 8];
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects empty question", () => {
    const body = validRequest();
    body.question = "";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects overlong question (>200 chars)", () => {
    const body = validRequest();
    body.question = "事".repeat(201);
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects unknown lang", () => {
    const body = validRequest();
    (body as { lang: string }).lang = "fr";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects malformed now.solar", () => {
    const body = validRequest();
    body.now.solar = "2026/08/01";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects missing primary", () => {
    const body = validRequest();
    delete (body as { primary?: unknown }).primary;
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects overlong primary.statement (>300 chars)", () => {
    const body = validRequest();
    body.primary.statement = "字".repeat(301);
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects moving item with invalid position (0)", () => {
    const body = validRequest();
    body.moving = [{ position: 0, text: "text" }];
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects moving item with invalid position (7)", () => {
    const body = validRequest();
    body.moving = [{ position: 7, text: "text" }];
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects moving array longer than 6", () => {
    const body = validRequest();
    body.moving = Array.from({ length: 7 }, (_, i) => ({ position: i + 1, text: "t" }));
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("does not echo user input in error message", () => {
    const body = validRequest();
    body.question = "我的秘密问题uniqueToken123";
    (body as { lines: number[] }).lines = [1, 2, 3, 4, 5, 6];
    const r = validateInterpretRequest(body);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).not.toContain("uniqueToken123");
  });
});
