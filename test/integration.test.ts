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

  it("redirects /en/sample to /en/sample/", async () => {
    const res = await fetchNoFollow("/en/sample");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/en/sample/");
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

  it("renders en sample page", async () => {
    const res = await fetchNoFollow("/en/sample/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<html lang="en"');
    expect(html).toContain("How to Add a Page");
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
    const res = await fetchNoFollow("/zh/sample/extra/");
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
