import {
  HREFLANG_CODE,
  LANGS,
  absoluteUrl,
  pagePath,
} from "../config/site";
import { PAGES } from "../pages/registry";
import { DAILY_POSTS } from "../pages/daily";
import { WEEKLY_POSTS } from "../pages/weekly";
import { MONTHLY_POSTS } from "../pages/monthly";
import { TUIYAN_POSTS } from "../pages/tuiyan";

export function buildSitemapXml(): string {
  const pageUrls = PAGES.flatMap((page) =>
    LANGS.map((lang) => ({ lang, slug: page.slug })),
  );

  const dailyArchiveUrls = LANGS.map((lang) => ({ lang, slug: "daily" }));

  const dailyPostUrls = DAILY_POSTS.flatMap((post) =>
    LANGS.map((lang) => ({ lang, slug: `daily/${post.date}` })),
  );

  const weeklyArchiveUrls = LANGS.map((lang) => ({ lang, slug: "weekly" }));

  const weeklyPostUrls = WEEKLY_POSTS.flatMap((post) =>
    LANGS.map((lang) => ({ lang, slug: `weekly/${post.monday}` })),
  );

  const monthlyArchiveUrls = LANGS.map((lang) => ({ lang, slug: "monthly" }));

  const monthlyPostUrls = MONTHLY_POSTS.flatMap((post) =>
    LANGS.map((lang) => ({ lang, slug: `monthly/${post.month}` })),
  );

  const tuiyanArchiveUrls = LANGS.map((lang) => ({ lang, slug: "tuiyan" }));

  const tuiyanPostUrls = TUIYAN_POSTS.flatMap((post) =>
    LANGS.map((lang) => ({ lang, slug: `tuiyan/${post.firstDay}` })),
  );

  const allUrls = [
    ...pageUrls,
    ...dailyArchiveUrls,
    ...dailyPostUrls,
    ...weeklyArchiveUrls,
    ...weeklyPostUrls,
    ...monthlyArchiveUrls,
    ...monthlyPostUrls,
    ...tuiyanArchiveUrls,
    ...tuiyanPostUrls,
  ];

  const urls = allUrls
    .map(({ lang, slug }) => {
      const alternates = LANGS.map(
        (l) =>
          `    <xhtml:link rel="alternate" hreflang="${HREFLANG_CODE[l]}" href="${absoluteUrl(pagePath(l, slug))}"/>`,
      ).join("\n");
      return `  <url>\n    <loc>${absoluteUrl(pagePath(lang, slug))}</loc>\n${alternates}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

export function buildRobotsTxt(): string {
  return `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${absoluteUrl("/sitemap.xml")}
`;
}
