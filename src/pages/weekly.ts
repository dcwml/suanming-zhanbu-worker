import type { Lang } from "../config/site";
import type { PageMeta } from "./registry";
import weekly20260817Zh from "../content/weekly/2026-08-17.zh.html";
import weekly20260817En from "../content/weekly/2026-08-17.en.html";
import weekly20260824Zh from "../content/weekly/2026-08-24.zh.html";
import weekly20260824En from "../content/weekly/2026-08-24.en.html";

export interface WeeklyPost {
  /** 该周周一的 ISO 日期 "YYYY-MM-DD"（URL 键） */
  monday: string;
  meta: Record<Lang, PageMeta>;
  content: Record<Lang, string>;
}

export interface WeeklyArchiveItem {
  monday: string;
  title: Record<Lang, string>;
}

/** 归档页元信息：供 nav.ts / footer.ts 引用（不进 registry） */
export const WEEKLY_ARCHIVE_META = {
  title: { zh: "每周运势", en: "Weekly Horoscope" } as Record<Lang, string>,
  slug: "weekly",
} as const;

export const WEEKLY_POSTS: readonly WeeklyPost[] = [
  {
    monday: "2026-08-24",
    meta: {
      zh: {
        title: "十二生肖一周运势（2026年8月24日–30日）",
        description: "2026年8月24日至30日十二生肖每周运势：特吉生肖虎、兔、龙，次吉生肖蛇、马、羊，属鼠者本周宜守；周四逢农历七月十五中元节，周日青龙吉日收官；逐日干支速览与每日冲忌提醒。",
      },
      en: {
        title: "Weekly Horoscope for All 12 Zodiacs — Aug 24–30, 2026",
        description: "Weekly fortune for all twelve Chinese zodiac signs, August 24–30, 2026: Tiger, Rabbit and Dragon top the luckiest signs with Snake, Horse and Goat following, while Rat is advised to play it safe; Thursday marks the Ghost Festival and Sunday's Azure Dragon day closes the week well; plus a day-by-day stems-and-branches overview with daily clash alerts.",
      },
    },
    content: { zh: weekly20260824Zh, en: weekly20260824En },
  },
  {
    monday: "2026-08-17",
    meta: {
      zh: {
        title: "十二生肖一周运势（2026年8月17日–23日）",
        description: "2026年8月17日至23日十二生肖每周运势：特吉生肖鸡、牛、鼠，次吉生肖猴、猪、狗，属马者本周宜守；逐日干支速览与每日冲忌提醒。",
      },
      en: {
        title: "Weekly Horoscope for All 12 Zodiacs — Aug 17–23, 2026",
        description: "Weekly fortune for all twelve Chinese zodiac signs, August 17–23, 2026: Rooster, Ox and Rat lead the luckiest signs; Horse is advised to play it safe; plus a day-by-day stems-and-branches overview with daily clash alerts.",
      },
    },
    content: { zh: weekly20260817Zh, en: weekly20260817En },
  },
];

export function findWeeklyPost(monday: string): WeeklyPost | undefined {
  return WEEKLY_POSTS.find((p) => p.monday === monday);
}

export function weeklyArchive(): WeeklyArchiveItem[] {
  return [...WEEKLY_POSTS]
    .sort((a, b) => b.monday.localeCompare(a.monday))
    .map((p) => ({ monday: p.monday, title: { zh: p.meta.zh.title, en: p.meta.en.title } }));
}
