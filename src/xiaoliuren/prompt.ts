import type { Lang } from "../config/site";
import { PALACE_BY_NAME, type InterpretRequest, type PalaceInfo } from "./types";

export function buildSystemPrompt(lang: Lang): string {
  if (lang === "zh") {
    return [
      "你是一位精通小六壬的占卜师，深谙民间掐指起课之法：以大安、留连、速喜、赤口、小吉、空亡六宫，月上起月、日上起日、时上起课。",
      "规则：",
      "1. 只基于用户提供的课式数据（三宫落宫及其天神、五行、吉凶属性与落宫口诀）进行分析，不要重新起课或质疑数据。",
      "2. 用 Markdown 输出（可用二三级标题、列表、粗体），不要输出代码块。",
      "3. 语气客观温和，多讲趋势与建议，避免绝对化断言。",
      "4. 不提供医疗、法律、投资等专业建议；涉及健康财务话题只做泛化提醒。",
      "5. 全文使用中文。",
    ].join("\n");
  }
  return [
    "You are a master of Xiao Liu Ren (小六壬, the Small Six Ren divination), well versed in the folk thumb-counting method across the six palaces: Da An (大安, Green Dragon, Wood, Great Fortune), Liu Lian (留连, Black Tortoise, Water, Neutral), Su Xi (速喜, Vermilion Bird, Fire, Favorable), Chi Kou (赤口, White Tiger, Metal, Unfavorable), Xiao Ji (小吉, Six Harmony, Water, Favorable), Kong Wang (空亡, Hook Array, Earth, Unfavorable).",
    "Rules:",
    "1. Analyse only the chart data provided by the user (the month, day and result palaces with their attributes and the result-palace verse); never recast or question it.",
    "2. Output Markdown (h2/h3 headings, lists, bold), no code blocks.",
    "3. Keep an objective, gentle tone; describe tendencies and advice, avoid absolute claims.",
    "4. No medical, legal or investment advice; only general reminders on such topics.",
    "5. Respond entirely in English. Keep palace names in Chinese characters followed by a short English gloss, e.g. 速喜 (Swift Joy).",
  ].join("\n");
}

export function buildUserPrompt(req: InterpretRequest): string {
  const blocks: string[] = [];

  blocks.push(req.lang === "zh" ? `所求之事：${req.question}` : `Question: ${req.question}`);

  if (req.method === "time") {
    blocks.push(
      req.lang === "zh"
        ? `起课方式：时间起课\n公历时刻：${req.solar}\n农历：${req.lunar}`
        : `Casting method: time casting\nSolar time: ${req.solar}\nLunar: ${req.lunar}`,
    );
  } else {
    const [a, b, c] = req.numbers ?? [0, 0, 0];
    blocks.push(
      req.lang === "zh"
        ? `起课方式：数字起课\n所报数字：${a}、${b}、${c}`
        : `Casting method: number casting\nNumbers given: ${a}, ${b}, ${c}`,
    );
  }

  const month = PALACE_BY_NAME[req.monthPalace];
  const day = PALACE_BY_NAME[req.dayPalace];
  const result = PALACE_BY_NAME[req.resultPalace];

  if (req.lang === "zh") {
    blocks.push(
      [
        "三宫落宫：",
        palaceLineZh("月宫", month),
        palaceLineZh("日宫", day),
        palaceLineZh("落宫", result),
      ].join("\n"),
    );
    blocks.push(`落宫口诀：\n${result.poem}`);
    blocks.push(
      "请以落宫为纲，结合口诀与三宫的推进层次，解读所问之事的吉凶趋势：先以月宫点出事情的大环境基调，再以日宫论发展过程，然后以落宫定最终走向，最后给出具体建议。500 字左右。",
    );
  } else {
    blocks.push(
      [
        "Three palaces:",
        palaceLineEn("Month palace", month),
        palaceLineEn("Day palace", day),
        palaceLineEn("Result palace", result),
      ].join("\n"),
    );
    blocks.push(`Result palace verse:\n${result.poemEn}`);
    blocks.push(
      "Using the result palace as the framework, together with the verse and the month-day-result progression, interpret the outlook for the question asked: start with the overall tone set by the month palace, then the day palace for the process, then the result palace for the final direction, and close with specific advice. About 400 words.",
    );
  }

  return blocks.join("\n\n");
}

function palaceLineZh(label: string, p: PalaceInfo): string {
  return `${label}：${p.name}（${p.deity}·${p.element}·${p.grade}）—— ${p.omen}`;
}

function palaceLineEn(label: string, p: PalaceInfo): string {
  return `${label}: ${p.name} (${p.en} — ${p.deityEn}, ${elementEn(p.element)}, ${p.gradeEn}) — ${p.omenEn}`;
}

/** 五行英文名（仅用于英文提示词） */
function elementEn(element: PalaceInfo["element"]): string {
  const map: Record<PalaceInfo["element"], string> = { 金: "Metal", 木: "Wood", 水: "Water", 火: "Fire", 土: "Earth" };
  return map[element];
}
