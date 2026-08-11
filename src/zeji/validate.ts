import { LANGS } from "../config/site";
import type { ZejiInterpretRequest } from "./types";

const GANZHI_RE = /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/;
const BRANCH_RE = /^[子丑寅卯辰巳午未申酉戌亥]$/;
const YANG_GAN = new Set(["甲", "丙", "戊", "庚", "壬"]);
const YANG_ZHI = new Set(["子", "寅", "辰", "午", "申", "戌"]);
const MAX_MATTER = 10;
const MAX_LUNAR = 30;
const MAX_SHA = 20;      // jiShen/xiongSha 数组长度上限
const MAX_SHA_ITEM = 8;  // 单项字符上限
const MAX_PERSONS = 2;

type Result = { ok: true; value: ZejiInterpretRequest } | { ok: false; message: string };

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isStrArr(v: unknown, maxLen: number, maxItem: number): v is string[] {
  return Array.isArray(v) && v.length <= maxLen && v.every((x) => typeof x === "string" && x.length > 0 && x.length <= maxItem);
}
/** 干支阴阳相配：阳干配阳支、阴干配阴支 */
function ganzhiMatched(gz: string): boolean {
  return YANG_GAN.has(gz[0]) === YANG_ZHI.has(gz[1]);
}
function fail(message: string): Result {
  return { ok: false, message };
}

export function validateZejiInterpretRequest(body: unknown): Result {
  if (!isObj(body)) return fail("body must be a JSON object");
  if (typeof body.lang !== "string" || !(LANGS as readonly string[]).includes(body.lang))
    return fail("lang must be zh or en");
  if (typeof body.matter !== "string" || body.matter.length === 0 || body.matter.length > MAX_MATTER)
    return fail("matter is invalid");

  const c = body.candidate;
  if (!isObj(c)) return fail("candidate must be a JSON object");
  if (typeof c.solar !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(c.solar)) return fail("candidate.solar must be YYYY-MM-DD");
  if (typeof c.lunar !== "string" || c.lunar.length === 0 || c.lunar.length > MAX_LUNAR) return fail("candidate.lunar is invalid");
  if (typeof c.dayGanZhi !== "string" || !GANZHI_RE.test(c.dayGanZhi) || !ganzhiMatched(c.dayGanZhi)) return fail("candidate.dayGanZhi is invalid");
  if (typeof c.zhiXing !== "string" || c.zhiXing.length === 0 || c.zhiXing.length > 4) return fail("candidate.zhiXing is invalid");
  if (c.tianShenLuck !== "吉" && c.tianShenLuck !== "凶") return fail("candidate.tianShenLuck must be 吉 or 凶");
  if (typeof c.xiu !== "string" || c.xiu.length === 0 || c.xiu.length > 4) return fail("candidate.xiu is invalid");
  if (!isStrArr(c.jiShen, MAX_SHA, MAX_SHA_ITEM)) return fail("candidate.jiShen is invalid");
  if (!isStrArr(c.xiongSha, MAX_SHA, MAX_SHA_ITEM)) return fail("candidate.xiongSha is invalid");
  if (typeof c.chongShengXiao !== "string" || c.chongShengXiao.length === 0 || c.chongShengXiao.length > 4) return fail("candidate.chongShengXiao is invalid");
  if (typeof c.shaDirection !== "string" || !/^[东南西北]$/.test(c.shaDirection)) return fail("candidate.shaDirection is invalid");

  if (!Array.isArray(body.persons) || body.persons.length > MAX_PERSONS) return fail("persons must be an array of at most 2 items");
  for (const p of body.persons as unknown[]) {
    if (!isObj(p)) return fail("person is invalid");
    if (p.yearBranch !== undefined && (typeof p.yearBranch !== "string" || !BRANCH_RE.test(p.yearBranch)))
      return fail("person.yearBranch is invalid");
    if (p.pillars !== undefined) {
      if (!isObj(p.pillars)) return fail("person.pillars is invalid");
      for (const key of ["year", "month", "day", "hour"] as const) {
        const gz = p.pillars[key];
        if (typeof gz !== "string" || !GANZHI_RE.test(gz) || !ganzhiMatched(gz)) return fail(`person.pillars.${key} is invalid`);
      }
      if (typeof p.yearBranch === "string" && typeof p.pillars.year === "string" && p.pillars.year[1] !== p.yearBranch)
        return fail("person.yearBranch must match pillars.year");
    }
    if (p.yearBranch === undefined && p.pillars === undefined) return fail("person must carry yearBranch or pillars");
  }

  return { ok: true, value: body as unknown as ZejiInterpretRequest };
}
