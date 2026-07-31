import { describe, expect, it } from "vitest";
import { buildRobotsTxt, buildSitemapXml } from "../src/seo/sitemap";

describe("buildSitemapXml", () => {
  const xml = buildSitemapXml();

  it("declares sitemap and xhtml namespaces", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  });

  it("lists every page in both languages", () => {
    expect(xml).toContain("<loc>https://example.com/zh/</loc>");
    expect(xml).toContain("<loc>https://example.com/en/</loc>");
    expect(xml).toContain("<loc>https://example.com/zh/sample/</loc>");
    expect(xml).toContain("<loc>https://example.com/en/sample/</loc>");
    expect(xml).toContain("<loc>https://example.com/zh/bazi/</loc>");
    expect(xml).toContain("<loc>https://example.com/en/bazi/</loc>");
  });

  it("adds xhtml:link alternates per url", () => {
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="zh-CN" href="https://example.com/zh/sample/"/>');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="en" href="https://example.com/en/sample/"/>');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="zh-CN" href="https://example.com/zh/"/>');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="en" href="https://example.com/en/"/>');
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
    expect(txt).toContain("Sitemap: https://example.com/sitemap.xml");
  });
});
