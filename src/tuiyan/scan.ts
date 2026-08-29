// 时辰推演核心：扫描一个农历月每天 × 12 时辰的四柱，识别特殊格局并分级输出。
// 生成期 CLI（scripts/tuiyan.ts）与单测共用；非法参数 throw Error（CLI 壳 catch 后转 exit(1)）。
// 历法来自 lunar-javascript（类型声明见 src/lunar-javascript.d.ts）。
// 时辰口径：取每时辰中点排盘（子时取 0 点早子时）；月柱分段以每日午时（12:00）月柱为代表。
import { Solar } from "lunar-javascript";

const GAN_YANG = new Set(["甲", "丙", "戊", "庚", "壬"]);
const ZHI_YANG = new Set(["子", "寅", "辰", "午", "申", "戌"]);
const ZHI_NAMES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
const HOUR_RANGES = ["23-1", "1-3", "3-5", "5-7", "7-9", "9-11", "11-13", "13-15", "15-17", "17-19", "19-21", "21-23"];

/** 天乙贵人（日干 → 贵人时支） */
const TIANYI: Record<string, string[]> = {
  甲: ["丑", "未"], 戊: ["丑", "未"], 庚: ["丑", "未"],
  乙: ["子", "申"], 己: ["子", "申"],
  丙: ["亥", "酉"], 丁: ["亥", "酉"],
  壬: ["卯", "巳"], 癸: ["卯", "巳"], 辛: ["午", "寅"],
};
/** 羊刃（阳日干 → 刃支；阴干不论刃） */
const YANGREN: Record<string, string> = { 甲: "卯", 丙: "午", 戊: "午", 庚: "酉", 壬: "子" };
/** 日支三合局 → 桃花 / 驿马 / 将星 / 华盖支 */
const SANHE_GROUP: Record<string, "水" | "火" | "金" | "木"> = {
  申: "水", 子: "水", 辰: "水", 寅: "火", 午: "火", 戌: "火",
  巳: "金", 酉: "金", 丑: "金", 亥: "木", 卯: "木", 未: "木",
};
const TAOHUA = { 水: "酉", 火: "卯", 金: "午", 木: "子" } as const;
const YIMA = { 水: "寅", 火: "申", 金: "亥", 木: "巳" } as const;
const JIANGXING = { 水: "子", 火: "午", 金: "酉", 木: "卯" } as const;
const HUAGAI = { 水: "辰", 火: "戌", 金: "丑", 木: "未" } as const;
/** 魁罡日柱 */
const KUIGANG = new Set(["庚辰", "庚戌", "壬辰", "戊戌"]);
/** 三合局与三合方会（四支凑齐即成） */
const SANHE_JU: readonly (readonly string[])[] = [["申", "子", "辰"], ["寅", "午", "戌"], ["巳", "酉", "丑"], ["亥", "卯", "未"]];
const SANHE_FANG: readonly (readonly string[])[] = [["申", "酉", "戌"], ["亥", "子", "丑"], ["寅", "卯", "辰"], ["巳", "午", "未"]];
/** 天干五合 / 地支六合 */
const GAN_WUHE: Record<string, string> = { 甲: "己", 己: "甲", 乙: "庚", 庚: "乙", 丙: "辛", 辛: "丙", 丁: "壬", 壬: "丁", 戊: "癸", 癸: "戊" };
const ZHI_LIUHE: Record<string, string> = { 子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯", 辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午" };

export interface HourSlot {
  date: string;
  hourZhi: string;
  hourRange: string;
  /** 四柱，空格分隔，如 "丙午 丙申 庚辰 乙酉" */
  bazi: string;
  tags: string[];
}

export interface KuigangDay {
  date: string;
  dayGanZhi: string;
  lunarLabel: string;
  hours: HourSlot[];
}

export interface DailyHighlight {
  date: string;
  lunarLabel: string;
  dayGanZhi: string;
  /** 日柱干支全阳（该日子/寅/辰/午/申/戌六时为纯阳八字） */
  pureYangDay: boolean;
  tianyiHours: string[];
  taohuaHour: string;
  yimaHour: string;
  jiangxingHour: string;
  yangrenHour: string;
  huagaiHour: string;
}

