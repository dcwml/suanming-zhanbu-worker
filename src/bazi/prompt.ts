import type { Lang } from "../config/site";
import type { BaziChart, Part, PillarData, ShenShaItem } from "./types";

export function buildSystemPrompt(lang: Lang): string {
  if (lang === "zh") {
    return [
      "你是一位精通传统八字命理的资深命理师，熟悉十神、五行生克、大运流年的分析方法。",
      "规则：",
      "1. 只基于用户提供的排盘数据分析，不要重新排盘、不要质疑数据。",
      "2. 用 Markdown 输出（可用二三级标题、列表、粗体），不要输出代码块。",
      "3. 语气客观温和，多讲趋势与建议，避免绝对化断言。",
      "4. 不提供医疗、法律、投资等专业建议；涉及健康财务话题只做泛化提醒。",
      "5. 全文使用中文。",
    ].join("\n");
  }
  return [
    "You are a seasoned BaZi (Four Pillars) fortune-telling master, fluent in Ten Gods, Five Elements and luck-cycle analysis.",
    "Rules:",
    "1. Analyse only the chart data provided by the user; never recalculate or question it.",
    "2. Output Markdown (h2/h3 headings, lists, bold), no code blocks.",
    "3. Keep an objective, gentle tone; describe tendencies and advice, avoid absolute claims.",
    "4. No medical, legal or investment advice; only general reminders on such topics.",
    "5. Respond entirely in English. Keep GanZhi and Ten-God terms in Chinese characters followed by a short English gloss, e.g. 庚午 (Geng-Wu).",
  ].join("\n");
}

function pillarLine(name: string, p: PillarData): string {
  return `${name}：${p.ganZhi}（主星 ${p.shiShenGan}；藏干 ${p.hideGan}；副星 ${p.shiShenZhi}；纳音 ${p.naYin}；空亡 ${p.xunKong}）`;
}

/** 神煞列表 → 文本，如 "天乙贵人(日柱)、文昌(时柱)" 或 "无" */
function ssLine(items: ShenShaItem[]): string {
  return items.map((i) => `${i.name}(${i.pillars.join("、")})`).join("、") || "无";
}

/** 排盘基础信息文本，中英共用（汉字术语保留，由 system prompt 决定输出语言） */
function chartText(chart: BaziChart): string {
  const px = chart.pillars;
  const wx = Object.entries(chart.wuxingCount)
    .map(([k, v]) => `${k}${v}`)
    .join(" ");
  const lines = [
    `性别：${chart.gender === "male" ? "男" : "女"}`,
    `出生公历：${chart.solar}`,
    `出生农历：${chart.lunar}`,
    pillarLine("年柱", px.year),
    pillarLine("月柱", px.month),
    pillarLine("日柱", px.day),
    pillarLine("时柱", px.hour),
    `日主：${chart.dayMaster}`,
    `五行统计：${wx}`,
    `起运：${chart.qiYun}`,
  ];
  // 神煞为可选字段；有命中时追加一行概览，无则不输出
  const ss = chart.shenSha;
  if (ss && (ss.auspicious.length || ss.inauspicious.length)) {
    lines.push(`命局神煞：吉神 ${ssLine(ss.auspicious)}；凶煞 ${ssLine(ss.inauspicious)}`);
  }
  return lines.join("\n");
}

function daYunText(chart: BaziChart): string {
  return chart.daYun
    .map(
      (d) =>
        `${d.ganZhi}运 ${d.startAge}岁起（${d.startYear}-${d.endYear}）${d.isCurrent ? " ←当前大运" : ""}`,
    )
    .join("\n");
}

function nowText(chart: BaziChart): string {
  const now = chart.now;
  const liuNian = now.liuNian.map((n) => `${n.year}年 ${n.ganZhi}（虚岁 ${n.age}）`).join("\n");
  const currentMonth = now.ganZhi.month;
  const liuYue = now.liuYue
    .map((m) => `${m.ganZhi}月${m.ganZhi === currentMonth ? " ←当前月" : ""}`)
    .join("\n");
  return [
    `今日公历：${now.solar}（农历 ${now.lunar}）`,
    `当前干支三柱：${now.ganZhi.year}年 ${now.ganZhi.month}月 ${now.ganZhi.day}日`,
    `流年（含未来）：\n${liuNian}`,
    `今年十二节气月（干支月）：\n${liuYue}`,
  ].join("\n");
}

const TASKS: Record<Part, Record<Lang, string>> = {
  bazi: {
    zh: "请解读这个八字命局：日主强弱与格局、五行喜忌、性格特点、事业财运、感情婚姻、健康提示。如有命局神煞可作辅助参考（正统子平以五行十神为主，神煞辅之）。600 字左右。",
    en: "Interpret this natal chart: day-master strength and structure, favourable/unfavourable elements, personality, career and wealth, relationships, health reminders. If natal ShenSha (auspicious/inauspicious stars) are provided, use them as supplementary reference (orthodox Ziping prioritises elements and Ten Gods, with ShenSha as secondary). About 500 words.",
  },
  dayun: {
    zh: "请逐步解读上面列出的各步大运走势（每步 2-3 句），并重点详细分析标注「当前大运」的一步。",
    en: "Interpret each luck cycle (Da Yun) listed above in 2-3 sentences, with an in-depth analysis of the one marked as current.",
  },
 liunian: {
    zh: "请结合命局与当前大运，解读今年流年运势；然后逐一解读上面列出的 12 个干支月（节气月），其中标注「当前月」的要尤其详细（单独小节、篇幅加倍）。注意：月份以干支为准，不要按公历月份描述。",
    en: "Based on the chart and current luck cycle, interpret this year's annual luck, then interpret each of the 12 GanZhi months (sectional months) listed above; give the one marked as current an extra-detailed section. Note: months are identified by GanZhi stems-branches, not Gregorian calendar months.",
  },
};

export function buildUserPrompt(part: Part, lang: Lang, chart: BaziChart): string {
  const blocks = [chartText(chart)];
  if (part === "dayun" || part === "liunian") {
    blocks.push(`大运列表：\n${daYunText(chart)}`);
  }
  if (part === "liunian") {
    blocks.push(`当前时间信息：\n${nowText(chart)}`);
  }
  blocks.push(TASKS[part][lang]);
  return blocks.join("\n\n");
}
