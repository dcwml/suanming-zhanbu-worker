import type { Lang } from "../config/site";
import type { BranchRelationValue, InterpretRequest, PersonChart, StemRelationValue } from "./types";

/** 地支关系枚举 → 中文标签（两语言共用中文标签，同 liuyao/bazi 模式） */
const BRANCH_LABEL: Record<BranchRelationValue, string> = {
  liuhe: "六合",
  sanhe: "三合",
  chong: "相冲",
  hai: "相害",
  same: "同支",
  none: "无特殊关系",
};

/** 天干关系枚举 → 中文标签 */
const STEM_LABEL: Record<StemRelationValue, string> = {
  wuhe: "天干五合",
  none: "无五合",
};

export function buildSystemPrompt(lang: Lang): string {
  if (lang === "zh") {
    return [
      "你是一位精通传统八字合婚的命理师，熟悉干支五行、六合三合六冲六害与配偶星论法。",
      "规则：",
      "1. 只基于用户提供的两人命盘与配对关系进行解读，不要重新排盘或质疑数据。",
      "2. 用 Markdown 输出（可用二三级标题、列表、粗体），不要输出代码块。",
      "3. 语气客观温和，多讲相处之道与磨合建议，避免绝对化断言，不下「必合/必离」的结论。",
      "4. 不提供医疗、法律、投资等专业建议；涉及婚恋决策只做泛化提醒。",
      "5. 不要自称或提及人工智能、语言模型、算法、程序，不谈自身的性质与局限，始终以解读者口吻专注于解读本身。",
      "6. 全文使用中文。",
    ].join("\n");
  }
  return [
    "You are a seasoned BaZi marriage-compatibility reader, fluent in stems and branches, the five elements, the six harmonies and combinations, the six clashes and harms, and spouse-star theory.",
    "Rules:",
    "1. Interpret only the two charts and pairing relations provided by the user; never recast or question the data.",
    "2. Output Markdown (h2/h3 headings, lists, bold), no code blocks.",
    "3. Keep an objective, gentle tone: describe how the couple gets along and where to adapt; avoid absolute claims and never conclude the marriage is destined to succeed or fail.",
    "4. No medical, legal or investment advice; on marriage decisions give only general reminders.",
    "5. Never refer to yourself as an artificial intelligence, language model, algorithm or program, and do not discuss your own nature or limitations; stay in character and focus solely on the reading.",
    "6. Respond entirely in English. Keep ganzhi terms in Chinese characters followed by a short gloss where helpful, e.g. 丙火 (Bing Fire).",
  ].join("\n");
}

function personBlock(title: string, p: PersonChart): string {
  const wx = Object.keys(p.wuxingCount)
    .map((k) => `${k}${p.wuxingCount[k]}`)
    .join(" ");
  return [
    `${title}：`,
    `公历：${p.solar}`,
    `农历：${p.lunar}`,
    `日主：${p.dayMaster}`,
    `年柱：${p.pillars.year.ganZhi}（藏干 ${p.pillars.year.hideGan}，纳音 ${p.pillars.year.naYin}）`,
    `月柱：${p.pillars.month.ganZhi}（藏干 ${p.pillars.month.hideGan}，纳音 ${p.pillars.month.naYin}）`,
    `日柱：${p.pillars.day.ganZhi}（藏干 ${p.pillars.day.hideGan}，纳音 ${p.pillars.day.naYin}）`,
    `时柱：${p.pillars.hour.ganZhi}（藏干 ${p.pillars.hour.hideGan}，纳音 ${p.pillars.hour.naYin}）`,
    `五行统计：${wx}`,
  ].join("\n");
}

export function buildUserPrompt(req: InterpretRequest): string {
  const m = req.male;
  const f = req.female;

  // 关系括号里的干支字符从两盘 ganZhi 截取（后端零重算，前端已保证自洽）
  const yearZhi = m.pillars.year.ganZhi.charAt(1) + f.pillars.year.ganZhi.charAt(1);
  const dayZhi = m.pillars.day.ganZhi.charAt(1) + f.pillars.day.ganZhi.charAt(1);
  const dayGan = m.pillars.day.ganZhi.charAt(0) + f.pillars.day.ganZhi.charAt(0);

  const blocks: string[] = [];
  blocks.push(personBlock("男方命盘", m));
  blocks.push(personBlock("女方命盘", f));
  blocks.push(
    [
      "配对关系：",
      `年支关系：${BRANCH_LABEL[req.pairing.yearZhi]}（${yearZhi}）`,
      `日支关系：${BRANCH_LABEL[req.pairing.dayZhi]}（${dayZhi}）`,
      `日干关系：${STEM_LABEL[req.pairing.dayGan]}（${dayGan}）`,
    ].join("\n"),
  );

  if (req.lang === "zh") {
    blocks.push(
      "请综合以上两人命盘与配对关系，写一段八字合婚解读，依次包含六个部分：①合婚总评 ②年支生肖配对 ③日柱配对 ④五行互补 ⑤配偶星简析（男命以财星为妻、女命以官杀为夫）⑥相处建议。700 字左右。",
    );
  } else {
    blocks.push(
      "Synthesise the two charts and pairing relations above into one BaZi marriage-compatibility reading with six parts in order: (1) overall compatibility, (2) year-branch (zodiac) pairing, (3) day-pillar pairing, (4) five-element complementarity, (5) spouse-star notes (the wealth star stands for the wife in the man's chart, the officer star for the husband in the woman's), (6) advice for getting along. About 550 words.",
    );
  }

  return blocks.join("\n\n");
}