export interface TuiyanScanResult {
  mode: "tuiyan";
  firstDay: string;
  lastDay: string;
  /** 农历月名，闰月带"闰"前缀，如 "七月" / "闰六月" */
  lunarMonthLabel: string;
  days: number;
  totalHours: number;
  monthPillarSegments: { monthGanZhi: string; from: string; to: string }[];
  jieQiInMonth: { name: string; date: string }[];
  /** 一级·大格：三合成局 ∨ 三合方会 ∨ 标记总数 ≥ 4 */
  grand: HourSlot[];
  kuigangDays: KuigangDay[];
  daily: DailyHighlight[];
  stats: {
    pureYang: number;
    pureYin: number;
    tianyiHours: number;
    taohuaHours: number;
    yimaHours: number;
    jiangxingHours: number;
    yangrenHours: number;
    huagaiHours: number;
  };
}

function validateIsoDate(s: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error(`Invalid date: ${s} (expected YYYY-MM-DD)`);
  }
}

/** ISO 日期加 n 天（纯 UTC 运算，无时区歧义） */
function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function solarOf(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return Solar.fromYmd(y, m, d);
}

/** 农历标签，如 "七月初一"、"闰六月初三" */
function lunarLabelOf(iso: string): string {
  const l = solarOf(iso).getLunar();
  return `${l.getMonth() < 0 ? "闰" : ""}${l.getMonthInChinese()}月${l.getDayInChinese()}`;
}

/** 某天第 h 个时辰（0=子 … 11=亥，取中点 h*2 点）的四柱与标记 */
function scanHour(date: string, h: number): HourSlot {
  const [y, m, d] = date.split("-").map(Number);
  const ec = Solar.fromYmdHms(y, m, d, h * 2, 0, 0).getLunar().getEightChar();
  const yG = ec.getYearGan(), yZ = ec.getYearZhi();
  const mG = ec.getMonthGan(), mZ = ec.getMonthZhi();
  const dG = ec.getDayGan(), dZ = ec.getDayZhi();
  const tG = ec.getTimeGan(), tZ = ec.getTimeZhi();
  const gans = [yG, mG, dG, tG];
  const zhis = [yZ, mZ, dZ, tZ];
  const tags: string[] = [];

  if (gans.every((g) => GAN_YANG.has(g)) && zhis.every((z) => ZHI_YANG.has(z))) tags.push("纯阳");
  if (!gans.some((g) => GAN_YANG.has(g)) && !zhis.some((z) => ZHI_YANG.has(z))) tags.push("纯阴");
  if (KUIGANG.has(dG + dZ)) tags.push("魁罡日");
  if (TIANYI[dG]?.includes(tZ)) tags.push("天乙贵人时");
  if (YANGREN[dG] === tZ) tags.push("羊刃时");
  const group = SANHE_GROUP[dZ];
  if (group) {
    if (TAOHUA[group] === tZ) tags.push("桃花时");
    if (YIMA[group] === tZ) tags.push("驿马时");
    if (JIANGXING[group] === tZ) tags.push("将星时");
    if (HUAGAI[group] === tZ) tags.push("华盖时");
  }
  for (const ju of SANHE_JU) if (ju.every((z) => zhis.includes(z))) tags.push(`三合${ju.join("")}局`);
  for (const f of SANHE_FANG) if (f.every((z) => zhis.includes(z))) tags.push(`方会${f.join("")}`);
  if (GAN_WUHE[dG] === tG) tags.push("日时干五合");
  if (ZHI_LIUHE[dZ] === tZ) tags.push("日时支六合");

  return { date, hourZhi: ZHI_NAMES[h], hourRange: HOUR_RANGES[h], bazi: `${yG}${yZ} ${mG}${mZ} ${dG}${dZ} ${tG}${tZ}`, tags };
}

