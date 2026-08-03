import type { PageEntry } from "../pages/registry";
import type { DailyPost } from "../pages/daily";
import {
  HREFLANG_CODE,
  SITE_NAME,
  SITE_NAME_EN,
  absoluteUrl,
  pagePath,
  type Lang,
} from "../config/site";

interface BreadcrumbItem {
  "@type": "ListItem";
  position: number;
  name: string;
  item: string;
}

/** 序列化为 JSON-LD script 标签；转义所有 "<" 防止 </script> 注入 */
export function toJsonLdScript(data: object): string {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: SITE_NAME_EN,
    url: absoluteUrl("/"),
    inLanguage: ["zh-CN", "en"],
  };
}

export function pageJsonLd(page: PageEntry, lang: Lang): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": page.jsonldType ?? "WebPage",
    name: page.meta[lang].title,
    description: page.meta[lang].description,
    url: absoluteUrl(pagePath(lang, page.slug)),
    inLanguage: HREFLANG_CODE[lang],
  };
}

export function breadcrumbJsonLd(page: PageEntry, lang: Lang): Record<string, unknown> {
  const items: BreadcrumbItem[] = [
    {
      "@type": "ListItem",
      position: 1,
      name: lang === "zh" ? "首页" : "Home",
      item: absoluteUrl(pagePath(lang, "")),
    },
  ];
  if (page.slug !== "") {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: page.meta[lang].title,
      item: absoluteUrl(pagePath(lang, page.slug)),
    });
  }
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

export function articleJsonLd(post: DailyPost, lang: Lang): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.meta[lang].title,
    description: post.meta[lang].description,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: lang === "zh" ? SITE_NAME : SITE_NAME_EN },
    url: absoluteUrl(pagePath(lang, `daily/${post.date}`)),
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(pagePath(lang, `daily/${post.date}`)) },
    inLanguage: HREFLANG_CODE[lang],
  };
}

export function collectionPageJsonLd(lang: Lang): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: lang === "zh" ? "今日宜忌" : "Daily Almanac",
    url: absoluteUrl(pagePath(lang, "daily")),
    inLanguage: HREFLANG_CODE[lang],
  };
}

export function buildJsonLdScripts(page: PageEntry, lang: Lang): string {
  const scripts: object[] = [pageJsonLd(page, lang), breadcrumbJsonLd(page, lang)];
  if (page.slug === "") {
    scripts.unshift(websiteJsonLd());
  }
  return scripts.map(toJsonLdScript).join("\n    ");
}
