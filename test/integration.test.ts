import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { SITE_ORIGIN } from "../src/config/site";

function fetchNoFollow(path: string, init?: RequestInit): Promise<Response> {
  return SELF.fetch(`https://example.com${path}`, { redirect: "manual", ...init });
}

describe("redirects", () => {
  it("redirects / to /zh/", async () => {
    const res = await fetchNoFollow("/");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/zh/");
  });

  it("redirects /zh to /zh/ (trailing slash canonical)", async () => {
    const res = await fetchNoFollow("/zh");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/zh/");
  });
});

describe("pages", () => {
  it("renders zh home with full seo head", async () => {
    const res = await fetchNoFollow("/zh/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<html lang="zh-CN">');
    expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/zh/">`);
    expect(html).toContain('hreflang="x-default"');
    expect(html).toContain('application/ld+json');
  });

  it("zh home renders tool cards with CTA links", async () => {
    const res = await fetchNoFollow("/zh/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('class="tool-cta" href="/zh/bazi/"');
    expect(html).toContain('class="tool-cta" href="/zh/liuyao/"');
  });

  it("en home renders tool cards with CTA links", async () => {
    const res = await fetchNoFollow("/en/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('class="tool-cta" href="/en/bazi/"');
    expect(html).toContain('class="tool-cta" href="/en/liuyao/"');
  });

  it("zh home renders new template sections", async () => {
    const res = await fetchNoFollow("/zh/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("home-features");
    expect(html).toContain("home-steps");
    expect(html).toContain("home-testimonials");
    expect(html).toContain("home-cta-banner");
  });

  it("en home renders new template sections", async () => {
    const res = await fetchNoFollow("/en/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("home-features");
    expect(html).toContain("home-steps");
    expect(html).toContain("home-testimonials");
    expect(html).toContain("home-cta-banner");
  });

  it("serves sitemap.xml", async () => {
    const res = await fetchNoFollow("/sitemap.xml");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/xml");
    expect(await res.text()).toContain("<urlset");
  });

  it("serves robots.txt", async () => {
    const res = await fetchNoFollow("/robots.txt");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Sitemap:");
  });
});

describe("daily", () => {
  it("renders zh daily archive", async () => {
    const res = await fetchNoFollow("/zh/daily/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("今日宜忌");
  });

  it("renders en daily archive", async () => {
    const res = await fetchNoFollow("/en/daily/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Daily Almanac");
  });

  it("renders existing zh daily post", async () => {
    const res = await fetchNoFollow("/zh/daily/2026-08-03/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("daily-almanac");
    expect(html).toContain("daily-zodiac");
    expect(html).toContain("daily-story");
  });

  it("renders existing en daily post", async () => {
    const res = await fetchNoFollow("/en/daily/2026-08-03/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("daily-almanac");
  });

  it("redirects /zh/daily/2026-08-03 to trailing-slash", async () => {
    const res = await fetchNoFollow("/zh/daily/2026-08-03");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/zh/daily/2026-08-03/");
  });

  it("redirects /zh/daily to /zh/daily/", async () => {
    const res = await fetchNoFollow("/zh/daily");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/zh/daily/");
  });

  it("returns 404 for non-existent daily date", async () => {
    const res = await fetchNoFollow("/zh/daily/2099-01-01/");
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("页面未找到");
  });

  it("returns 404 for invalid date format", async () => {
    const res = await fetchNoFollow("/zh/daily/not-a-date/");
    expect(res.status).toBe(404);
  });
});

describe("404 handling", () => {
  it("unknown page returns HTML 404 with noindex", async () => {
    const res = await fetchNoFollow("/zh/nope/");
    expect(res.status).toBe(404);
    const html = await res.text();
    expect(html).toContain("页面未找到");
    expect(html).toContain('content="noindex"');
  });

  it("unknown root path returns 404 in default language", async () => {
    const res = await fetchNoFollow("/whatever/");
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("页面未找到");
  });

  it("deep path beyond /:lang/:slug/ returns 404", async () => {
    const res = await fetchNoFollow("/zh/bazi/extra/");
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("页面未找到");
  });

  it("unknown /api path returns JSON 404", async () => {
    const res = await fetchNoFollow("/api/nope");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
  });
});

describe("api via worker", () => {
  it("echo works through the full stack", async () => {
    const res = await SELF.fetch("https://example.com/api/echo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a: 1 }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { echo: { a: 1 } } });
  });
});

describe("bazi page", () => {
  it("serves /zh/bazi/ with form and scripts", async () => {
    const res = await SELF.fetch("http://localhost/zh/bazi/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('id="bazi-form"');
    expect(html).toContain("lunar.min.js");
    expect(html).toContain("/assets/bazi.js");
  });

  it("serves /en/bazi/ in English", async () => {
    const res = await SELF.fetch("http://localhost/en/bazi/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('data-lang="en"');
  });

  it("full-stack: invalid interpret request gets JSON 400", async () => {
    const res = await SELF.fetch("http://localhost/api/bazi/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ part: "nope" }),
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(false);
  });
});

describe("liuyao page", () => {
  it("serves /zh/liuyao/ with form skeleton and scripts", async () => {
    const res = await SELF.fetch("http://localhost/zh/liuyao/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('id="liuyao-app"');
    expect(html).toContain("/assets/liuyao.js");
  });

  it("serves /en/liuyao/ in English", async () => {
    const res = await SELF.fetch("http://localhost/en/liuyao/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('data-lang="en"');
  });
});

describe("zeji page", () => {
  it("/zh/zeji/ returns zeji page with FAQPage JSON-LD", async () => {
    const res = await SELF.fetch("http://localhost/zh/zeji/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('"FAQPage"');
    expect(html).toContain('id="zeji-matter"');
  });

  it("serves /en/zeji/ in English with tool skeleton", async () => {
    const res = await SELF.fetch("http://localhost/en/zeji/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('id="zeji-matter"');
    expect(html).toContain('id="zeji-results"');
    expect(html).toContain("/assets/zeji.js");
  });
});
