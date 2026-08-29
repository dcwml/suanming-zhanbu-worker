import type { PageEntry } from "../pages/registry";
import type { DailyPost } from "../pages/daily";
import type { WeeklyPost } from "../pages/weekly";
import type { MonthlyPost } from "../pages/monthly";
import type { TuiyanPost } from "../pages/tuiyan";
import {
  DEFAULT_LANG,
  HREFLANG_CODE,
  LANGS,
  OG_IMAGE_PATH,
  OG_LOCALE,
  OTHER_LANG,
  SITE_NAME,
  SITE_NAME_EN,
  SITE_SLOGAN,
  SITE_SLOGAN_EN,
  absoluteUrl,
  pagePath,
  type Lang,
} from "../config/site";
import {
  articleJsonLd,
  buildJsonLdScripts,
  collectionPageJsonLd,
  monthlyArticleJsonLd,
  toJsonLdScript,
  tuiyanArticleJsonLd,
  weeklyArticleJsonLd,
} from "./jsonld";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function siteName(lang: Lang): string {
  return lang === "zh" ? SITE_NAME : SITE_NAME_EN;
}

export function pageTitle(page: PageEntry, lang: Lang): string {
  if (page.slug === "") {
    return lang === "zh" ? `${SITE_NAME} - ${SITE_SLOGAN}` : `${SITE_NAME_EN} - ${SITE_SLOGAN_EN}`;
  }
  return `${page.meta[lang].title} - ${siteName(lang)}`;
}

/** 生成 <head> 内全部标签（含 JSON-LD），不含 <head> 本身 */
export function buildHead(page: PageEntry, lang: Lang): string {
  const meta = page.meta[lang];
  const canonical = absoluteUrl(pagePath(lang, page.slug));
  const title = escapeHtml(pageTitle(page, lang));
  const description = escapeHtml(meta.description);
  const image = absoluteUrl(OG_IMAGE_PATH);
  const otherLang = OTHER_LANG[lang];

  const hreflangs = LANGS.map(
    (l) =>
      `<link rel="alternate" hreflang="${HREFLANG_CODE[l]}" href="${absoluteUrl(pagePath(l, page.slug))}">`,
  ).join("\n    ");
  const xDefault = `<link rel="alternate" hreflang="x-default" href="${absoluteUrl(pagePath(DEFAULT_LANG, page.slug))}">`;

  return [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<link rel="icon" type="image/png" href="/assets/logo.png">`,
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${canonical}">`,
    hreflangs,
    xDefault,
    `<meta property="og:type" content="${page.slug === "" ? "website" : "article"}">`,
    `<meta property="og:site_name" content="${escapeHtml(siteName(lang))}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:locale" content="${OG_LOCALE[lang]}">`,
    `<meta property="og:locale:alternate" content="${OG_LOCALE[otherLang]}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${image}">`,
    buildJsonLdScripts(page, lang),
  ].join("\n    ");
}

/** 404/500 用的极简 head：noindex，无 canonical/og */
export function buildPlainHead(lang: Lang, titleText: string): string {
  void lang;
  return [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<link rel="icon" type="image/png" href="/assets/logo.png">`,
    `<meta name="robots" content="noindex">`,
    `<title>${escapeHtml(titleText)}</title>`,
  ].join("\n    ");
}

interface StandardHeadInput {
  lang: Lang;
  /** 规范路径段（不含语言前缀与尾斜杠），如 "daily/2026-08-03"、"weekly"、"monthly/2026-08" */
  slug: string;
  /** 完整标题（已含站名后缀） */
  title: string;
  description: string;
  ogType: "website" | "article";
  jsonLdHtml: string;
}

/** daily / weekly / monthly 单篇与归档页共用的完整 head 构建 */
function buildStandardHead(input: StandardHeadInput): string {
  const { lang, slug } = input;
  const canonical = absoluteUrl(pagePath(lang, slug));
  const title = escapeHtml(input.title);
  const description = escapeHtml(input.description);
  const image = absoluteUrl(OG_IMAGE_PATH);
  const otherLang = OTHER_LANG[lang];

  const hreflangs = LANGS.map(
    (l) =>
      `<link rel="alternate" hreflang="${HREFLANG_CODE[l]}" href="${absoluteUrl(pagePath(l, slug))}">`,
  ).join("\n    ");
  const xDefault = `<link rel="alternate" hreflang="x-default" href="${absoluteUrl(pagePath(DEFAULT_LANG, slug))}">`;

  return [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<link rel="icon" type="image/png" href="/assets/logo.png">`,
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${canonical}">`,
    hreflangs,
    xDefault,
    `<meta property="og:type" content="${input.ogType}">`,
    `<meta property="og:site_name" content="${escapeHtml(siteName(lang))}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:locale" content="${OG_LOCALE[lang]}">`,
    `<meta property="og:locale:alternate" content="${OG_LOCALE[otherLang]}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${image}">`,
    input.jsonLdHtml,
  ].join("\n    ");
}

