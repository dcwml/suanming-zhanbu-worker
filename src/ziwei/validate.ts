import { LANGS } from "../config/site";
import type { InterpretRequest, Part } from "./types";

const PARTS: readonly Part[] = ["mingpan", "daxian", "liunian"];
const GANS = "甲乙丙丁戊己庚辛壬癸";
const ZHIS = "子丑寅卯辰巳午未申酉戌亥";

/** 六十甲子集合（顺序生成，天然排除 甲丑 这类不合法组合） */
const JIAZI = new Set<string>();
for (let i = 0; i < 60; i++) JIAZI.add(GANS[i % 10] + ZHIS[i % 12]);

/** 十二宫规范名（iztro 默认用「仆役」而非「交友」，校验只认规范名） */
const PALACE_NAMES = new Set([
  "命宫", "兄弟", "夫妻", "子女", "财帛", "疾厄",
  "迁移", "仆役", "官禄", "田宅", "福德", "父母",
]);
const MUTAGENS = "禄权科忌";
const MINOR_KINDS = new Set(["吉", "煞", "禄", "马"]);
const MAX_STR = 60;

type Result = { ok: true; value: InterpretRequest } | { ok: false; message: string };

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isStr(v: unknown, max: number = MAX_STR): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= max;
}
function isGanZhi(v: unknown): v is string {
  return typeof v === "string" && JIAZI.has(v);
}
function isBranch(v: unknown): v is string {
  return typeof v === "string" && ZHIS.includes(v);
}
/** 四化：空串（未四化）或禄/权/科/忌单字 */
function isMutagen(v: unknown): v is string {
  return v === "" || (typeof v === "string" && v.length === 1 && MUTAGENS.includes(v));
}
function fail(message: string): Result {
  return { ok: false, message };
}

function checkPalace(v: unknown, i: number): string | null {
  if (!isObj(v)) return `palaces[${i}] must be an object`;
  if (typeof v.name !== "string" || !PALACE_NAMES.has(v.name)) return `palaces[${i}].name is unknown`;
  if (!isBranch(v.branch)) return `palaces[${i}].branch is invalid`;
  if (typeof v.isBody !== "boolean") return `palaces[${i}].isBody is invalid`;
  if (!Array.isArray(v.majors) || v.majors.length > 3) return `palaces[${i}].majors is invalid`;
  for (const m of v.majors as unknown[]) {
    if (!isObj(m) || !isStr(m.name) || !isStr(m.brightness, 4) || !isMutagen(m.mutagen))
      return `palaces[${i}].majors item is invalid`;
  }
  if (!Array.isArray(v.minors) || v.minors.length > 8) return `palaces[${i}].minors is invalid`;
  for (const m of v.minors as unknown[]) {
    if (!isObj(m) || !isStr(m.name) || typeof m.kind !== "string" || !MINOR_KINDS.has(m.kind) || !isMutagen(m.mutagen))
      return `palaces[${i}].minors item is invalid`;
  }
  return null;
}

function checkScope(v: unknown, name: string, withAgeRange: boolean): string | null {
  if (!isObj(v)) return `${name} must be an object`;
  if (!isGanZhi(v.ganZhi)) return `${name}.ganZhi is not a valid GanZhi`;
  if (withAgeRange) {
    if (typeof v.ageRange !== "string" || !/^\d{1,3}-\d{1,3}$/.test(v.ageRange))
      return `${name}.ageRange is invalid`;
  }
  if (!Array.isArray(v.palaceNames) || v.palaceNames.length !== 12)
    return `${name}.palaceNames must have 12 items`;
  for (const n of v.palaceNames as unknown[]) {
    if (typeof n !== "string" || !PALACE_NAMES.has(n)) return `${name}.palaceNames has unknown item`;
  }
  if (!Array.isArray(v.mutagen) || v.mutagen.length !== 4) return `${name}.mutagen must have 4 items`;
  for (const n of v.mutagen as unknown[]) {
    if (!isStr(n)) return `${name}.mutagen item is invalid`;
  }
  return null;
}

/** 校验请求体结构（8KB 体积上限由路由层在读 text 阶段把关，见 Task 3） */
export function validateInterpretRequest(body: unknown): Result {
  if (!isObj(body)) return fail("body must be a JSON object");
  if (typeof body.part !== "string" || !PARTS.includes(body.part as Part))
    return fail("part must be one of mingpan/daxian/liunian");
  if (typeof body.lang !== "string" || !(LANGS as readonly string[]).includes(body.lang))
    return fail("lang must be zh or en");

  const chart = body.chart;
  if (!isObj(chart)) return fail("chart must be an object");
  if (chart.gender !== "male" && chart.gender !== "female") return fail("chart.gender is invalid");
  if (typeof chart.solar !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(chart.solar))
    return fail("chart.solar must be YYYY-MM-DD");
  for (const key of ["lunar", "time", "zodiac", "soul", "body", "fiveElementsClass"] as const) {
    if (!isStr(chart[key])) return fail(`chart.${key} is invalid`);
  }

  if (!Array.isArray(chart.palaces) || chart.palaces.length !== 12)
    return fail("chart.palaces must be an array of 12 items");
  for (let i = 0; i < 12; i++) {
    const err = checkPalace(chart.palaces[i], i);
    if (err) return fail(err);
  }

  const decadalErr = checkScope(chart.decadal, "chart.decadal", true);
  if (decadalErr) return fail(decadalErr);

  const yearlyErr = checkScope(chart.yearly, "chart.yearly", false);
  if (yearlyErr) return fail(yearlyErr);
  const yearlyYear = (chart.yearly as Record<string, unknown>).year;
  if (typeof yearlyYear !== "number" || !Number.isFinite(yearlyYear) || yearlyYear < 1900 || yearlyYear > 2200)
    return fail("chart.yearly.year is invalid");

  return { ok: true, value: body as unknown as InterpretRequest };
}
