import type { PageEntry } from "../pages/registry";
import type { DailyPost } from "../pages/daily";
import type { WeeklyPost } from "../pages/weekly";
import type { MonthlyPost } from "../pages/monthly";
import type { TuiyanPost } from "../pages/tuiyan";
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

/** daily / weekly / monthly 共用的 Article JSON-LD 构建 */
function articleJsonLdBase(opts: {
  headline: string;
  description: string;
  date: string;
  slug: string;
  lang: Lang;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    datePublished: opts.date,
    dateModified: opts.date,
    author: { "@type": "Organization", name: opts.lang === "zh" ? SITE_NAME : SITE_NAME_EN },
    url: absoluteUrl(pagePath(opts.lang, opts.slug)),
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(pagePath(opts.lang, opts.slug)) },
    inLanguage: HREFLANG_CODE[opts.lang],
  };
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
  return articleJsonLdBase({
    headline: post.meta[lang].title,
    description: post.meta[lang].description,
    date: post.date,
    slug: `daily/${post.date}`,
    lang,
  });
}

export function weeklyArticleJsonLd(post: WeeklyPost, lang: Lang): Record<string, unknown> {
  return articleJsonLdBase({
    headline: post.meta[lang].title,
    description: post.meta[lang].description,
    date: post.monday,
    slug: `weekly/${post.monday}`,
    lang,
  });
}

export function monthlyArticleJsonLd(post: MonthlyPost, lang: Lang): Record<string, unknown> {
  return articleJsonLdBase({
    headline: post.meta[lang].title,
    description: post.meta[lang].description,
    date: `${post.month}-01`,
    slug: `monthly/${post.month}`,
    lang,
  });
}

export function tuiyanArticleJsonLd(post: TuiyanPost, lang: Lang): Record<string, unknown> {
  return articleJsonLdBase({
    headline: post.meta[lang].title,
    description: post.meta[lang].description,
    date: post.firstDay,
    slug: `tuiyan/${post.firstDay}`,
    lang,
  });
}

/** 归档页 CollectionPage JSON-LD；name/slug 缺省时为 daily 归档（今日宜忌） */
export function collectionPageJsonLd(lang: Lang, name?: string, slug = "daily"): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: name ?? (lang === "zh" ? "今日宜忌" : "Daily Almanac"),
    url: absoluteUrl(pagePath(lang, slug)),
    inLanguage: HREFLANG_CODE[lang],
  };
}

export function faqJsonLd(page: PageEntry, lang: Lang): Record<string, unknown> | null {
  const items = page.faq?.[lang];
  if (!items || items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((qa) => ({
      "@type": "Question",
      name: qa.question,
      acceptedAnswer: { "@type": "Answer", text: qa.answer },
    })),
    url: absoluteUrl(pagePath(lang, page.slug)),
    inLanguage: HREFLANG_CODE[lang],
  };
}

export function buildJsonLdScripts(page: PageEntry, lang: Lang): string {
  const scripts: object[] = [pageJsonLd(page, lang), breadcrumbJsonLd(page, lang)];
  const faq = faqJsonLd(page, lang);
  if (faq) scripts.push(faq);
  if (page.slug === "") {
    scripts.unshift(websiteJsonLd());
  }
  return scripts.map(toJsonLdScript).join("\n    ");
}
