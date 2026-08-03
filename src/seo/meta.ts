import type { PageEntry } from "../pages/registry";
import type { DailyPost } from "../pages/daily";
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
import { articleJsonLd, buildJsonLdScripts, collectionPageJsonLd, toJsonLdScript } from "./jsonld";

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

/** daily 单篇 head：三段路径 canonical + Article JSON-LD */
export function buildDailyPostHead(post: DailyPost, lang: Lang): string {
  const path = pagePath(lang, `daily/${post.date}`);
  const canonical = absoluteUrl(path);
  const title = escapeHtml(`${post.meta[lang].title} - ${siteName(lang)}`);
  const description = escapeHtml(post.meta[lang].description);
  const image = absoluteUrl(OG_IMAGE_PATH);
  const otherLang = OTHER_LANG[lang];

  const hreflangs = LANGS.map(
    (l) =>
      `<link rel="alternate" hreflang="${HREFLANG_CODE[l]}" href="${absoluteUrl(pagePath(l, `daily/${post.date}`))}">`,
  ).join("\n    ");
  const xDefault = `<link rel="alternate" hreflang="x-default" href="${absoluteUrl(pagePath(DEFAULT_LANG, `daily/${post.date}`))}">`;

  return [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<link rel="icon" type="image/png" href="/assets/logo.png">`,
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${canonical}">`,
    hreflangs,
    xDefault,
    `<meta property="og:type" content="article">`,
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
    toJsonLdScript(articleJsonLd(post, lang)),
  ].join("\n    ");
}

/** daily 归档页 head */
export function buildDailyArchiveHead(lang: Lang): string {
  const path = pagePath(lang, "daily");
  const canonical = absoluteUrl(path);
  const title = escapeHtml(lang === "zh" ? `今日宜忌 - ${SITE_NAME}` : `Daily Almanac - ${SITE_NAME_EN}`);
  const description = escapeHtml(lang === "zh" ? "每日黄历宜忌、生肖运势与玄学科普。" : "Daily Chinese almanac, zodiac fortune and folklore.");
  const image = absoluteUrl(OG_IMAGE_PATH);
  const otherLang = OTHER_LANG[lang];

  const hreflangs = LANGS.map(
    (l) =>
      `<link rel="alternate" hreflang="${HREFLANG_CODE[l]}" href="${absoluteUrl(pagePath(l, "daily"))}">`,
  ).join("\n    ");
  const xDefault = `<link rel="alternate" hreflang="x-default" href="${absoluteUrl(pagePath(DEFAULT_LANG, "daily"))}">`;

  return [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<link rel="icon" type="image/png" href="/assets/logo.png">`,
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${canonical}">`,
    hreflangs,
    xDefault,
    `<meta property="og:type" content="website">`,
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
    toJsonLdScript(collectionPageJsonLd(lang)),
  ].join("\n    ");
}