/** 扫描一个农历月：入参为该月内任意一天（自动归一到农历月首日） */
export function scanLunarMonth(day: string): TuiyanScanResult {
  validateIsoDate(day);

  // 回退到农历月首日（最多 29 步）
  let firstDay = day;
  while (solarOf(firstDay).getLunar().getDay() !== 1) firstDay = addDays(firstDay, -1);

  // 圈定农历月：getMonth() 闰月为负，同月（含闰月语义）连续
  const monthKey = solarOf(firstDay).getLunar().getMonth();
  const dates: string[] = [];
  for (let cur = firstDay; ; cur = addDays(cur, 1)) {
    if (solarOf(cur).getLunar().getMonth() !== monthKey) break;
    dates.push(cur);
  }

  const allSlots: HourSlot[] = [];
  const daily: DailyHighlight[] = [];
  const kuigangDays: KuigangDay[] = [];
  const stats = { pureYang: 0, pureYin: 0, tianyiHours: 0, taohuaHours: 0, yimaHours: 0, jiangxingHours: 0, yangrenHours: 0, huagaiHours: 0 };

  for (const date of dates) {
    const slots = Array.from({ length: 12 }, (_, h) => scanHour(date, h));
    allSlots.push(...slots);

    const dayGanZhi = slots[6].bazi.split(" ")[2]; // 午时第三柱
    const lunar = solarOf(date).getLunar();
    const dayGan = dayGanZhi[0];
    const dayZhi = dayGanZhi[1];

    daily.push({
      date,
      lunarLabel: lunarLabelOf(date),
      dayGanZhi,
      pureYangDay: GAN_YANG.has(dayGan) && ZHI_YANG.has(dayZhi),
      tianyiHours: slots.filter((s) => s.tags.includes("天乙贵人时")).map((s) => s.hourZhi),
      taohuaHour: slots.find((s) => s.tags.includes("桃花时"))?.hourZhi ?? "",
      yimaHour: slots.find((s) => s.tags.includes("驿马时"))?.hourZhi ?? "",
      jiangxingHour: slots.find((s) => s.tags.includes("将星时"))?.hourZhi ?? "",
      yangrenHour: slots.find((s) => s.tags.includes("羊刃时"))?.hourZhi ?? "",
      huagaiHour: slots.find((s) => s.tags.includes("华盖时"))?.hourZhi ?? "",
    });

    if (KUIGANG.has(dayGanZhi)) {
      kuigangDays.push({ date, dayGanZhi, lunarLabel: lunarLabelOf(date), hours: slots });
    }

    for (const s of slots) {
      if (s.tags.includes("纯阳")) stats.pureYang++;
      if (s.tags.includes("纯阴")) stats.pureYin++;
      if (s.tags.includes("天乙贵人时")) stats.tianyiHours++;
      if (s.tags.includes("桃花时")) stats.taohuaHours++;
      if (s.tags.includes("驿马时")) stats.yimaHours++;
      if (s.tags.includes("将星时")) stats.jiangxingHours++;
      if (s.tags.includes("羊刃时")) stats.yangrenHours++;
      if (s.tags.includes("华盖时")) stats.huagaiHours++;
    }
  }

  // 一级·大格
  const grand = allSlots.filter(
    (s) => s.tags.some((t) => t.startsWith("三合") || t.startsWith("方会")) || s.tags.length >= 4,
  );

  // 月柱分段（每日午时月柱，相邻合并）。注：getMonthInGanZhi() 按日归段（交节日整天归新月），
  // 与时辰中点排盘口径不符；故用 getMonthInGanZhiExact() 按精确时刻：
  // 白露 9-07 22:41 交节，当日午时仍属丙申，正确归段 8-13~9-07 = 丙申。
  const monthPillarSegments: { monthGanZhi: string; from: string; to: string }[] = [];
  for (const date of dates) {
    const [y, m, d] = date.split("-").map(Number);
    const monthGanZhi = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getMonthInGanZhiExact();
    const last = monthPillarSegments[monthPillarSegments.length - 1];
    if (last && last.monthGanZhi === monthGanZhi) last.to = date;
    else monthPillarSegments.push({ monthGanZhi, from: date, to: date });
  }

  const jieQiInMonth = dates
    .filter((date) => solarOf(date).getLunar().getJieQi() !== "")
    .map((date) => ({ name: solarOf(date).getLunar().getJieQi(), date }));

  const firstLunar = solarOf(firstDay).getLunar();
  return {
    mode: "tuiyan",
    firstDay,
    lastDay: dates[dates.length - 1],
    lunarMonthLabel: `${firstLunar.getMonth() < 0 ? "闰" : ""}${firstLunar.getMonthInChinese()}月`,
    days: dates.length,
    totalHours: allSlots.length,
    monthPillarSegments,
    jieQiInMonth,
    grand,
    kuigangDays,
    daily,
    stats,
  };
}
