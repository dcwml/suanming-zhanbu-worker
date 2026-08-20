import { LANGS } from "../config/site";
import type { InterpretRequest } from "./types";

/** 六十甲子全集（ganZhi 白名单） */
const JIAZI = new Set([
  "甲子", "乙丑", "丙寅", "丁卯", "戊辰", "己巳", "庚午", "辛未", "壬申", "癸酉",
  "甲戌", "乙亥", "丙子", "丁丑", "戊寅", "己卯", "庚辰", "辛巳", "壬午", "癸未",
  "甲申", "乙酉", "丙戌", "丁亥", "戊子", "己丑", "庚寅", "辛卯", "壬辰", "癸巳",
  "甲午", "乙未", "丙申", "丁酉", "戊戌", "己亥", "庚子", "辛丑", "壬寅", "癸卯",
  "甲辰", "乙巳", "丙午", "丁未", "戊申", "己酉", "庚戌", "辛亥", "壬子", "癸丑",
  "甲寅", "乙卯", "丙辰", "丁巳", "戊午", "己未", "庚申", "辛酉", "壬戌", "癸亥",
]);

const BRANCH_RELATIONS = new Set(["liuhe", "sanhe", "chong", "hai", "same", "none"]);
const STEM_RELATIONS = new Set(["wuhe", "none"]);
const WUXING = new Set(["金", "木", "水", "火", "土"]);

const MAX_TEXT = 100;

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

/** 校验单人命盘：solar 日期格式 + 四柱干支 ∈ 六十甲子 + 文本上限 + 五行统计结构 */
function checkPerson(v: unknown, field: string): string | null {
  if (!isObj(v)) return `${field} must be an object`;
  if (typeof v.solar !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.solar))
    return `${field}.solar must be YYYY-MM-DD`;
  if (!isNonEmptyStr(v.lunar, MAX_TEXT)) return `${field}.lunar is invalid`;
  if (!isNonEmptyStr(v.dayMaster, MAX_TEXT)) return `${field}.dayMaster is invalid`;
  if (!isObj(v.pillars)) return `${field}.pillars must be an object`;
  for (const k of ["year", "month", "day", "hour"] as const) {
    const p = v.pillars[k];
    if (!isObj(p)) return `${field}.pillars.${k} must be an object`;
    if (typeof p.ganZhi !== "string" || !JIAZI.has(p.ganZhi)) return `${field}.pillars.${k}.ganZhi is invalid`;
    if (!isNonEmptyStr(p.hideGan, MAX_TEXT)) return `${field}.pillars.${k}.hideGan is invalid`;
    if (!isNonEmptyStr(p.naYin, MAX_TEXT)) return `${field}.pillars.${k}.naYin is invalid`;
  }
  if (!isObj(v.wuxingCount)) return `${field}.wuxingCount must be an object`;
  const keys = Object.keys(v.wuxingCount);
  if (keys.length === 0 || keys.length > 5) return `${field}.wuxingCount is invalid`;
  for (const k of keys) {
    if (!WUXING.has(k)) return `${field}.wuxingCount has an unknown element`;
    const n = v.wuxingCount[k];
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 8)
      return `${field}.wuxingCount values are invalid`;
  }
  return null;
}

export function validateInterpretRequest(body: unknown): Result {
  if (!isObj(body)) return fail("body must be a JSON object");
  if (typeof body.lang !== "string" || !(LANGS as readonly string[]).includes(body.lang))
    return fail("lang must be zh or en");

  const male = checkPerson(body.male, "male");
  if (male) return fail(male);
  const female = checkPerson(body.female, "female");
  if (female) return fail(female);

  if (!isObj(body.pairing)) return fail("pairing must be an object");
  if (typeof body.pairing.yearZhi !== "string" || !BRANCH_RELATIONS.has(body.pairing.yearZhi))
    return fail("pairing.yearZhi is invalid");
  if (typeof body.pairing.dayZhi !== "string" || !BRANCH_RELATIONS.has(body.pairing.dayZhi))
    return fail("pairing.dayZhi is invalid");
  if (typeof body.pairing.dayGan !== "string" || !STEM_RELATIONS.has(body.pairing.dayGan))
    return fail("pairing.dayGan is invalid");

  return { ok: true, value: body as unknown as InterpretRequest };
}
