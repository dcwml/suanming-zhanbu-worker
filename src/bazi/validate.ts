import { LANGS } from "../config/site";
import type { InterpretRequest, Part } from "./types";

const PARTS: readonly Part[] = ["bazi", "dayun", "liunian"];
const GANS = "甲乙丙丁戊己庚辛壬癸";
const ZHIS = "子丑寅卯辰巳午未申酉戌亥";

/** 六十甲子集合（顺序生成，天然排除 甲丑 这类不合法组合） */
const JIAZI = new Set<string>();
for (let i = 0; i < 60; i++) JIAZI.add(GANS[i % 10] + ZHIS[i % 12]);

const MAX_STR = 100;

type Result = { ok: true; value: InterpretRequest } | { ok: false; message: string };

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isStr(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= MAX_STR;
}
function isNum(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
}
function isGanZhi(v: unknown): v is string {
  return typeof v === "string" && JIAZI.has(v);
}
function fail(message: string): Result {
  return { ok: false, message };
}

function checkPillar(v: unknown, name: string): string | null {
  if (!isObj(v)) return `pillars.${name} must be an object`;
  if (!isGanZhi(v.ganZhi)) return `pillars.${name}.ganZhi is not a valid GanZhi`;
  for (const key of ["shiShenGan", "hideGan", "shiShenZhi", "naYin", "xunKong"] as const) {
    if (!isStr(v[key])) return `pillars.${name}.${key} is invalid`;
  }
  return null;
}

/** 校验请求体结构（8KB 体积上限由路由层在读 text 阶段把关，见 Task 5） */
export function validateInterpretRequest(body: unknown): Result {
  if (!isObj(body)) return fail("body must be a JSON object");
  if (typeof body.part !== "string" || !PARTS.includes(body.part as Part))
    return fail("part must be one of bazi/dayun/liunian");
  if (typeof body.lang !== "string" || !(LANGS as readonly string[]).includes(body.lang))
    return fail("lang must be zh or en");

  const chart = body.chart;
  if (!isObj(chart)) return fail("chart must be an object");
  if (chart.gender !== "male" && chart.gender !== "female") return fail("chart.gender is invalid");
  if (!isStr(chart.solar) || !isStr(chart.lunar)) return fail("chart.solar/lunar is invalid");
  if (!isStr(chart.dayMaster) || !isStr(chart.qiYun)) return fail("chart.dayMaster/qiYun is invalid");

  if (!isObj(chart.pillars)) return fail("chart.pillars must be an object");
  for (const name of ["year", "month", "day", "hour"] as const) {
    const err = checkPillar(chart.pillars[name], name);
    if (err) return fail(err);
  }

  if (!isObj(chart.wuxingCount)) return fail("chart.wuxingCount must be an object");
  const wxKeys = Object.keys(chart.wuxingCount);
  if (wxKeys.length > 5) return fail("chart.wuxingCount has too many keys");
  for (const k of wxKeys) {
    if (k.length !== 1 || !"金木水火土".includes(k)) return fail("chart.wuxingCount has unknown key");
    if (!isNum(chart.wuxingCount[k], 0, 8)) return fail("chart.wuxingCount value is invalid");
  }

  if (!Array.isArray(chart.daYun) || chart.daYun.length === 0 || chart.daYun.length > 12)
    return fail("chart.daYun must be an array of 1-12 items");
  let currentCount = 0;
  for (const d of chart.daYun as unknown[]) {
    if (!isObj(d) || !isGanZhi(d.ganZhi)) return fail("daYun.ganZhi is invalid");
    if (!isNum(d.startAge, 0, 120) || !isNum(d.startYear, 1800, 2200) || !isNum(d.endYear, 1800, 2300))
      return fail("daYun age/year is invalid");
    if (typeof d.isCurrent !== "boolean") return fail("daYun.isCurrent is invalid");
    if (d.isCurrent) currentCount++;
  }
  if (currentCount > 1) return fail("daYun has more than one current entry");

  const now = chart.now;
  if (!isObj(now)) return fail("chart.now must be an object");
  if (typeof now.solar !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(now.solar))
    return fail("now.solar must be YYYY-MM-DD");
  if (!isStr(now.lunar)) return fail("now.lunar is invalid");
  if (!isObj(now.ganZhi) || !isGanZhi(now.ganZhi.year) || !isGanZhi(now.ganZhi.month) || !isGanZhi(now.ganZhi.day))
    return fail("now.ganZhi is invalid");

  if (!Array.isArray(now.liuNian) || now.liuNian.length === 0 || now.liuNian.length > 10)
    return fail("now.liuNian must be an array of 1-10 items");
  for (const n of now.liuNian as unknown[]) {
    if (!isObj(n) || !isNum(n.year, 1800, 2300) || !isGanZhi(n.ganZhi) || !isNum(n.age, 1, 130))
      return fail("liuNian item is invalid");
  }
  if (!Array.isArray(now.liuYue) || now.liuYue.length === 0 || now.liuYue.length > 12)
    return fail("now.liuYue must be an array of 1-12 items");
  for (const m of now.liuYue as unknown[]) {
    if (!isObj(m) || !isNum(m.month, 1, 12) || !isGanZhi(m.ganZhi)) return fail("liuYue item is invalid");
  }

  return { ok: true, value: body as unknown as InterpretRequest };
}
