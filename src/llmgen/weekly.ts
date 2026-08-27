import type { Lang } from "../config/site";
import { commonRules } from "./prompt-common";
import { makeGenerator, type GeneratorDef, type ValidateResult, type WeeklyGenerateData } from "./types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** weekly 条目共用 data 校验（浅校验：monday 只查格式，不校验是否真为周一——数据来自自家 API） */
export function validateWeeklyData(data: unknown): ValidateResult<WeeklyGenerateData> {
  if (typeof data !== "object" || data === null) return { ok: false, message: "data must be an object." };
  const d = data as Record<string, unknown>;
  if (d.lang !== "zh" && d.lang !== "en") return { ok: false, message: 'data.lang must be "zh" or "en".' };
  if (typeof d.monday !== "string" || !DATE_RE.test(d.monday)) {
    return { ok: false, message: "data.monday must be a YYYY-MM-DD string (the Monday of the week)." };
  }
  if (typeof d.week !== "object" || d.week === null) {
    return { ok: false, message: "data.week must be the data object of GET /api/fortune/week." };
  }
  return { ok: true, value: d as unknown as WeeklyGenerateData };
}

const ROLE: Record<Lang, string> = {
  zh: "你是一位资深生肖运势专栏作者，为每周运势栏目撰稿。",
  en: "You are an experienced Chinese-zodiac fortune columnist writing a weekly column.",
};

function dataBlock(d: WeeklyGenerateData): string {
  const r = d.week.ranks;
  return [
    `本周：${d.week.week.monday} 至 ${d.week.week.sunday}`,
    `特吉生肖：${r.teJi.map((z) => z.zodiac).join("、")}；次吉生肖：${r.ciJi.map((z) => z.zodiac).join("、")}；忠告生肖：${r.zhonggao.zodiac}`,
    "本周数据（JSON）：",
    JSON.stringify(d.week, null, 2),
  ].join("\n");
}

function summaryTask(d: WeeklyGenerateData): string {
  if (d.lang === "zh") {
    return "请为本周写运势导语与排名解读（约 250-350 字）：先 2-3 句总述本周干支背景（年柱、月柱与本周跨度内的节气变化，依据数据），再分别解读特吉三名生肖（本周与其六合、三合的日子较多）、次吉三名、忠告一名（冲、害日较多，宜守不宜攻），语气喜庆但不过度承诺。";
  }
  return "Write the weekly introduction and ranking commentary (about 200-300 words): open with 2-3 sentences on the week's GanZhi backdrop (year/month pillars and any solar-term shift within the week, from the data), then explain the three top-luck signs (more LiuHe/SanHe days ahead), the three runner-ups, and the one caution sign (more clash/harm days — steady and conservative). Celebratory, never over-promising.";
}

function zodiacTask(d: WeeklyGenerateData): string {
  if (d.lang === "zh") {
    return "请为 12 生肖各写六行周运：严格按数据 zodiacs 数组的顺序输出，每生肖一个「### 生肖名」小节，其下六行列表——- **整体**：…、- **财运**：…、- **爱情**：…、- **事业**：…、- **健康**：…、- **建议**：…（每项 1 句）。语气与排名呼应：特吉生肖写得明朗，忠告生肖温和提醒；只依据各生肖在数据中的 relations（六合/三合/相冲/相害的日子）与 score 推演，不要虚构日期。";
  }
  return "Write a six-line weekly entry for each of the 12 zodiac signs: follow the exact order of the zodiacs array in the data, one \"### <Sign>\" section per sign with a list of six bolded rows — **Overall**, **Wealth**, **Love**, **Career**, **Health**, **Advice** — one sentence each. Match the tone to the ranking (bright for top-luck signs, gently cautionary for the caution sign); derive everything from each sign's relations (LiuHe/SanHe/clash/harm days) and score in the data, never invent dates.";
}

function daysTask(d: WeeklyGenerateData): string {
  if (d.lang === "zh") {
    return "请为本周 7 天各写要点点评：严格按数据 days 数组顺序，每天先一行加粗要点头（格式统一，如「**周一 2026-08-17 癸亥日 · 冲蛇 · 煞西**」——以数据实际值为准），随后 1-2 句点评：当日宜什么、忌什么、天神黄黑道如何、适合安排什么。简短实用，不要展开成段落。";
  }
  return "Write a short note for each of the 7 days: follow the exact order of the days array, one bolded headline per day (consistent format, e.g. \"**Mon 2026-08-17 Gui-Hai day · clash Snake · evil direction West**\" — use the actual values in the data), then 1-2 sentences on what the day favours, what to avoid, and the day god (yellow/black path). Brief and practical, no long paragraphs.";
}

function def(task: (d: WeeklyGenerateData) => string): GeneratorDef<WeeklyGenerateData> {
  return {
    validate: validateWeeklyData,
    system: (lang) => [ROLE[lang], ...commonRules(lang)].join("\n"),
    user: (d) => [dataBlock(d), task(d)].join("\n\n"),
  };
}

export const weeklyGenerators = {
  "weekly-summary": makeGenerator(def(summaryTask)),
  "weekly-zodiac": makeGenerator(def(zodiacTask)),
  "weekly-days": makeGenerator(def(daysTask)),
};
