import { describe, expect, it } from "vitest";
import { SITE_ORIGIN } from "../src/config/site";
import { buildRobotsTxt, buildSitemapXml } from "../src/seo/sitemap";

describe("buildSitemapXml", () => {
  const xml = buildSitemapXml();

  it("declares sitemap and xhtml namespaces", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  });

  it("lists every page in both languages", () => {
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/zh/</loc>`);
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/en/</loc>`);
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/zh/sample/</loc>`);
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/en/sample/</loc>`);
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/zh/bazi/</loc>`);
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/en/bazi/</loc>`);
  });

  it("adds xhtml:link alternates per url", () => {
    expect(xml).toContain(`<xhtml:link rel="alternate" hreflang="zh-CN" href="${SITE_ORIGIN}/zh/sample/"/>`);
    expect(xml).toContain(`<xhtml:link rel="alternate" hreflang="en" href="${SITE_ORIGIN}/en/sample/"/>`);
    expect(xml).toContain(`<xhtml:link rel="alternate" hreflang="zh-CN" href="${SITE_ORIGIN}/zh/"/>`);
    expect(xml).toContain(`<xhtml:link rel="alternate" hreflang="en" href="${SITE_ORIGIN}/en/"/>`);
  });

  it("does not list the 404 page", () => {
    expect(xml).not.toContain("404");
  });
});

describe("buildRobotsTxt", () => {
  it("allows crawling, blocks /api/ and points to sitemap", () => {
    const txt = buildRobotsTxt();
    expect(txt).toContain("User-agent: *");
    expect(txt).toContain("Disallow: /api/");
    expect(txt).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
  });
});
