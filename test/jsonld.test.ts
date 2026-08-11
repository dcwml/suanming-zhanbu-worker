import { describe, expect, it } from "vitest";
import { SITE_ORIGIN } from "../src/config/site";
import type { PageEntry } from "../src/pages/registry";
import {
  articleJsonLd,
  buildJsonLdScripts,
  breadcrumbJsonLd,
  collectionPageJsonLd,
  faqJsonLd,
  pageJsonLd,
  toJsonLdScript,
  websiteJsonLd,
} from "../src/seo/jsonld";
import type { DailyPost } from "../src/pages/daily";

const dailyFixture: DailyPost = {
  date: "2026-08-03",
  meta: {
    zh: { title: "测试日宜忌", description: "描述" },
    en: { title: "Test Daily", description: "Desc" },
  },
  content: { zh: "<p>zh</p>", en: "<p>en</p>" },
};

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

const faqPage: PageEntry = {
  slug: "zeji",
  inNav: true,
  meta: {
    zh: { title: "择吉日", description: "择吉描述" },
    en: { title: "Auspicious Date Finder", description: "Zeji desc" },
  },
  content: { zh: "<p>zh</p>", en: "<p>en</p>" },
  faq: {
    zh: [{ question: "为什么要避冲？", answer: "冲日不宜办事。" }],
    en: [{ question: "Why avoid clashes?", answer: "Clash days are unsuitable." }],
  },
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
    expect(d.url).toBe(`${SITE_ORIGIN}/`);
  });
});

describe("pageJsonLd", () => {
  it("defaults to WebPage and uses registry type when set", () => {
    expect((pageJsonLd(home, "zh") as Record<string, unknown>)["@type"]).toBe("WebPage");
    expect((pageJsonLd(article, "en") as Record<string, unknown>)["@type"]).toBe("Article");
  });
  it("carries url and inLanguage", () => {
    const d = pageJsonLd(article, "zh") as Record<string, unknown>;
    expect(d.url).toBe(`${SITE_ORIGIN}/zh/sample/`);
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

describe("articleJsonLd", () => {
  it("emits Article type with date and author", () => {
    const d = articleJsonLd(dailyFixture, "zh") as Record<string, unknown>;
    expect(d["@type"]).toBe("Article");
    expect(d.headline).toBe("测试日宜忌");
    expect(d.datePublished).toBe("2026-08-03");
    expect(d.dateModified).toBe("2026-08-03");
    expect(d.author).toEqual({ "@type": "Organization", name: "玄命阁" });
    expect(d.url).toBe(`${SITE_ORIGIN}/zh/daily/2026-08-03/`);
  });

  it("uses en author name for en", () => {
    const d = articleJsonLd(dailyFixture, "en") as Record<string, unknown>;
    expect((d.author as { name: string }).name).toBe("Xuanming Pavilion");
  });
});

describe("collectionPageJsonLd", () => {
  it("emits CollectionPage pointing to archive url", () => {
    const d = collectionPageJsonLd("zh") as Record<string, unknown>;
    expect(d["@type"]).toBe("CollectionPage");
    expect(d.url).toBe(`${SITE_ORIGIN}/zh/daily/`);
    expect(d.name).toBe("今日宜忌");
  });
});

describe("faqJsonLd", () => {
  it("emits FAQPage with mainEntity Question/Answer", () => {
    const d = faqJsonLd(faqPage, "zh") as Record<string, unknown>;
    expect(d["@type"]).toBe("FAQPage");
    const me = d.mainEntity as { "@type": string; name: string; acceptedAnswer: { text: string } }[];
    expect(me).toHaveLength(1);
    expect(me[0]["@type"]).toBe("Question");
    expect(me[0].name).toBe("为什么要避冲？");
    expect(me[0].acceptedAnswer.text).toBe("冲日不宜办事。");
  });
  it("returns null when page has no faq", () => {
    expect(faqJsonLd(home, "zh")).toBeNull();
  });
  it("buildJsonLdScripts includes FAQPage only when faq present", () => {
    expect(buildJsonLdScripts(faqPage, "zh")).toContain('"FAQPage"');
    expect(buildJsonLdScripts(article, "zh")).not.toContain('"FAQPage"');
  });
  it("escapes </script> in faq text", () => {
    const evil: PageEntry = { ...faqPage, faq: { zh: [{ question: "</script>", answer: "x" }], en: [] } };
    expect(buildJsonLdScripts(evil, "zh")).not.toContain("</script><script>");
  });
});
