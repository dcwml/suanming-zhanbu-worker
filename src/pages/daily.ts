import type { Lang } from "../config/site";
import type { PageMeta } from "./registry";
import daily20260813Zh from "../content/daily/2026-08-13.zh.html";
import daily20260813En from "../content/daily/2026-08-13.en.html";
import daily20260812Zh from "../content/daily/2026-08-12.zh.html";
import daily20260812En from "../content/daily/2026-08-12.en.html";
import daily20260811Zh from "../content/daily/2026-08-11.zh.html";
import daily20260811En from "../content/daily/2026-08-11.en.html";
import daily20260810Zh from "../content/daily/2026-08-10.zh.html";
import daily20260810En from "../content/daily/2026-08-10.en.html";
import daily20260809Zh from "../content/daily/2026-08-09.zh.html";
import daily20260809En from "../content/daily/2026-08-09.en.html";
import daily20260808Zh from "../content/daily/2026-08-08.zh.html";
import daily20260808En from "../content/daily/2026-08-08.en.html";
import daily20260807Zh from "../content/daily/2026-08-07.zh.html";
import daily20260807En from "../content/daily/2026-08-07.en.html";
import daily20260806Zh from "../content/daily/2026-08-06.zh.html";
import daily20260806En from "../content/daily/2026-08-06.en.html";
import daily20260805Zh from "../content/daily/2026-08-05.zh.html";
import daily20260805En from "../content/daily/2026-08-05.en.html";
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
    date: "2026-08-13",
    meta: {
      zh: { title: "2026年8月13日宜忌·羊", description: "2026年8月13日黄历宜忌：宜祭祀、动土、筑堤、开池、会亲友、入殓、破土、安葬，忌开光、出行、修造、上梁、入宅、安门、作灶、裁衣，冲牛煞西；生肖羊今日运势与农历七月初一「鬼门开」民俗科普。" },
      en: { title: "Daily Almanac — August 13, 2026 (Goat)", description: "August 13, 2026 Chinese almanac: favorable for sacrifice, breaking ground, building dikes, digging ponds, meeting relatives and friends, encoffining and burial; avoid consecration, travel, construction, raising beams and moving into a house; clash Ox, Sha West; Goat zodiac fortune and the folklore of the Ghost Gate opening on the first day of the seventh lunar month." },
    },
    content: { zh: daily20260813Zh, en: daily20260813En },
  },
  {
    date: "2026-08-12",
    meta: {
      zh: { title: "2026年8月12日宜忌·马", description: "2026年8月12日黄历宜忌：宜嫁娶、祭祀、祈福、求嗣、出行、安床，忌盖屋、入殓、安葬、入宅、移徙、置产，冲鼠煞北；生肖马今日运势与纳音天上火科普。" },
      en: { title: "Daily Almanac — August 12, 2026 (Horse)", description: "August 12, 2026 Chinese almanac: favorable for marriage, sacrifice, praying for blessings, traveling and setting beds; avoid roofing, encoffining, burial, moving house and purchasing property; clash Rat, Sha North; Horse zodiac fortune and the Heavenly Fire Nayin." },
    },
    content: { zh: daily20260812Zh, en: daily20260812En },
  },
  {
    date: "2026-08-11",
    meta: {
      zh: { title: "2026年8月11日宜忌·蛇", description: "2026年8月11日黄历宜忌：宜祭祀、开光、解除、交易立券、纳财，忌动土破土、嫁娶、入宅移徙、出行，冲猪煞东；生肖蛇今日运势与天德月德合德神科普。" },
      en: { title: "Daily Almanac — August 11, 2026 (Snake)", description: "August 11, 2026 Chinese almanac: favorable for sacrifice, consecration, removal, trading, signing contracts and collecting wealth; avoid breaking ground, marriage, moving house and travel; clash Pig, Sha East; Snake zodiac fortune and the Tiāndé & Yuèdé Hé virtue spirits." },
    },
    content: { zh: daily20260811Zh, en: daily20260811En },
  },
  {
    date: "2026-08-10",
    meta: {
      zh: { title: "2026年8月10日宜忌·龙", description: "2026年8月10日黄历宜忌：宜嫁娶、入宅、移徙、开市交易立券、动土祈福，忌栽种、作灶、针灸、出行，冲狗煞南；生肖龙今日运势与黄道吉神金匮的科普。" },
      en: { title: "Daily Almanac — August 10, 2026 (Dragon)", description: "August 10, 2026 Chinese almanac: favorable for weddings, moving into a new home, opening business and signing contracts; avoid planting, installing stoves, acupuncture and travel; clash Dog, Sha South; Dragon zodiac fortune and the Jīnkuì Gold Cabinet auspicious spirit." },
    },
    content: { zh: daily20260810Zh, en: daily20260810En },
  },
  {
    date: "2026-08-09",
    meta: {
      zh: { title: "2026年8月9日宜忌·兔", description: "2026年8月9日黄历宜忌：宜祭祀、入殓、移柩、启钻、安葬、除服成服等收敛之事，馀事勿取，冲鸡煞东；生肖兔今日运势与吉神五合的由来科普。" },
      en: { title: "Daily Almanac — August 9, 2026 (Rabbit)", description: "August 9, 2026 Chinese almanac: favorable for sacrifice, encoffining and burial rites while all other matters are best avoided; clash Rooster, Sha East; Rabbit zodiac fortune and the story of the Wǔhé Five-Union auspicious spirit." },
    },
    content: { zh: daily20260809Zh, en: daily20260809En },
  },
  {
    date: "2026-08-08",
    meta: {
      zh: { title: "2026年8月8日宜忌·虎", description: "2026年8月8日黄历宜忌：月破日，宜破屋坏垣、馀事勿取，诸事不宜，冲猴煞北；生肖虎今日运势与月破日的由来科普。" },
      en: { title: "Daily Almanac — August 8, 2026 (Tiger)", description: "August 8, 2026 Chinese almanac: a Month-Broken day — favorable only for demolition and tearing down walls, all other matters best avoided; clash Monkey, Sha North; Tiger zodiac fortune and what a Month-Broken day means." },
    },
    content: { zh: daily20260808Zh, en: daily20260808En },
  },
  {
    date: "2026-08-07",
    meta: {
      zh: { title: "2026年8月7日宜忌·牛", description: "2026年8月7日黄历宜忌：今日恰逢立秋，宜祭祀、入殓、破土、安葬、移柩等收敛之事，馀事勿取，冲羊煞东；生肖牛今日运势与立秋节气和黄历的关系科普。" },
      en: { title: "Daily Almanac — August 7, 2026 (Ox)", description: "August 7, 2026 Chinese almanac: today is the Start of Autumn solar term — favorable for sacrifice, encoffining and burial, while all other matters are best avoided; clash Sheep, Sha East; Ox zodiac fortune and how solar terms shape the almanac." },
    },
    content: { zh: daily20260807Zh, en: daily20260807En },
  },
  {
    date: "2026-08-06",
    meta: {
      zh: { title: "2026年8月6日宜忌·鼠", description: "2026年8月6日黄历宜忌：宜沐浴理发、入殓移柩破土安葬，忌嫁娶入宅作灶上梁动土，冲马煞南；生肖鼠今日运势与桑柘木纳音科普。" },
      en: { title: "Daily Almanac — August 6, 2026 (Rat)", description: "August 6, 2026 Chinese almanac: favorable for bathing, haircutting, encoffining and burial; avoid marriage, moving in, installing stoves, raising beams and ground-breaking; Rat zodiac fortune and the Mulberry Wood Nayin." },
    },
    content: { zh: daily20260806Zh, en: daily20260806En },
  },
  {
    date: "2026-08-05",
    meta: {
      zh: { title: "2026年8月5日宜忌·猪", description: "2026年8月5日黄历宜忌：宜订盟纳采、移徙入宅、立券交易、竖柱上梁，忌嫁娶安葬破土，冲蛇煞西；生肖猪今日运势与纳音钗钏金科普。" },
      en: { title: "Daily Almanac — August 5, 2026 (Pig)", description: "August 5, 2026 Chinese almanac: favorable for engagement, moving into a new home, contracts and construction; avoid marriage, burial and ground-breaking; Pig zodiac fortune and the Hairpin Gold Nayin." },
    },
    content: { zh: daily20260805Zh, en: daily20260805En },
  },
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
