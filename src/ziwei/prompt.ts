import type { Lang } from "../config/site";
import type { PalaceInfo, Part, ScopeInfo, YearlyInfo, ZiweiChart } from "./types";

/** 十四主星与关键辅星中英对照（仅 en system prompt 使用） */
const STAR_GLOSSARY = [
  "紫微 Zi Wei (Emperor)", "天机 Tian Ji (Advisor)", "太阳 Tai Yang (Sun)", "武曲 Wu Qu (Finance)",
  "天同 Tian Tong (Harmony)", "廉贞 Lian Zhen (Integrity)", "天府 Tian Fu (Treasury)", "太阴 Tai Yin (Moon)",
  "贪狼 Tan Lang (Desire)", "巨门 Ju Men (Gate)", "天相 Tian Xiang (Minister)", "天梁 Tian Liang (Sage)",
  "七杀 Qi Sha (General)", "破军 Po Jun (Pioneer)",
  "左辅 Zuo Fu", "右弼 You Bi", "文昌 Wen Chang", "文曲 Wen Qu", "天魁 Tian Kui", "天钺 Tian Yue",
  "禄存 Lu Cun", "天马 Tian Ma", "擎羊 Qing Yang", "陀罗 Tuo Luo", "火星 Huo Xing", "铃星 Ling Xing",
  "地空 Di Kong", "地劫 Di Jie",
].join(", ");

const PALACE_GLOSSARY =
  "命宫 Life, 兄弟 Siblings, 夫妻 Marriage, 子女 Children, 财帛 Wealth, 疾厄 Health, " +
  "迁移 Travel, 仆役 Friends, 官禄 Career, 田宅 Property, 福德 Spirit, 父母 Parents";

export function buildSystemPrompt(lang: Lang): string {
  if (lang === "zh") {
    return [
      "你是一位精通紫微斗数的资深命理师，熟悉十四主星安星、宫位三方四正、四化飞星与大限流年推演。",
      "规则：",
      "1. 只基于用户提供的命盘数据分析，不要重新排盘、不要质疑数据。",
      "2. 用 Markdown 输出（可用二三级标题、列表、粗体），不要输出代码块。",
      "3. 语气客观温和，多讲趋势与建议，避免绝对化断言。",
      "4. 不提供医疗、法律、投资等专业建议；涉及健康财务话题只做泛化提醒。",
      "5. 不要自称或提及人工智能、语言模型、算法、程序，不谈自身的性质与局限，始终以解读者口吻专注于解读本身。",
      "6. 全文使用中文。",
    ].join("\n");
  }
  return [
    "You are a seasoned Zi Wei Dou Shu (Purple Star Astrology) master, fluent in star placement, palace trines, the four transformations and decade/yearly luck analysis.",
    "Rules:",
    "1. Analyse only the chart data provided by the user; never recalculate or question it.",
    "2. Output Markdown (h2/h3 headings, lists, bold), no code blocks.",
    "3. Keep an objective, gentle tone; describe tendencies and advice, avoid absolute claims.",
    "4. No medical, legal or investment advice; only general reminders on such topics.",
    "5. Never refer to yourself as an artificial intelligence, language model, algorithm or program, and do not discuss your own nature or limitations; stay in character and focus solely on the reading.",
    "6. Respond entirely in English. Keep star and palace names in Chinese characters followed by a short English gloss on first mention.",
    `Star glossary: ${STAR_GLOSSARY}.`,
    `Palace glossary: ${PALACE_GLOSSARY}.`,
  ].join("\n");
}

/** 单宫一行：命宫（丑·身宫）：紫微(庙)、破军(旺)；辅星 天魁 */
function palaceLine(p: PalaceInfo): string {
  const bodyMark = p.isBody ? "·身宫" : "";
  const majors =
    p.majors
      .map((m) => `${m.name}(${m.brightness}${m.mutagen ? "·" + m.mutagen : ""})`)
      .join("、") || "无主星";
  const minors = p.minors.map((m) => m.name + (m.mutagen ? "·" + m.mutagen : "")).join("、");
  return `${p.name}（${p.branch}${bodyMark}）：${majors}${minors ? "；辅星 " + minors : ""}`;
}

/** 四化 [禄,权,科,忌] 星名数组 → "天同禄、天机权、文昌科、廉贞忌" */
function mutagenText(m: string[]): string {
  return `${m[0]}禄、${m[1]}权、${m[2]}科、${m[3]}忌`;
}

function chartText(chart: ZiweiChart): string {
  return [
    `性别：${chart.gender === "male" ? "男" : "女"}`,
    `出生公历：${chart.solar}`,
    `出生农历：${chart.lunar}`,
    `出生时辰：${chart.time}`,
    `生肖：${chart.zodiac}`,
    `命主：${chart.soul}；身主：${chart.body}`,
    `五行局：${chart.fiveElementsClass}`,
    "十二宫星曜：",
    ...chart.palaces.map(palaceLine),
  ].join("\n");
}

function decadalText(d: ScopeInfo): string {
  return [
    `当前大限：${d.ganZhi}（${d.ageRange} 岁）`,
    `大限十二宫：${d.palaceNames.join("、")}`,
    `大限四化：${mutagenText(d.mutagen)}`,
  ].join("\n");
}

function yearlyText(y: YearlyInfo): string {
  return [
    `今年流年：${y.year} 年 ${y.ganZhi}`,
    `流年十二宫：${y.palaceNames.join("、")}`,
    `流年四化：${mutagenText(y.mutagen)}`,
  ].join("\n");
}

const TASKS: Record<Part, Record<Lang, string>> = {
  mingpan: {
    zh: "请解读这张紫微命盘：先以命宫及其三方四正（财帛、官禄、迁移）定格局高低，再逐宫给出要点（性格、事业、财运、感情、健康），最后总结整体命局走势。500 字左右。",
    en: "Interpret this Zi Wei Dou Shu natal chart: first assess the structure from the Life Palace and its trine palaces (Wealth, Career, Travel), then give key points palace by palace (personality, career, wealth, relationships, health), and close with an overall life reading. About 400 words.",
  },
  daxian: {
    zh: "请结合命盘解读当前大限：这十年的重心落在哪些宫位，大限四化引动了哪些本命宫位，整体趋势与注意事项如何。500 字左右。",
    en: "Based on the natal chart, interpret the current decade luck: which life areas take centre stage in these ten years, which natal palaces are activated by the decade's four transformations, and what tendencies and cautions to watch. About 400 words.",
  },
  liunian: {
    zh: "请结合命盘与当前大限，解读今年流年：流年四化落入哪些宫位、引动什么，今年各领域的运势要点与建议。500 字左右。",
    en: "Based on the natal chart and current decade luck, interpret this year's annual luck: where the annual four transformations fall, what they activate, and the key tendencies and advice for each life area this year. About 400 words.",
  },
};

export function buildUserPrompt(part: Part, lang: Lang, chart: ZiweiChart): string {
  const blocks = [chartText(chart)];
  if (part === "daxian" || part === "liunian") {
    blocks.push(decadalText(chart.decadal));
  }
  if (part === "liunian") {
    blocks.push(yearlyText(chart.yearly));
  }
  blocks.push(TASKS[part][lang]);
  return blocks.join("\n\n");
}
