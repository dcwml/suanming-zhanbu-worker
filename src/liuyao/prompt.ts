import type { Lang } from "../config/site";
import type { InterpretRequest } from "./types";

export function buildSystemPrompt(lang: Lang): string {
  if (lang === "zh") {
    return [
      "你是一位精通《周易》占法的占卜大师，熟悉六十四卦卦辞、爻辞与变卦占断。",
      "规则：",
      "1. 只基于用户提供的卦象、卦辞、爻辞与变卦资料进行分析，不要重新起卦或质疑数据。",
      "2. 用 Markdown 输出（可用二三级标题、列表、粗体），不要输出代码块。",
      "3. 语气客观温和，多讲趋势与建议，避免绝对化断言。",
      "4. 不提供医疗、法律、投资等专业建议；涉及健康财务话题只做泛化提醒。",
      "5. 全文使用中文。",
    ].join("\n");
  }
  return [
    "You are a master of the I Ching (Book of Changes) divination, fluent in the 64 hexagram statements, line texts, and transformed-hexagram interpretation.",
    "Rules:",
    "1. Analyse only the hexagram data provided by the user; never recast or question it.",
    "2. Output Markdown (h2/h3 headings, lists, bold), no code blocks.",
    "3. Keep an objective, gentle tone; describe tendencies and advice, avoid absolute claims.",
    "4. No medical, legal or investment advice; only general reminders on such topics.",
    "5. Respond entirely in English. Keep hexagram names in Chinese characters followed by a short English gloss, e.g. 雷水解 (Deliverance).",
  ].join("\n");
}

export function buildUserPrompt(req: InterpretRequest): string {
  const moving = req.moving && req.moving.length > 0 ? req.moving : [];
  const hasMoving = moving.length > 0;

  const blocks: string[] = [];

  blocks.push(`所求之事：${req.question}`);
  blocks.push(`起卦公历日期：${req.now.solar}`);

  blocks.push(`本卦：${req.primary.name}\n卦辞：${req.primary.statement}`);

  if (hasMoving) {
    const linesText = moving
      .map((m) => `第${m.position}爻（${positionName(m.position, req.lang)}）：${m.text}`)
      .join("\n");
    blocks.push(`动爻爻辞：\n${linesText}`);
    if (req.changed) {
      blocks.push(`变卦：${req.changed.name}\n卦辞：${req.changed.statement}`);
    }
  }

  if (req.lang === "zh") {
    const task = hasMoving
      ? "请综合以上卦象、动爻爻辞与变卦，解读所问之事的吉凶趋势与建议。先点明本卦总体含义与所问之事的关联，再据各动爻爻辞论变化趋势，最后以变卦指示最终走向。500 字左右。"
      : "请基于本卦卦辞，解读所问之事的吉凶趋势与建议。先点明卦象总体含义与所问之事的关联，再给出具体建议。400 字左右。";
    blocks.push(task);
  } else {
    const task = hasMoving
      ? "Synthesise the primary hexagram, the moving line texts, and the transformed hexagram to interpret the outlook and advice for the question asked. Start with the overall meaning of the primary hexagram in relation to the question, then analyse the changing trends indicated by the moving lines, and conclude with the direction shown by the transformed hexagram. About 400 words."
      : "Based on the primary hexagram statement, interpret the outlook and advice for the question asked. Start with the overall meaning in relation to the question, then give specific advice. About 300 words.";
    blocks.push(task);
  }

  return blocks.join("\n\n");
}

/** 爻位中文名（1=初爻 … 6=上爻） */
function positionName(position: number, lang: Lang): string {
  if (lang === "en") return `line ${position}`;
  const names = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];
  return names[position - 1] ?? `${position}爻`;
}
