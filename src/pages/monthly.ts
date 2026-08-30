import type { Lang } from "../config/site";
import type { PageMeta } from "./registry";
import monthly202609Zh from "../content/monthly/2026-09.zh.html";
import monthly202609En from "../content/monthly/2026-09.en.html";
import monthly202608Zh from "../content/monthly/2026-08.zh.html";
import monthly202608En from "../content/monthly/2026-08.en.html";

export interface MonthlyPost {
  /** 月份 "YYYY-MM"（URL 键） */
  month: string;
  meta: Record<Lang, PageMeta>;
  content: Record<Lang, string>;
}

export interface MonthlyArchiveItem {
  month: string;
  title: Record<Lang, string>;
}

/** 归档页元信息：供 nav.ts / footer.ts 引用（不进 registry） */
export const MONTHLY_ARCHIVE_META = {
  title: { zh: "每月运势", en: "Monthly Horoscope" } as Record<Lang, string>,
  slug: "monthly",
} as const;

export const MONTHLY_POSTS: readonly MonthlyPost[] = [
  {
    month: "2026-09",
    meta: {
      zh: {
        title: "2026年9月十二生肖每月运势（丁酉月）",
        description: "2026年9月（农历丁酉月）十二生肖每月运势：白露金气肃降，月支酉六合龙、三合蛇牛、冲兔害狗；附本月嫁娶、搬家、开业、出行、修造吉日速查。",
      },
      en: {
        title: "Monthly Horoscope for All 12 Zodiacs — September 2026",
        description: "September 2026 monthly fortune for all twelve Chinese zodiac signs: the Dīng Yǒu Rooster month brings crisp Metal energy from White Dew; the month branch harmonizes with Dragon, Snake and Ox while clashing with Rabbit; plus a quick reference of auspicious days for weddings, moving, business, travel and construction.",
      },
    },
    content: { zh: monthly202609Zh, en: monthly202609En },
  },
  {
    month: "2026-08",
    meta: {
      zh: {
        title: "2026年8月十二生肖每月运势（丙申月）",
        description: "2026年8月（农历丙申月）十二生肖每月运势：立秋金气渐旺，月支申六合蛇、三合鼠龙、冲虎害猪；附本月嫁娶、搬家、开业、出行、修造吉日速查。",
      },
      en: {
        title: "Monthly Horoscope for All 12 Zodiacs — August 2026",
        description: "August 2026 monthly fortune for all twelve Chinese zodiac signs: the Bǐng Shēn Monkey month brings sharp Metal energy from the Start of Autumn; the month branch harmonizes with Snake, Rat and Dragon while clashing with Tiger; plus a quick reference of auspicious days for weddings, moving, business, travel and construction.",
      },
    },
    content: { zh: monthly202608Zh, en: monthly202608En },
  },
];

export function findMonthlyPost(month: string): MonthlyPost | undefined {
  return MONTHLY_POSTS.find((p) => p.month === month);
}

export function monthlyArchive(): MonthlyArchiveItem[] {
  return [...MONTHLY_POSTS]
    .sort((a, b) => b.month.localeCompare(a.month))
    .map((p) => ({ month: p.month, title: { zh: p.meta.zh.title, en: p.meta.en.title } }));
}
