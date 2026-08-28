import type { Lang } from "../config/site";
import { commonRules } from "./prompt-common";
import { makeGenerator, type GeneratorDef, type ValidateResult, type MonthlyGenerateData } from "./types";

const MONTH_RE = /^\d{4}-\d{2}$/;

/** monthly 条目共用 data 校验（浅校验，不深递归：数据来自自家 /api/fortune/month） */
export function validateMonthlyData(data: unknown): ValidateResult<MonthlyGenerateData> {
  if (typeof data !== "object" || data === null) return { ok: false, message: "data must be an object." };
  const d = data as Record<string, unknown>;
  if (d.lang !== "zh" && d.lang !== "en") return { ok: false, message: 'data.lang must be "zh" or "en".' };
  if (typeof d.month !== "string" || !MONTH_RE.test(d.month)) {
    return { ok: false, message: "data.month must be a YYYY-MM string." };
  }
  if (typeof d.skeleton !== "object" || d.skeleton === null) {
    return { ok: false, message: "data.skeleton must be the data object of GET /api/fortune/month." };
  }
  return { ok: true, value: d as unknown as MonthlyGenerateData };
}

const ROLE: Record<Lang, string> = {
  zh: "你是一位资深生肖运势专栏作者，为每月运势栏目撰稿。",
  en: "You are an experienced Chinese-zodiac fortune columnist writing a monthly column.",
};

function dataBlock(d: MonthlyGenerateData): string {
  const s = d.skeleton;
  const jieQi = s.jieQiInMonth.map((j) => `${j.name} ${j.date}`).join("、");
  return [
    `月份：${s.month}`,
    `月柱：${s.monthGanZhi}（年柱 ${s.yearGanZhi}）`,
    `本月节气：${jieQi}`,
    "本月数据（JSON）：",
    JSON.stringify(s, null, 2),
  ].join("\n");
}

function summaryTask(d: MonthlyGenerateData): string {
  if (d.lang === "zh") {
    return "请为本月写运势总览（约 300-400 字）：先讲月柱分段（数据 monthPillarSegments，何日起换柱）与本月节气（jieQiInMonth）；再总说本月月支与十二生肖的关系格局——六合、三合、相冲、相害、值月各是哪些生肖（依据 monthBranchHelpers 与 zodiacs）；结尾一句本月基调提醒。";
  }
  return "Write the monthly overview (about 250-350 words): start with the month-pillar segments (monthPillarSegments in the data — when the pillar changes) and this month's solar terms (jieQiInMonth); then summarise the month branch's relations with the twelve signs — which signs are LiuHe, SanHe, clash, harm and on-duty (from monthBranchHelpers and zodiacs); close with one line on the month's overall tone.";
}

function zodiacTask(d: MonthlyGenerateData): string {
  if (d.lang === "zh") {
    return "请为 12 生肖各写六维月运深化：严格按数据 zodiacs 数组顺序，每生肖一个「### 生肖名」小节，六行列表——- **整体**：…、- **财运**：…、- **爱情**：…、- **事业**：…、- **健康**：…、- **建议**：…（每维 1-2 句）。以各生肖的 monthRelation 定基调：六合最吉、三合次吉、值月平稳有助力、相害防口舌是非、相冲多变动；monthRelation 为空的生肖按本月月支五行气势平和带过，不强行拔高或贬低。";
  }
  return "Write a six-dimension monthly deep-dive for each of the 12 zodiac signs: follow the exact order of the zodiacs array, one \"### <Sign>\" section per sign with six bolded rows — **Overall**, **Wealth**, **Love**, **Career**, **Health**, **Advice** — 1-2 sentences each. Set the tone by each sign's monthRelation: LiuHe most fortunate, SanHe next, on-duty steady with support, harm guards against gossip and disputes, clash signals change; for signs with an empty monthRelation, write a balanced note based on the month branch's element — no forced highs or lows.";
}

function luckyTask(d: MonthlyGenerateData): string {
  if (d.lang === "zh") {
    return "请为吉日速查写解读：按数据 luckyDays 数组（每类含命中日期与当日冲煞）逐类点评，每类 1-2 句——点出该类最值得选的日期，并按各日 chongZodiac 给一句冲煞提醒；结尾一句本月择吉总则（优先天神吉日，避开冲自己生肖的日子）。引用某一天的日期、干支、天神、冲煞时，必须逐字取自 luckyDays 中该日所在的条目，禁止把相邻条目的信息安到另一天上，也不要补充数据中没有的干支或天神。";
  }
  return "Write commentary for the auspicious-day quick reference: go through the luckyDays array in the data (each category lists matching dates with their clash details), 1-2 sentences per category — name the single best pick and add a clash reminder based on each day's chongZodiac; close with one general rule for choosing days this month (favour days with auspicious day gods, avoid days clashing your own sign). When citing a day's date, GanZhi, day god or clash details, take them verbatim from that day's own entry in luckyDays — never attach a neighbouring entry's details to a different date, and never add GanZhi or day gods the data does not contain.";
}

function def(task: (d: MonthlyGenerateData) => string): GeneratorDef<MonthlyGenerateData> {
  return {
    validate: validateMonthlyData,
    system: (lang) => [ROLE[lang], ...commonRules(lang)].join("\n"),
    user: (d) => [dataBlock(d), task(d)].join("\n\n"),
  };
}

export const monthlyGenerators = {
  "monthly-summary": makeGenerator(def(summaryTask)),
  "monthly-zodiac": makeGenerator(def(zodiacTask)),
  "monthly-lucky": makeGenerator(def(luckyTask)),
};
