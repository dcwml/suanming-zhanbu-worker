import type { Lang } from "../config/site";
import homeZh from "../content/home.zh.html";
import homeEn from "../content/home.en.html";
import sampleZh from "../content/sample.zh.html";
import sampleEn from "../content/sample.en.html";
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
}

export const PAGES: PageEntry[] = [
  {
    slug: "",
    inNav: true,
    meta: {
      zh: { title: "首页", description: "玄命阁首页：八字命理、塔罗占卜与传统文化专栏。" },
      en: { title: "Home", description: "Xuanming Pavilion: BaZi, tarot and traditional culture." },
    },
    content: { zh: homeZh, en: homeEn },
  },
  {
    slug: "sample",
    inNav: true,
    jsonldType: "Article",
    meta: {
      zh: { title: "示例文章", description: "演示如何以正文片段方式新增一个页面。" },
      en: { title: "Sample Article", description: "Shows how to add a page using body fragments." },
    },
    content: { zh: sampleZh, en: sampleEn },
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
