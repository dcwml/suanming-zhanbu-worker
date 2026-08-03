import {
  HREFLANG_CODE,
  LANGS,
  absoluteUrl,
  pagePath,
} from "../config/site";
import { PAGES } from "../pages/registry";
import { DAILY_POSTS } from "../pages/daily";

export function buildSitemapXml(): string {
  const pageUrls = PAGES.flatMap((page) =>
    LANGS.map((lang) => ({ lang, slug: page.slug })),
  );

  const dailyArchiveUrls = LANGS.map((lang) => ({ lang, slug: "daily" }));

  const dailyPostUrls = DAILY_POSTS.flatMap((post) =>
    LANGS.map((lang) => ({ lang, slug: `daily/${post.date}` })),
  );

  const allUrls = [...pageUrls, ...dailyArchiveUrls, ...dailyPostUrls];

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
