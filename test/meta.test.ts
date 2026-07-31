import { describe, expect, it } from "vitest";
import { SITE_ORIGIN } from "../src/config/site";
import type { PageEntry } from "../src/pages/registry";
import { buildHead, buildPlainHead, escapeHtml } from "../src/seo/meta";

const fixture: PageEntry = {
  slug: "sample",
  inNav: true,
  meta: {
    zh: { title: '测试页 <"&>', description: "描述" },
    en: { title: "Test Page", description: "Description" },
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

describe("escapeHtml", () => {
  it("escapes the five special characters", () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
  });
});

describe("buildHead", () => {
  const head = buildHead(fixture, "zh");

  it("emits title with site suffix and escaping", () => {
    expect(head).toContain("<title>测试页 &lt;&quot;&amp;&gt; - 玄命阁</title>");
  });
  it("emits description", () => {
    expect(head).toContain('<meta name="description" content="描述">');
  });
  it("emits canonical", () => {
    expect(head).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/zh/sample/">`);
  });
  it("emits hreflang zh-CN, en and x-default pointing to zh", () => {
    expect(head).toContain(`hreflang="zh-CN" href="${SITE_ORIGIN}/zh/sample/"`);
    expect(head).toContain(`hreflang="en" href="${SITE_ORIGIN}/en/sample/"`);
    expect(head).toContain(`hreflang="x-default" href="${SITE_ORIGIN}/zh/sample/"`);
  });
  it("emits og tags", () => {
    expect(head).toContain('<meta property="og:type" content="article">');
    expect(head).toContain(`<meta property="og:url" content="${SITE_ORIGIN}/zh/sample/">`);
    expect(head).toContain(`<meta property="og:image" content="${SITE_ORIGIN}/assets/og-default.png">`);
    expect(head).toContain('<meta property="og:locale" content="zh_CN">');
    expect(head).toContain('<meta property="og:locale:alternate" content="en_US">');
  });
  it("emits twitter tags", () => {
    expect(head).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(head).toContain('<meta name="twitter:image"');
  });
  it("embeds json-ld", () => {
    expect(head).toContain('application/ld+json');
  });
  it("home uses website og:type and slogan title", () => {
    const homeHead = buildHead(home, "zh");
    expect(homeHead).toContain('<meta property="og:type" content="website">');
    expect(homeHead).toContain("玄命阁 - 命理 · 占卜 · 传统文化");
  });
});

describe("buildPlainHead", () => {
  it("is noindex and carries given title", () => {
    const head = buildPlainHead("en", "Page Not Found");
    expect(head).toContain('<meta name="robots" content="noindex">');
    expect(head).toContain("<title>Page Not Found</title>");
    expect(head).not.toContain("canonical");
  });
});