/** daily 单篇 head：三段路径 canonical + Article JSON-LD */
export function buildDailyPostHead(post: DailyPost, lang: Lang): string {
  return buildStandardHead({
    lang,
    slug: `daily/${post.date}`,
    title: `${post.meta[lang].title} - ${siteName(lang)}`,
    description: post.meta[lang].description,
    ogType: "article",
    jsonLdHtml: toJsonLdScript(articleJsonLd(post, lang)),
  });
}

/** weekly 单篇 head：canonical 指向 /:lang/weekly/:monday/ */
export function buildWeeklyPostHead(post: WeeklyPost, lang: Lang): string {
  return buildStandardHead({
    lang,
    slug: `weekly/${post.monday}`,
    title: `${post.meta[lang].title} - ${siteName(lang)}`,
    description: post.meta[lang].description,
    ogType: "article",
    jsonLdHtml: toJsonLdScript(weeklyArticleJsonLd(post, lang)),
  });
}

/** monthly 单篇 head：canonical 指向 /:lang/monthly/:month/ */
export function buildMonthlyPostHead(post: MonthlyPost, lang: Lang): string {
  return buildStandardHead({
    lang,
    slug: `monthly/${post.month}`,
    title: `${post.meta[lang].title} - ${siteName(lang)}`,
    description: post.meta[lang].description,
    ogType: "article",
    jsonLdHtml: toJsonLdScript(monthlyArticleJsonLd(post, lang)),
  });
}

/** daily 归档页 head */
export function buildDailyArchiveHead(lang: Lang): string {
  return buildStandardHead({
    lang,
    slug: "daily",
    title: lang === "zh" ? `今日宜忌 - ${SITE_NAME}` : `Daily Almanac - ${SITE_NAME_EN}`,
    description: lang === "zh" ? "每日黄历宜忌、生肖运势与玄学科普。" : "Daily Chinese almanac, zodiac fortune and folklore.",
    ogType: "website",
    jsonLdHtml: toJsonLdScript(collectionPageJsonLd(lang)),
  });
}

/** weekly 归档页 head */
export function buildWeeklyArchiveHead(lang: Lang): string {
  return buildStandardHead({
    lang,
    slug: "weekly",
    title: lang === "zh" ? `每周运势 - ${SITE_NAME}` : `Weekly Horoscope - ${SITE_NAME_EN}`,
    description:
      lang === "zh"
        ? "十二生肖每周运势：特吉与忠告生肖、本周冲忌与逐日干支速览，每周更新。"
        : "Weekly horoscope for all twelve Chinese zodiac signs — luckiest signs, daily clash alerts and a day-by-day guide, updated weekly.",
    ogType: "website",
    jsonLdHtml: toJsonLdScript(
      collectionPageJsonLd(lang, lang === "zh" ? "每周运势" : "Weekly Horoscope", "weekly"),
    ),
  });
}

/** monthly 归档页 head */
export function buildMonthlyArchiveHead(lang: Lang): string {
  return buildStandardHead({
    lang,
    slug: "monthly",
    title: lang === "zh" ? `每月运势 - ${SITE_NAME}` : `Monthly Horoscope - ${SITE_NAME_EN}`,
    description:
      lang === "zh"
        ? "十二生肖每月运势：月柱节气总览、生肖月度推演与本月吉日速查，每月更新。"
        : "Monthly horoscope for all twelve Chinese zodiac signs — month pillar and solar terms, per-sign readings and an auspicious-day quick reference, updated monthly.",
    ogType: "website",
    jsonLdHtml: toJsonLdScript(
      collectionPageJsonLd(lang, lang === "zh" ? "每月运势" : "Monthly Horoscope", "monthly"),
    ),
  });
}

/** tuiyan 单篇 head */
export function buildTuiyanPostHead(post: TuiyanPost, lang: Lang): string {
  return buildStandardHead({
    lang,
    slug: `tuiyan/${post.firstDay}`,
    title: `${post.meta[lang].title} - ${siteName(lang)}`,
    description: post.meta[lang].description,
    ogType: "article",
    jsonLdHtml: toJsonLdScript(tuiyanArticleJsonLd(post, lang)),
  });
}

/** tuiyan 归档页 head */
export function buildTuiyanArchiveHead(lang: Lang): string {
  return buildStandardHead({
    lang,
    slug: "tuiyan",
    title: lang === "zh" ? `时辰推演 - ${SITE_NAME}` : `Hour Omens - ${SITE_NAME_EN}`,
    description:
      lang === "zh"
        ? "每个农历月一篇的特殊时辰榜单：纯阳之体、三合成局、方会连珠与魁罡日逐时推演，仿古批语附白话细解。"
        : "A monthly chart of extraordinary birth hours — all-yang pillars, trines, directional unions and Kui Gang days, each with an imperial astrologer's verdict explained in plain words.",
    ogType: "website",
    jsonLdHtml: toJsonLdScript(
      collectionPageJsonLd(lang, lang === "zh" ? "时辰推演" : "Hour Omens", "tuiyan"),
    ),
  });
}
