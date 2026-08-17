import { LANGS } from "../config/site";
import { ELEMENTS, TRIGRAMS, type InterpretRequest } from "./types";

const MAX_QUESTION = 200;
const MAX_NAME = 50;
const MAX_STATEMENT = 300;
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
    if (!Array.isArray(body.numbers) || body.numbers.length !== 2)
      return fail("numbers must be an array of 2 items");
    for (const v of body.numbers as unknown[]) {
      if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > MAX_NUMBER)
        return fail("numbers contains an invalid value");
    }
    if (body.solar !== undefined || body.lunar !== undefined)
      return fail("solar/lunar must be omitted for number method");
  } else {
    return fail("method must be time or number");
  }

  const p = checkHex(body.primary);
  if (p) return fail(`primary: ${p}`);
  const m = checkHex(body.mutual);
  if (m) return fail(`mutual: ${m}`);
  const c = checkHex(body.changed);
  if (c) return fail(`changed: ${c}`);

  if (typeof body.movingLine !== "number" || !Number.isInteger(body.movingLine) || body.movingLine < 1 || body.movingLine > 6)
    return fail("movingLine must be an integer between 1 and 6");

  const b = checkTrigramInfo(body.body);
  if (b) return fail(`body: ${b}`);
  const a = checkTrigramInfo(body.application);
  if (a) return fail(`application: ${a}`);

  return { ok: true, value: body as unknown as InterpretRequest };
}

function checkHex(v: unknown): string | null {
  if (!isObj(v)) return "must be an object";
  if (!isNonEmptyStr(v.name, MAX_NAME)) return "name is invalid";
  if (!isNonEmptyStr(v.statement, MAX_STATEMENT)) return "statement is invalid";
  if (typeof v.upper !== "string" || !(TRIGRAMS as readonly string[]).includes(v.upper))
    return "upper must be a trigram name";
  if (typeof v.lower !== "string" || !(TRIGRAMS as readonly string[]).includes(v.lower))
    return "lower must be a trigram name";
  return null;
}

function checkTrigramInfo(v: unknown): string | null {
  if (!isObj(v)) return "must be an object";
  if (typeof v.trigram !== "string" || !(TRIGRAMS as readonly string[]).includes(v.trigram))
    return "trigram is invalid";
  if (typeof v.element !== "string" || !(ELEMENTS as readonly string[]).includes(v.element))
    return "element is invalid";
  return null;
}
