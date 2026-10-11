import type { Lang } from "../config/site";
import type { PageMeta } from "./registry";
import tuiyan20260813Zh from "../content/tuiyan/2026-08-13.zh.html";
import tuiyan20260813En from "../content/tuiyan/2026-08-13.en.html";
import tuiyan20260911Zh from "../content/tuiyan/2026-09-11.zh.html";
import tuiyan20260911En from "../content/tuiyan/2026-09-11.en.html";
import tuiyan20261010Zh from "../content/tuiyan/2026-10-10.zh.html";
import tuiyan20261010En from "../content/tuiyan/2026-10-10.en.html";

export interface TuiyanPost {
  /** 农历月首日公历日期 "YYYY-MM-DD"（URL 键） */
  firstDay: string;
  meta: Record<Lang, PageMeta>;
  content: Record<Lang, string>;
}

export interface TuiyanArchiveItem {
  firstDay: string;
  title: Record<Lang, string>;
}

/** 归档页元信息：供 nav.ts / footer.ts 引用（不进 registry） */
export const TUIYAN_ARCHIVE_META = {
  title: { zh: "时辰推演", en: "Hour Omens" } as Record<Lang, string>,
  slug: "tuiyan",
} as const;

export const TUIYAN_POSTS: readonly TuiyanPost[] = [
  {
    firstDay: "2026-08-13",
    meta: {
      zh: {
        title: "2026农历七月特殊时辰推演：纯阳、三合局与魁罡时辰榜",
        description:
          "农历七月348个时辰逐时推演：20个一级大格、魁罡日九月三日全天12时辰、纯阳78格与每日亮点速查。",
      },
      en: {
        title: "Hour Omens of Lunar July 2026: All-Yang Charts, Trine Hours and Kui Gang",
        description:
          "All 348 double-hours of lunar July 2026 charted one by one: twenty grand configurations, the Kui Gang day of September 3, seventy-eight all-yang hours and a day-by-day quick reference.",
      },
    },
    content: { zh: tuiyan20260813Zh, en: tuiyan20260813En },
  },
  {
    firstDay: "2026-09-11",
    meta: {
      zh: {
        title: "2026农历八月特殊时辰推演：纯阳孤本、三合金局与魁罡三日",
        description:
          "农历八月348个时辰逐时推演：19个一级大格、魁罡日三日并见、纯阳六格凝于八月廿九一日与每日亮点速查。",
      },
      en: {
        title: "Hour Omens of Lunar August 2026: The Sole All-Yang Day, Metal Trines and Triple Kui Gang",
        description:
          "All 348 double-hours of lunar August 2026 charted one by one: nineteen grand configurations, three Kui Gang days, six all-yang hours gathered on a single day, and a day-by-day quick reference.",
      },
    },
    content: { zh: tuiyan20260911Zh, en: tuiyan20260911En },
  },
  {
    firstDay: "2026-10-10",
    meta: {
      zh: {
        title: "2026农历九月特殊时辰推演：双日全格、五十二火局与纯阳铺月",
        description:
          "农历九月360个时辰逐时推演：65个一级大格、初十廿二两日全天成格、寅午戌火局五十二见、纯阳84格铺开半月、魁罡日九月廿四与每日亮点速查。",
      },
      en: {
        title:
          "Hour Omens of Lunar September 2026: Two All-Grand Days, Fifty-Two Fire Trines and All-Yang Across the Month",
        description:
          "All 360 double-hours of lunar September 2026 charted one by one: sixty-five grand configurations, two whole days where every hour carries a grand mark, fifty-two fire trines, eighty-four all-yang hours, one Kui Gang day, and a day-by-day quick reference.",
      },
    },
    content: { zh: tuiyan20261010Zh, en: tuiyan20261010En },
  },
];

export function findTuiyanPost(firstDay: string): TuiyanPost | undefined {
  return TUIYAN_POSTS.find((p) => p.firstDay === firstDay);
}

export function tuiyanArchive(): TuiyanArchiveItem[] {
  return [...TUIYAN_POSTS]
    .sort((a, b) => b.firstDay.localeCompare(a.firstDay))
    .map((p) => ({ firstDay: p.firstDay, title: { zh: p.meta.zh.title, en: p.meta.en.title } }));
}
