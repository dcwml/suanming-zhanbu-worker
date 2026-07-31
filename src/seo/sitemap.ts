import {
  HREFLANG_CODE,
  LANGS,
  absoluteUrl,
  pagePath,
} from "../config/site";
import { PAGES } from "../pages/registry";

export function buildSitemapXml(): string {
  const urls = PAGES.flatMap((page) =>
    LANGS.map((lang) => {
      const alternates = LANGS.map(
        (l) =>
          `    <xhtml:link rel="alternate" hreflang="${HREFLANG_CODE[l]}" href="${absoluteUrl(pagePath(l, page.slug))}"/>`,
      ).join("\n");
      return `  <url>\n    <loc>${absoluteUrl(pagePath(lang, page.slug))}</loc>\n${alternates}\n  </url>`;
    }),
  ).join("\n");

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
