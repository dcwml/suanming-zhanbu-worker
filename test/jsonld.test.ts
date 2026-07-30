import { describe, expect, it } from "vitest";
import type { PageEntry } from "../src/pages/registry";
import {
  buildJsonLdScripts,
  breadcrumbJsonLd,
  pageJsonLd,
  toJsonLdScript,
  websiteJsonLd,
} from "../src/seo/jsonld";

const home: PageEntry = {
  slug: "",
  inNav: true,
  meta: {
    zh: { title: "首页", description: "首页描述" },
    en: { title: "Home", description: "Home description" },
  },
  content: { zh: "<p>zh</p>", en: "<p>en</p>" },
};

const article: PageEntry = {
  slug: "sample",
  inNav: true,
  jsonldType: "Article",
  meta: {
    zh: { title: "示例文章", description: "文章描述" },
    en: { title: "Sample", description: "Article description" },
  },
  content: { zh: "<p>zh</p>", en: "<p>en</p>" },
};

describe("toJsonLdScript", () => {
  it("neutralizes </script> injection", () => {
    const s = toJsonLdScript({ evil: "</script><script>alert(1)</script>" });
    expect(s.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(s).not.toContain("</script><script>");
    expect(s).toContain("\\u003c");
  });
});

describe("websiteJsonLd", () => {
  it("describes the site", () => {
    const d = websiteJsonLd() as Record<string, unknown>;
    expect(d["@type"]).toBe("WebSite");
    expect(d.url).toBe("https://example.com/");
  });
});

describe("pageJsonLd", () => {
  it("defaults to WebPage and uses registry type when set", () => {
    expect((pageJsonLd(home, "zh") as Record<string, unknown>)["@type"]).toBe("WebPage");
    expect((pageJsonLd(article, "en") as Record<string, unknown>)["@type"]).toBe("Article");
  });
  it("carries url and inLanguage", () => {
    const d = pageJsonLd(article, "zh") as Record<string, unknown>;
    expect(d.url).toBe("https://example.com/zh/sample/");
    expect(d.inLanguage).toBe("zh-CN");
  });
});

describe("breadcrumbJsonLd", () => {
  it("home has one crumb, content page has two", () => {
    const homeItems = (breadcrumbJsonLd(home, "zh") as { itemListElement: { position: number }[] }).itemListElement;
    const articleItems = (breadcrumbJsonLd(article, "en") as { itemListElement: { position: number }[] }).itemListElement;
    expect(homeItems).toHaveLength(1);
    expect(articleItems).toHaveLength(2);
    expect(homeItems[0].position).toBe(1);
    expect(articleItems[0].position).toBe(1);
    expect(articleItems[1].position).toBe(2);
  });
});

describe("buildJsonLdScripts", () => {
  it("home includes WebSite script", () => {
    expect(buildJsonLdScripts(home, "zh")).toContain('"WebSite"');
  });
  it("non-home excludes WebSite script", () => {
    expect(buildJsonLdScripts(article, "zh")).not.toContain('"WebSite"');
  });
});
