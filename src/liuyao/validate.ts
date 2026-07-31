import { LANGS } from "../config/site";
import type { InterpretRequest } from "./types";

const VALID_LINES = new Set([6, 7, 8, 9]);
const MAX_QUESTION = 200;
const MAX_TEXT = 300;

type Result = { ok: true; value: InterpretRequest } | { ok: false; message: string };

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isNonEmptyStr(v: unknown, max: number): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= max;
}
function fail(message: string): Result {
  return { ok: false, message };
}

export function validateInterpretRequest(body: unknown): Result {
  if (!isObj(body)) return fail("body must be a JSON object");
  if (typeof body.lang !== "string" || !(LANGS as readonly string[]).includes(body.lang))
    return fail("lang must be zh or en");
  if (!isNonEmptyStr(body.question, MAX_QUESTION)) return fail("question is invalid");

  // lines：长度 6 且每项 ∈ {6,7,8,9}
  if (!Array.isArray(body.lines) || body.lines.length !== 6) return fail("lines must be an array of 6 items");
  for (const v of body.lines as unknown[]) {
    if (typeof v !== "number" || !VALID_LINES.has(v)) return fail("lines contains an invalid value");
  }

  // now.solar
  const now = body.now;
  if (!isObj(now) || typeof now.solar !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(now.solar))
    return fail("now.solar must be YYYY-MM-DD");

  // primary（必填）
  const p = checkHexText(body.primary);
  if (p) return fail(p);

  // changed（可选）
  if (body.changed !== undefined) {
    const c = checkHexText(body.changed);
    if (c) return fail(c);
  }

  // moving（可选，空数组等价于省略）
  if (body.moving !== undefined && (!Array.isArray(body.moving) || body.moving.length > 6))
    return fail("moving must be an array of at most 6 items");
  if (Array.isArray(body.moving)) {
    for (const m of body.moving as unknown[]) {
      if (!isObj(m)) return fail("moving item is invalid");
      if (typeof m.position !== "number" || m.position < 1 || m.position > 6 || !Number.isInteger(m.position))
        return fail("moving.position is invalid");
      if (!isNonEmptyStr(m.text, MAX_TEXT)) return fail("moving.text is invalid");
    }
  }

  return { ok: true, value: body as unknown as InterpretRequest };
}

function checkHexText(v: unknown): string | null {
  if (!isObj(v)) return "hexagram text must be an object";
  if (!isNonEmptyStr(v.name, MAX_TEXT)) return "hexagram name is invalid";
  if (!isNonEmptyStr(v.statement, MAX_TEXT)) return "hexagram statement is invalid";
  return null;
}
