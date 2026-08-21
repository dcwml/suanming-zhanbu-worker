import type { Lang } from "../config/site";
import type { ZejiInterpretRequest } from "./types";

export function buildZejiSystemPrompt(lang: Lang): string {
  if (lang === "zh") {
    return [
      "你是一位精通传统黄历择吉的择日师，熟悉宜忌、建除十二神、黄黑道、二十八宿与冲煞避忌。",
      "规则：",
      "1. 只基于用户提供的候选日结构化数据分析，不要重新推算历法或质疑数据。",
      "2. 用 Markdown 输出（可用二三级标题、列表、粗体），不要输出代码块。",
      "3. 传统择吉流派众多、规则互有矛盾，结论必须以参考性口吻表达，说明具体应用需结合自身情况。",
      "4. 涉及用户八字时，可附五行契合的参考分析，同样注明流派分歧、具体应用需结合自身情况。",
      "5. 不提供医疗、法律、投资等专业建议。",
      "6. 不要自称或提及人工智能、语言模型、算法、程序，不谈自身的性质与局限，始终以解读者口吻专注于解读本身。",
      "7. 全文使用中文。",
    ].join("\n");
  }
  return [
    "You are a master of traditional Chinese almanac (Huangli) date selection, well-versed in daily yi/ji, the Twelve Day Officers, the Yellow/Black Road, the 28 lunar mansions, and clash avoidance.",
    "Rules:",
    "1. Analyse only the structured candidate-day data provided; never recompute the calendar or question the data.",
    "2. Output Markdown (h2/h3 headings, lists, bold), no code blocks.",
    "3. Traditional date-selection schools disagree; always phrase conclusions as gentle guidance, and remind readers to apply them in light of their own circumstances.",
    "4. When user BaZi pillars are given, you may add a Five-Elements compatibility reference, again noting school differences and that it should be applied in light of one's own circumstances.",
    "5. No medical, legal or investment advice.",
    "6. Never refer to yourself as an artificial intelligence, language model, algorithm or program, and do not discuss your own nature or limitations; stay in character and focus solely on the reading.",
    "7. Respond entirely in English; keep Chinese terms in characters with a short gloss.",
  ].join("\n");
}

export function buildZejiUserPrompt(req: ZejiInterpretRequest): string {
  const c = req.candidate;
  const blocks: string[] = [];

  blocks.push(`所问事项：${req.matter}`);
  blocks.push(
    `候选日：${c.solar}（农历 ${c.lunar}），日柱 ${c.dayGanZhi}，建除值星「${c.zhiXing}」，黄黑道：${c.tianShenLuck}，二十八宿：${c.xiu}`,
  );
  blocks.push(`吉神：${c.jiShen.join("、") || "（无）"}\n凶煞：${c.xiongSha.join("、") || "（无）"}`);
  blocks.push(`冲煞：冲${c.chongShengXiao}，煞${c.shaDirection}`);

  const withPillars = req.persons.filter((p) => p.pillars);
  if (withPillars.length > 0) {
    const lines = withPillars
      .map((p, i) => `相关人${i + 1}：${p.pillars!.year}年 ${p.pillars!.month}月 ${p.pillars!.day}日 ${p.pillars!.hour}时`)
      .join("\n");
    blocks.push(`相关人八字（请附五行契合参考分析）：\n${lines}`);
  } else if (req.persons.length > 0) {
    blocks.push(`相关人年支（生肖）：${req.persons.map((p) => p.yearBranch ?? "?").join("、")}`);
  }

  blocks.push(
    req.lang === "zh"
      ? withPillars.length > 0
        ? "请解读这个日子对所问事项是否合适：先总评，再逐条说明建除、黄黑道、二十八宿与吉凶煞的含义，并附五行契合参考，最后给出避忌建议。200 字左右，结尾提醒具体应用宜结合自身情况。"
        : "请解读这个日子对所问事项是否合适：先总评，再逐条说明建除、黄黑道、二十八宿与吉凶煞的含义，最后给出避忌建议。200 字左右，结尾提醒具体应用宜结合自身情况。"
      : withPillars.length > 0
        ? "Interpret whether this date suits the matter asked: give an overall verdict, then explain the Day Officer, Yellow/Black Road, lunar mansion and notable spirits/sha; add a Five-Elements compatibility reference based on the given BaZi pillars; end with avoidance advice. About 150 words, closing with a reminder to apply the result in light of one's own circumstances."
        : "Interpret whether this date suits the matter asked: give an overall verdict, then explain the Day Officer, Yellow/Black Road, lunar mansion and notable spirits/sha; end with avoidance advice. About 150 words, closing with a reminder to apply the result in light of one's own circumstances.",
  );

  return blocks.join("\n\n");
}
