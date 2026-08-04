import type { Lang } from "../config/site";
import type { PageMeta } from "./registry";
import daily20260804Zh from "../content/daily/2026-08-04.zh.html";
import daily20260804En from "../content/daily/2026-08-04.en.html";
import daily20260803Zh from "../content/daily/2026-08-03.zh.html";
import daily20260803En from "../content/daily/2026-08-03.en.html";

export interface DailyPost {
  /** ISO 日期 "YYYY-MM-DD" */
  date: string;
  meta: Record<Lang, PageMeta>;
  content: Record<Lang, string>;
}

export interface DailyArchiveItem {
  date: string;
  title: Record<Lang, string>;
}

/** 归档页元信息：供 nav.ts / footer.ts 引用（不进 registry） */
export const DAILY_ARCHIVE_META = {
  title: { zh: "今日宜忌", en: "Daily Almanac" } as Record<Lang, string>,
  slug: "daily",
} as const;

export const DAILY_POSTS: readonly DailyPost[] = [
  {
    date: "2026-08-04",
    meta: {
      zh: { title: "2026年8月4日宜忌·狗", description: "2026年8月4日黄历宜忌：宜祭祀、修饰垣墙、平治道涂，忌开市动土嫁娶，冲龙煞北；生肖狗今日运势与黄道六吉神青龙科普。" },
      en: { title: "Daily Almanac — August 4, 2026 (Dog)", description: "August 4, 2026 Chinese almanac: favorable for sacrifice and repairs, avoid business openings, ground-breaking and weddings; Dog zodiac fortune and the Azure Dragon of the Yellow Path." },
    },
    content: { zh: daily20260804Zh, en: daily20260804En },
  },
  {
    date: "2026-08-03",
    meta: {
      zh: { title: "2026年8月3日宜忌·鸡", description: "2026年8月3日黄历宜忌：纳财开市交易皆宜，冲兔煞东；生肖鸡今日运势与建除十二神科普。" },
      en: { title: "Daily Almanac — August 3, 2026 (Rooster)", description: "August 3, 2026 Chinese almanac: suitable for trade and business, clashes Rabbit; Rooster zodiac fortune and the Twelve Day Officers." },
    },
    content: { zh: daily20260803Zh, en: daily20260803En },
  },
];

export function findDailyPost(date: string): DailyPost | undefined {
  return DAILY_POSTS.find((p) => p.date === date);
}

export function dailyArchive(): DailyArchiveItem[] {
  return [...DAILY_POSTS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((p) => ({ date: p.date, title: { zh: p.meta.zh.title, en: p.meta.en.title } }));
}
