import type { Lang } from "../config/site";
import { commonRules } from "./prompt-common";
import { makeGenerator, type DailyGenerateData, type GeneratorDef, type ValidateResult } from "./types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** daily 条目共用 data 校验（浅校验，不深递归：数据来自自家 /api/almanac） */
export function validateDailyData(data: unknown): ValidateResult<DailyGenerateData> {
  if (typeof data !== "object" || data === null) return { ok: false, message: "data must be an object." };
  const d = data as Record<string, unknown>;
  if (d.lang !== "zh" && d.lang !== "en") return { ok: false, message: 'data.lang must be "zh" or "en".' };
  if (typeof d.date !== "string" || !DATE_RE.test(d.date)) {
    return { ok: false, message: "data.date must be a YYYY-MM-DD string." };
  }
  if (typeof d.almanac !== "object" || d.almanac === null) {
    return { ok: false, message: "data.almanac must be the data object of GET /api/almanac." };
  }
  return { ok: true, value: d as unknown as DailyGenerateData };
}

const ROLE: Record<Lang, string> = {
  zh: "你是一位精通传统黄历与宜忌文化的资深作者，为每日黄历栏目撰稿。",
  en: "You are a seasoned author of traditional Chinese almanac (Tong Shu) culture, writing for a daily almanac column.",
};

function dataBlock(d: DailyGenerateData): string {
  return [`日期：${d.date}（农历 ${d.almanac.lunar}）`, "当日历法数据（JSON）：", JSON.stringify(d.almanac, null, 2)].join("\n");
}

/** 任务指令按 lang 出双语版；主角/冲煞等动态字段在函数体内拼接 */
function readingTask(d: DailyGenerateData): string {
  if (d.lang === "zh") {
    return "请为这天的黄历宜忌写一段导引解读（2-4 句，约 100-150 字）：点出宜、忌中最值得注意的事项与当日冲煞生肖，结合喜神/财神/福神方位给读者一句当日行动建议。语气传统温和，不作绝对化断言。";
  }
  return "Write a 2-4 sentence introduction (about 80-120 words) for this day's do's and don'ts: highlight the most notable Yi/Ji items and the clash animal, and close with one practical suggestion drawing on the favourable directions (Xi/Cai/Fu). Keep a gentle, traditional tone without absolute claims.";
}

function zodiacTask(d: DailyGenerateData): string {
  if (d.lang === "zh") {
    return `请以当日地支对应的生肖「${d.almanac.zodiac}」为主角，写一段当日运势短文（约 150-250 字）：先 1-2 句总运（结合当日干支五行与${d.almanac.zodiac}当值之日），再从财运、感情、事业、健康中择要写 2-3 句，最后给一句行事建议；顺带提醒避开与被冲生肖「${d.almanac.chongZodiac}」相关的冲煞事项。`;
  }
  return `Write a daily fortune piece (about 120-200 words) starring the day's zodiac "${d.almanac.zodiac}" (write it as the English zodiac name, e.g. Pig, Rat): open with 1-2 sentences of overall luck (the day pillar and its element), cover 2-3 of wealth, love, career and health, and close with one piece of advice; briefly remind readers to avoid clash-related matters with "${d.almanac.chongZodiac}", the clash animal of the day.`;
}

function storyTask(d: DailyGenerateData): string {
  if (d.lang === "zh") {
    return "请围绕当日主题写一段玄学科普或民俗典故（约 200-300 字）：取材优先级为当日节气 > 天神黄黑道 > 纳音 > 冲煞；讲清一个知识点，行文传统平实，民俗说法可用「传统认为／旧俗云」引出，不要编造具体文献出处。";
  }
  return "Write a piece of folklore or cultural background (about 150-250 words) around this day's theme: priority order is the day's solar term (JieQi) > day god (TianShen, yellow/black path) > NaYin > clash. Explain one knowledge point clearly in a plain, traditional voice; attribute folk sayings to tradition rather than inventing specific textual sources.";
}

function def(task: (d: DailyGenerateData) => string): GeneratorDef<DailyGenerateData> {
  return {
    validate: validateDailyData,
    system: (lang) => [ROLE[lang], ...commonRules(lang)].join("\n"),
    user: (d) => [dataBlock(d), task(d)].join("\n\n"),
  };
}

export const dailyGenerators = {
  "daily-reading": makeGenerator(def(readingTask)),
  "daily-zodiac": makeGenerator(def(zodiacTask)),
  "daily-story": makeGenerator(def(storyTask)),
};
