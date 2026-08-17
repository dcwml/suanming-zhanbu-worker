import type { Lang } from "../config/site";
import type { InterpretRequest } from "./types";

export function buildSystemPrompt(lang: Lang): string {
  if (lang === "zh") {
    return [
      "你是一位精通梅花易数的占卜大师，深谙邵雍先天起卦法与体用五行生克断法。",
      "规则：",
      "1. 只基于用户提供的卦象数据（本卦、互卦、变卦、动爻、体用五行）进行分析，不要重新起卦或质疑数据。",
      "2. 用 Markdown 输出（可用二三级标题、列表、粗体），不要输出代码块。",
      "3. 语气客观温和，多讲趋势与建议，避免绝对化断言。",
      "4. 不提供医疗、法律、投资等专业建议；涉及健康财务话题只做泛化提醒。",
      "5. 全文使用中文。",
    ].join("\n");
  }
  return [
    "You are a master of Plum Blossom Numerology (Meihua Yishu), well versed in Shao Yong's hexagram casting and the body-application five-element judgement.",
    "Trigram legend: 乾 Qian (Heaven, Metal), 兑 Dui (Lake, Metal), 离 Li (Fire, Fire), 震 Zhen (Thunder, Wood), 巽 Xun (Wind, Wood), 坎 Kan (Water, Water), 艮 Gen (Mountain, Earth), 坤 Kun (Earth, Earth). Five elements: 金 Metal, 木 Wood, 水 Water, 火 Fire, 土 Earth.",
    "Rules:",
    "1. Analyse only the chart data provided by the user (primary / mutual / changed hexagrams, moving line, body and application elements); never recast or question it.",
    "2. Output Markdown (h2/h3 headings, lists, bold), no code blocks.",
    "3. Keep an objective, gentle tone; describe tendencies and advice, avoid absolute claims.",
    "4. No medical, legal or investment advice; only general reminders on such topics.",
    "5. Respond entirely in English. Keep hexagram and trigram names in Chinese characters followed by a short English gloss, e.g. 火天大有 (Great Possession).",
  ].join("\n");
}

export function buildUserPrompt(req: InterpretRequest): string {
  const blocks: string[] = [];

  blocks.push(req.lang === "zh" ? `所求之事：${req.question}` : `Question: ${req.question}`);

  if (req.method === "time") {
    blocks.push(
      req.lang === "zh"
        ? `起卦方式：时间起卦\n公历时刻：${req.solar}\n农历：${req.lunar}`
        : `Casting method: time casting\nSolar time: ${req.solar}\nLunar: ${req.lunar}`,
    );
  } else {
    const [a, b] = req.numbers ?? [0, 0];
    blocks.push(
      req.lang === "zh"
        ? `起卦方式：数字起卦\n所报数字：${a}、${b}`
        : `Casting method: number casting\nNumbers given: ${a}, ${b}`,
    );
  }

  const hex = (label: string, h: InterpretRequest["primary"]): string =>
    `${label}：${h.name}（上${h.upper}下${h.lower}）\n卦辞：${h.statement}`;
  const hexEn = (label: string, h: InterpretRequest["primary"]): string =>
    `${label}: ${h.name} (${h.upper} above, ${h.lower} below)\nStatement: ${h.statement}`;

  if (req.lang === "zh") {
    blocks.push(hex("本卦", req.primary));
    blocks.push(hex("互卦", req.mutual));
    blocks.push(hex("变卦", req.changed));
    blocks.push(`动爻：第${req.movingLine}爻（${positionName(req.movingLine, req.lang)}）`);
    blocks.push(`体卦：${req.body.trigram}（五行${req.body.element}）\n用卦：${req.application.trigram}（五行${req.application.element}）`);
    blocks.push(
      "请以梅花易数体用五行生克为纲，结合卦辞，解读所问之事的吉凶趋势：先点明体用生克定下的总体基调，再以互卦论事情的过程与转折，再以变卦指示最终走向，最后给出具体建议。500 字左右。",
    );
  } else {
    blocks.push(hexEn("Primary hexagram", req.primary));
    blocks.push(hexEn("Mutual hexagram", req.mutual));
    blocks.push(hexEn("Changed hexagram", req.changed));
    blocks.push(`Moving line: line ${req.movingLine}`);
    blocks.push(`Body trigram: ${req.body.trigram} (${req.body.element})\nApplication trigram: ${req.application.trigram} (${req.application.element})`);
    blocks.push(
      "Using the Plum Blossom body-application five-element relationships as the framework, together with the hexagram statements, interpret the outlook for the question asked: start with the overall tone set by the body-application interaction, then use the mutual hexagram to discuss the process and turning points, then the changed hexagram for the final direction, and close with specific advice. About 400 words.",
    );
  }

  return blocks.join("\n\n");
}

/** 爻位中文名（1=初爻 … 6=上爻） */
function positionName(position: number, lang: Lang): string {
  if (lang === "en") return `line ${position}`;
  const names = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];
  return names[position - 1] ?? `${position}爻`;
}
