import { LANGS } from "../config/site";
import { PALACE_NAMES, type InterpretRequest } from "./types";

const MAX_QUESTION = 200;
const MAX_LUNAR = 60;
const MAX_NUMBER = 100000;
const SOLAR_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

type Result = { ok: true; value: InterpretRequest } | { ok: false; message: string };

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isNonEmptyStr(v: unknown, max: number): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= max;
}
function isPalace(v: unknown): boolean {
  return typeof v === "string" && (PALACE_NAMES as readonly string[]).includes(v);
}
function fail(message: string): Result {
  return { ok: false, message };
}

export function validateInterpretRequest(body: unknown): Result {
  if (!isObj(body)) return fail("body must be a JSON object");
  if (typeof body.lang !== "string" || !(LANGS as readonly string[]).includes(body.lang))
    return fail("lang must be zh or en");
  if (!isNonEmptyStr(body.question, MAX_QUESTION)) return fail("question is invalid");

  // method 与对应的输入字段（两种方式的字段不得混用）
  if (body.method === "time") {
    if (typeof body.solar !== "string" || !SOLAR_RE.test(body.solar))
      return fail("solar must be YYYY-MM-DD HH:mm");
    if (!isNonEmptyStr(body.lunar, MAX_LUNAR)) return fail("lunar is invalid");
    if (body.numbers !== undefined) return fail("numbers must be omitted for time method");
  } else if (body.method === "number") {
    if (!Array.isArray(body.numbers) || body.numbers.length !== 3)
      return fail("numbers must be an array of 3 items");
    for (const v of body.numbers as unknown[]) {
      if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > MAX_NUMBER)
        return fail("numbers contains an invalid value");
    }
    if (body.solar !== undefined || body.lunar !== undefined)
      return fail("solar/lunar must be omitted for number method");
  } else {
    return fail("method must be time or number");
  }

  for (const key of ["monthPalace", "dayPalace", "resultPalace"] as const) {
    if (!isPalace(body[key])) return fail(`${key} must be one of the six palaces`);
  }

  return { ok: true, value: body as unknown as InterpretRequest };
}
