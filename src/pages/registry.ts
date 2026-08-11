import type { Lang } from "../config/site";
import homeZh from "../content/home.zh.html";
import homeEn from "../content/home.en.html";
import baziZh from "../content/bazi.zh.html";
import baziEn from "../content/bazi.en.html";
import liuyaoZh from "../content/liuyao.zh.html";
import liuyaoEn from "../content/liuyao.en.html";
import notfoundZh from "../content/notfound.zh.html";
import notfoundEn from "../content/notfound.en.html";

export interface PageMeta {
  title: string;
  description: string;
}

export interface PageEntry {
  /** URL 段；"" 表示首页 */
  slug: string;
  /** 是否出现在顶部导航 */
  inNav: boolean;
  /** JSON-LD @type，默认 WebPage */
  jsonldType?: "Article" | "FAQPage";
  meta: Record<Lang, PageMeta>;
  content: Record<Lang, string>;
  /** 页内 FAQ 问答（存在时 head 自动注入 FAQPage JSON-LD） */
  faq?: Record<Lang, { question: string; answer: string }[]>;
}

export const PAGES: readonly PageEntry[] = [
  {
    slug: "",
    inNav: true,
    meta: {
      zh: { title: "首页", description: "玄命阁：在线八字排盘与六爻起卦，天干地支、五行入门。" },
      en: { title: "Home", description: "Xuanming Pavilion: free BaZi chart reading and I Ching casting, with introductions to Heavenly Stems, Earthly Branches and the Five Elements." },
    },
    content: { zh: homeZh, en: homeEn },
  },
  {
    slug: "bazi",
    inNav: true,
    meta: {
      zh: { title: "八字排盘", description: "在线八字排盘：四柱十神、大运流年，AI 智能解读命局走势。" },
      en: { title: "BaZi Chart", description: "Free BaZi Four-Pillars calculator with AI readings of your chart, luck cycles and yearly outlook." },
    },
    content: { zh: baziZh, en: baziEn },
  },
  {
    slug: "liuyao",
    inNav: true,
    meta: {
      zh: { title: "六爻起卦", description: "在线六爻起卦：铜钱摇卦、周易卦辞，AI 智能解读吉凶趋势。" },
      en: { title: "I Ching Casting", description: "Free online I Ching coin-toss hexagram casting with AI-powered readings." },
    },
    content: { zh: liuyaoZh, en: liuyaoEn },
  },
];

export const NOT_FOUND_CONTENT: Record<Lang, string> = {
  zh: notfoundZh,
  en: notfoundEn,
};

export function findPage(slug: string): PageEntry | undefined {
  return PAGES.find((p) => p.slug === slug);
}

export function navPages(): PageEntry[] {
  return PAGES.filter((p) => p.inNav);
}
