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

describe("weekly", () => {
  it("renders zh weekly archive", async () => {
    const res = await fetchNoFollow("/zh/weekly/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("每周运势");
    expect(html).toContain('href="/zh/weekly/2026-08-17/"');
  });

  it("renders en weekly archive", async () => {
    const res = await fetchNoFollow("/en/weekly/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Weekly Horoscope");
  });

  it("renders existing zh weekly post", async () => {
    const res = await fetchNoFollow("/zh/weekly/2026-08-17/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("weekly-summary");
    expect(html).toContain("weekly-zodiacs");
    expect(html).toContain("weekly-days");
    expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/zh/weekly/2026-08-17/">`);
  });

  it("renders existing en weekly post", async () => {
    const res = await fetchNoFollow("/en/weekly/2026-08-17/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("weekly-summary");
    expect(html).toContain('hreflang="zh-CN"');
  });

  it("redirects /zh/weekly/2026-08-17 to trailing-slash", async () => {
    const res = await fetchNoFollow("/zh/weekly/2026-08-17");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/zh/weekly/2026-08-17/");
  });

  it("redirects /zh/weekly to /zh/weekly/", async () => {
    const res = await fetchNoFollow("/zh/weekly");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/zh/weekly/");
  });

  it("returns 404 for non-existent week", async () => {
    const res = await fetchNoFollow("/zh/weekly/2099-01-04/");
    expect(res.status).toBe(404);
  });

  it("returns 404 for invalid monday format", async () => {
    const res = await fetchNoFollow("/zh/weekly/not-a-date/");
    expect(res.status).toBe(404);
  });
});

describe("monthly", () => {
  it("renders zh monthly archive", async () => {
    const res = await fetchNoFollow("/zh/monthly/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("每月运势");
    expect(html).toContain('href="/zh/monthly/2026-08/"');
  });

  it("renders en monthly archive", async () => {
    const res = await fetchNoFollow("/en/monthly/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Monthly Horoscope");
  });

  it("renders existing zh monthly post", async () => {
    const res = await fetchNoFollow("/zh/monthly/2026-08/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("monthly-summary");
    expect(html).toContain("monthly-zodiacs");
    expect(html).toContain("monthly-lucky");
    expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/zh/monthly/2026-08/">`);
  });

  it("renders existing en monthly post", async () => {
    const res = await fetchNoFollow("/en/monthly/2026-08/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("monthly-summary");
    expect(html).toContain('hreflang="en"');
  });

  it("redirects /zh/monthly/2026-08 to trailing-slash", async () => {
    const res = await fetchNoFollow("/zh/monthly/2026-08");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/zh/monthly/2026-08/");
  });

  it("redirects /zh/monthly to /zh/monthly/", async () => {
    const res = await fetchNoFollow("/zh/monthly");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/zh/monthly/");
  });

  it("returns 404 for non-existent month", async () => {
    const res = await fetchNoFollow("/zh/monthly/2099-01/");
    expect(res.status).toBe(404);
  });

  it("returns 404 for invalid month format", async () => {
    const res = await fetchNoFollow("/zh/monthly/not-a-month/");
    expect(res.status).toBe(404);
  });
});

describe("fortune nav dropdown", () => {
  it("zh page renders the 运势 dropdown with three fortune links", async () => {
    const res = await fetchNoFollow("/zh/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('class="nav-dropdown"');
    expect(html).toContain("nav-dropdown-toggle");
    expect(html).toContain('href="/zh/daily/"');
    expect(html).toContain('href="/zh/weekly/"');
    expect(html).toContain('href="/zh/monthly/"');
  });

  it("weekly page marks its archive link active and toggle active", async () => {
    const res = await fetchNoFollow("/zh/weekly/2026-08-17/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('nav-dropdown-toggle active');
    expect(html).toContain('href="/zh/weekly/" class="active" aria-current="page"');
  });

  it("footer carries a fortune column with three archives", async () => {
    const res = await fetchNoFollow("/zh/");
    const html = await res.text();
    expect(html).toContain('aria-label="运势"');
    expect(html).toContain('class="lang-switch" href="/en/"');
  });
});

describe("divination nav dropdown", () => {
  const count = (html: string, needle: string): number => html.split(needle).length - 1;

  it("zh home renders the 占卜 dropdown with liuyao, meihua and xiaoliuren links", async () => {
    const res = await fetchNoFollow("/zh/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(">占卜<span");
    expect(html).toContain('href="/zh/liuyao/"');
    expect(html).toContain('href="/zh/meihua/"');
    expect(html).toContain('href="/zh/xiaoliuren/"');
  });

  it("liuyao, meihua and xiaoliuren appear only inside the dropdown within the nav region", async () => {
    const res = await fetchNoFollow("/zh/");
    const html = await res.text();
    const navRegion = html.slice(html.indexOf('<div class="nav-links">'), html.indexOf('class="lang-switch"'));
    expect(count(navRegion, 'href="/zh/liuyao/"')).toBe(1);
    expect(count(navRegion, 'href="/zh/meihua/"')).toBe(1);
    expect(count(navRegion, 'href="/zh/xiaoliuren/"')).toBe(1);
  });

  it("divination dropdown sits between bazi and zeji in nav order", async () => {
    const res = await fetchNoFollow("/zh/");
    const html = await res.text();
    const bazi = html.indexOf('href="/zh/bazi/"');
    const divination = html.indexOf(">占卜<span");
    const zeji = html.indexOf('href="/zh/zeji/"');
    expect(bazi).toBeGreaterThan(-1);
    expect(divination).toBeGreaterThan(bazi);
    expect(zeji).toBeGreaterThan(divination);
  });

  it("liuyao page marks its dropdown link and toggle active", async () => {
    const res = await fetchNoFollow("/zh/liuyao/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('nav-dropdown-toggle active');
    expect(html).toContain('href="/zh/liuyao/" class="active" aria-current="page"');
  });

  it("meihua page marks its dropdown link and toggle active", async () => {
    const res = await fetchNoFollow("/zh/meihua/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('nav-dropdown-toggle active');
    expect(html).toContain('href="/zh/meihua/" class="active" aria-current="page"');
  });

  it("xiaoliuren page marks its dropdown link and toggle active", async () => {
    const res = await fetchNoFollow("/zh/xiaoliuren/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('nav-dropdown-toggle active');
    expect(html).toContain('href="/zh/xiaoliuren/" class="active" aria-current="page"');
  });

  it("en home renders the Divination dropdown with all three tool links", async () => {
    const res = await fetchNoFollow("/en/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(">Divination<span");
    expect(html).toContain('href="/en/liuyao/"');
    expect(html).toContain('href="/en/meihua/"');
    expect(html).toContain('href="/en/xiaoliuren/"');
  });

  it("footer tools column carries the meihua and xiaoliuren links", async () => {
    const res = await fetchNoFollow("/zh/");
    const html = await res.text();
    expect(html).toContain('aria-label="工具"');
    expect(html).toContain('href="/zh/meihua/"');
    expect(html).toContain('href="/zh/xiaoliuren/"');
  });

  it("zh home divination toggle is a link to the overview page", async () => {
    const res = await fetchNoFollow("/zh/");
    const html = await res.text();
    expect(html).toContain('class="nav-dropdown-toggle" href="/zh/divination/"');
  });

  it("en home divination toggle links to the en overview page", async () => {
    const res = await fetchNoFollow("/en/");
    const html = await res.text();
    expect(html).toContain('class="nav-dropdown-toggle" href="/en/divination/"');
  });
});

describe("divination overview page", () => {
  it("serves /zh/divination/ with intro and CTA links of all three tools", async () => {
    const res = await fetchNoFollow("/zh/divination/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<h1>占卜工具</h1>");
    expect(html).toContain('class="tool-cta" href="/zh/liuyao/"');
    expect(html).toContain('class="tool-cta" href="/zh/meihua/"');
    expect(html).toContain('class="tool-cta" href="/zh/xiaoliuren/"');
  });

  it("zh overview page injects FAQPage JSON-LD and canonical", async () => {
    const res = await fetchNoFollow("/zh/divination/");
    const html = await res.text();
    expect(html).toContain('"FAQPage"');
    expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/zh/divination/">`);
  });

  it("serves /en/divination/ in English", async () => {
    const res = await fetchNoFollow("/en/divination/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<h1>Divination Tools</h1>");
    expect(html).toContain('class="tool-cta" href="/en/liuyao/"');
    expect(html).toContain('class="tool-cta" href="/en/meihua/"');
    expect(html).toContain('class="tool-cta" href="/en/xiaoliuren/"');
  });

  it("redirects /zh/divination to trailing-slash", async () => {
    const res = await fetchNoFollow("/zh/divination");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/zh/divination/");
  });

  it("overview page marks the nav toggle active and switches language", async () => {
    const res = await fetchNoFollow("/zh/divination/");
    const html = await res.text();
    expect(html).toContain('class="nav-dropdown-toggle active" href="/zh/divination/" aria-current="page"');
    expect(html).toContain('class="lang-switch" href="/en/divination/"');
  });
});

describe("chouqian nav dropdown", () => {
  const count = (html: string, needle: string): number => html.split(needle).length - 1;

  it("zh home renders the 抽签 dropdown with huangdaxian, guanyin and yuelao links", async () => {
    const res = await fetchNoFollow("/zh/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(">抽签<span");
    expect(html).toContain('href="/zh/huangdaxian/"');
    expect(html).toContain('href="/zh/guanyin/"');
    expect(html).toContain('href="/zh/yuelao/"');
  });

  it("huangdaxian, guanyin and yuelao appear only inside the dropdown within the nav region", async () => {
    const res = await fetchNoFollow("/zh/");
    const html = await res.text();
    const navRegion = html.slice(html.indexOf('<div class="nav-links">'), html.indexOf('class="lang-switch"'));
    expect(count(navRegion, 'href="/zh/huangdaxian/"')).toBe(1);
    expect(count(navRegion, 'href="/zh/guanyin/"')).toBe(1);
    expect(count(navRegion, 'href="/zh/yuelao/"')).toBe(1);
  });

  it("chouqian dropdown sits between zeji and fortune in nav order", async () => {
    const res = await fetchNoFollow("/zh/");
    const html = await res.text();
    const zeji = html.indexOf('href="/zh/zeji/"');
    const chouqian = html.indexOf(">抽签<span");
    const fortune = html.indexOf(">运势<span");
    expect(zeji).toBeGreaterThan(-1);
    expect(chouqian).toBeGreaterThan(zeji);
    expect(fortune).toBeGreaterThan(chouqian);
  });

  it("huangdaxian page marks its dropdown link and toggle active", async () => {
    const res = await fetchNoFollow("/zh/huangdaxian/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('nav-dropdown-toggle active');
    expect(html).toContain('href="/zh/huangdaxian/" class="active" aria-current="page"');
  });

  it("guanyin page marks its dropdown link and toggle active", async () => {
    const res = await fetchNoFollow("/zh/guanyin/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('nav-dropdown-toggle active');
    expect(html).toContain('href="/zh/guanyin/" class="active" aria-current="page"');
  });

  it("yuelao page marks its dropdown link and toggle active", async () => {
    const res = await fetchNoFollow("/zh/yuelao/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('nav-dropdown-toggle active');
    expect(html).toContain('href="/zh/yuelao/" class="active" aria-current="page"');
  });

  it("zh home chouqian toggle is a link to the overview page", async () => {
    const res = await fetchNoFollow("/zh/");
    const html = await res.text();
    expect(html).toContain('class="nav-dropdown-toggle" href="/zh/chouqian/"');
  });

  it("en home renders the Fortune Sticks dropdown with all three tool links", async () => {
    const res = await fetchNoFollow("/en/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(">Fortune Sticks<span");
    expect(html).toContain('href="/en/huangdaxian/"');
    expect(html).toContain('href="/en/guanyin/"');
    expect(html).toContain('href="/en/yuelao/"');
  });

  it("footer tools column carries the huangdaxian, guanyin and yuelao links", async () => {
    const res = await fetchNoFollow("/zh/");
    const html = await res.text();
    expect(html).toContain('aria-label="工具"');
    expect(html).toContain('href="/zh/huangdaxian/"');
    expect(html).toContain('href="/zh/guanyin/"');
    expect(html).toContain('href="/zh/yuelao/"');
  });
});

describe("chouqian overview page", () => {
  it("serves /zh/chouqian/ with intro and CTA links of all three tools", async () => {
    const res = await fetchNoFollow("/zh/chouqian/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<h1>灵签抽签</h1>");
    expect(html).toContain('class="tool-cta" href="/zh/huangdaxian/"');
    expect(html).toContain('class="tool-cta" href="/zh/guanyin/"');
    expect(html).toContain('class="tool-cta" href="/zh/yuelao/"');
  });

  it("zh overview page injects FAQPage JSON-LD and canonical", async () => {
    const res = await fetchNoFollow("/zh/chouqian/");
    const html = await res.text();
    expect(html).toContain('"FAQPage"');
    expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/zh/chouqian/">`);
  });

  it("serves /en/chouqian/ in English", async () => {
    const res = await fetchNoFollow("/en/chouqian/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<h1>Fortune Sticks Guide</h1>");
    expect(html).toContain('class="tool-cta" href="/en/huangdaxian/"');
    expect(html).toContain('class="tool-cta" href="/en/guanyin/"');
    expect(html).toContain('class="tool-cta" href="/en/yuelao/"');
  });

  it("redirects /zh/chouqian to trailing-slash", async () => {
    const res = await fetchNoFollow("/zh/chouqian");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/zh/chouqian/");
  });

  it("overview page marks the nav toggle active and switches language", async () => {
    const res = await fetchNoFollow("/zh/chouqian/");
    const html = await res.text();
    expect(html).toContain('class="nav-dropdown-toggle active" href="/zh/chouqian/" aria-current="page"');
    expect(html).toContain('class="lang-switch" href="/en/chouqian/"');
  });
});

describe("qian tool pages", () => {
  it("serves /zh/huangdaxian/ with app skeleton, data script and shared script", async () => {
    const res = await fetchNoFollow("/zh/huangdaxian/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<h1>黄大仙灵签</h1>");
    expect(html).toContain('id="chouqian-app"');
    expect(html).toContain('data-qian="huangdaxian"');
    expect(html).toContain('data-lang="zh"');
    expect(html).toContain("/assets/qian/huangdaxian.zh.js");
    expect(html).toContain("/assets/qian/chouqian.js");
    expect(html).toContain('"FAQPage"');
  });

  it("serves /en/huangdaxian/ in English with the en data file", async () => {
    const res = await fetchNoFollow("/en/huangdaxian/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<h1>Wong Tai Sin Oracle Sticks</h1>");
    expect(html).toContain('data-lang="en"');
    expect(html).toContain("/assets/qian/huangdaxian.en.js");
    expect(html).toContain('class="lang-switch" href="/zh/huangdaxian/"');
  });

  it("serves /zh/guanyin/ and /en/guanyin/ with the guanyin data files", async () => {
    const zh = await fetchNoFollow("/zh/guanyin/");
    expect(zh.status).toBe(200);
    const zhHtml = await zh.text();
    expect(zhHtml).toContain("<h1>观音灵签</h1>");
    expect(zhHtml).toContain('data-qian="guanyin"');
    expect(zhHtml).toContain("/assets/qian/guanyin.zh.js");

    const en = await fetchNoFollow("/en/guanyin/");
    expect(en.status).toBe(200);
    const enHtml = await en.text();
    expect(enHtml).toContain("<h1>Guanyin Oracle Sticks</h1>");
    expect(enHtml).toContain("/assets/qian/guanyin.en.js");
  });

  it("serves /zh/yuelao/ and /en/yuelao/ with the yuelao data files", async () => {
    const zh = await fetchNoFollow("/zh/yuelao/");
    expect(zh.status).toBe(200);
    const zhHtml = await zh.text();
    expect(zhHtml).toContain("<h1>月老灵签</h1>");
    expect(zhHtml).toContain('data-qian="yuelao"');
    expect(zhHtml).toContain("/assets/qian/yuelao.zh.js");

    const en = await fetchNoFollow("/en/yuelao/");
    expect(en.status).toBe(200);
    const enHtml = await en.text();
    expect(enHtml).toContain("<h1>Yue Lao Oracle Sticks</h1>");
    expect(enHtml).toContain("/assets/qian/yuelao.en.js");
  });

  it("redirects /zh/guanyin to trailing-slash", async () => {
    const res = await fetchNoFollow("/zh/guanyin");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/zh/guanyin/");
  });

  it("serves the qian data files and shared script from assets", async () => {
    for (const path of [
      "/assets/qian/huangdaxian.zh.js",
      "/assets/qian/huangdaxian.en.js",
      "/assets/qian/guanyin.zh.js",
      "/assets/qian/guanyin.en.js",
      "/assets/qian/yuelao.zh.js",
      "/assets/qian/yuelao.en.js",
      "/assets/qian/chouqian.js",
    ]) {
      const res = await fetchNoFollow(path);
      expect(res.status, path).toBe(200);
    }
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

describe("meihua page", () => {
  it("serves /zh/meihua/ with form skeleton and scripts", async () => {
    const res = await SELF.fetch("http://localhost/zh/meihua/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('id="meihua-app"');
    expect(html).toContain("/assets/meihua.js");
    expect(html).toContain("lunar.min.js");
  });

  it("serves /en/meihua/ in English", async () => {
    const res = await SELF.fetch("http://localhost/en/meihua/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('data-lang="en"');
  });

  it("full-stack: invalid interpret request gets JSON 400", async () => {
    const res = await SELF.fetch("http://localhost/api/meihua/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ part: "nope" }),
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(false);
  });
});

describe("xiaoliuren page", () => {
  it("serves /zh/xiaoliuren/ with form skeleton and scripts", async () => {
    const res = await SELF.fetch("http://localhost/zh/xiaoliuren/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('id="xiaoliuren-app"');
    expect(html).toContain("/assets/xiaoliuren.js");
    expect(html).toContain("lunar.min.js");
  });

  it("serves /en/xiaoliuren/ in English", async () => {
    const res = await SELF.fetch("http://localhost/en/xiaoliuren/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('data-lang="en"');
  });

  it("full-stack: invalid interpret request gets JSON 400", async () => {
    const res = await SELF.fetch("http://localhost/api/xiaoliuren/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ part: "nope" }),
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(false);
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

describe("hehun page", () => {
  it("serves /zh/hehun/ with form skeleton, FAQPage JSON-LD and scripts", async () => {
    const res = await SELF.fetch("http://localhost/zh/hehun/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('id="hehun-app"');
    expect(html).toContain('id="hehun-m-year"');
    expect(html).toContain('id="hehun-f-year"');
    expect(html).toContain("/assets/hehun.js");
    expect(html).toContain('"FAQPage"');
  });

  it("serves /en/hehun/ in English", async () => {
    const res = await SELF.fetch("http://localhost/en/hehun/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('data-lang="en"');
  });

  it("full-stack: invalid interpret request gets JSON 400", async () => {
    const res = await SELF.fetch("http://localhost/api/hehun/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang: "zh" }),
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(false);
  });
});

describe("mingli overview page", () => {
  it("serves /zh/mingli/ with intro and CTA links of all three tools", async () => {
    const res = await fetchNoFollow("/zh/mingli/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<h1>命理工具</h1>");
    expect(html).toContain('class="tool-cta" href="/zh/bazi/"');
    expect(html).toContain('class="tool-cta" href="/zh/ziwei/"');
    expect(html).toContain('class="tool-cta" href="/zh/hehun/"');
  });

  it("zh overview page injects FAQPage JSON-LD and canonical", async () => {
    const res = await fetchNoFollow("/zh/mingli/");
    const html = await res.text();
    expect(html).toContain('"FAQPage"');
    expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/zh/mingli/">`);
  });

  it("serves /en/mingli/ in English", async () => {
    const res = await fetchNoFollow("/en/mingli/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<h1>Destiny Tools</h1>");
    expect(html).toContain('class="tool-cta" href="/en/hehun/"');
  });

  it("redirects /zh/mingli to trailing-slash", async () => {
    const res = await fetchNoFollow("/zh/mingli");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/zh/mingli/");
  });
});

describe("mingli nav dropdown", () => {
  const count = (html: string, needle: string): number => html.split(needle).length - 1;

  it("zh home renders the 命理 dropdown as a link to the overview with bazi, ziwei and hehun links", async () => {
    const res = await fetchNoFollow("/zh/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('class="nav-dropdown-toggle" href="/zh/mingli/"');
    expect(html).toContain('href="/zh/bazi/"');
    expect(html).toContain('href="/zh/ziwei/"');
    expect(html).toContain('href="/zh/hehun/"');
  });

  it("bazi appears only once in the nav region (inside the dropdown)", async () => {
    const res = await fetchNoFollow("/zh/");
    const html = await res.text();
    const navRegion = html.slice(html.indexOf('<div class="nav-links">'), html.indexOf('class="lang-switch"'));
    expect(count(navRegion, 'href="/zh/bazi/"')).toBe(1);
  });

  it("mingli dropdown sits between home and divination in nav order", async () => {
    const res = await fetchNoFollow("/zh/");
    const html = await res.text();
    const mingli = html.indexOf(">命理<span");
    const divination = html.indexOf(">占卜<span");
    expect(mingli).toBeGreaterThan(-1);
    expect(divination).toBeGreaterThan(mingli);
  });

  it("bazi page marks its dropdown link and toggle active", async () => {
    const res = await fetchNoFollow("/zh/bazi/");
    const html = await res.text();
    expect(html).toContain("nav-dropdown-toggle active");
    expect(html).toContain('href="/zh/bazi/" class="active" aria-current="page"');
  });

  it("ziwei page marks its dropdown link and toggle active", async () => {
    const res = await fetchNoFollow("/zh/ziwei/");
    const html = await res.text();
    expect(html).toContain("nav-dropdown-toggle active");
    expect(html).toContain('href="/zh/ziwei/" class="active" aria-current="page"');
  });

  it("hehun page marks its dropdown link and toggle active", async () => {
    const res = await fetchNoFollow("/zh/hehun/");
    const html = await res.text();
    expect(html).toContain("nav-dropdown-toggle active");
    expect(html).toContain('href="/zh/hehun/" class="active" aria-current="page"');
  });

  it("mingli overview page marks the nav toggle active and switches language", async () => {
    const res = await fetchNoFollow("/zh/mingli/");
    const html = await res.text();
    expect(html).toContain('class="nav-dropdown-toggle active" href="/zh/mingli/" aria-current="page"');
    expect(html).toContain('class="lang-switch" href="/en/mingli/"');
  });

  it("en home renders the Destiny dropdown with all three tool links", async () => {
    const res = await fetchNoFollow("/en/");
    const html = await res.text();
    expect(html).toContain(">Destiny<span");
    expect(html).toContain('class="nav-dropdown-toggle" href="/en/mingli/"');
    expect(html).toContain('href="/en/bazi/"');
    expect(html).toContain('href="/en/ziwei/"');
    expect(html).toContain('href="/en/hehun/"');
  });

  it("footer tools column carries the ziwei and hehun links", async () => {
    const res = await fetchNoFollow("/zh/");
    const html = await res.text();
    expect(html).toContain('aria-label="工具"');
    expect(html).toContain('href="/zh/ziwei/"');
    expect(html).toContain('href="/zh/hehun/"');
  });
});

describe("ziwei page", () => {
  it("serves /zh/ziwei/ with form skeleton, FAQPage JSON-LD and scripts", async () => {
    const res = await SELF.fetch("http://localhost/zh/ziwei/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('id="ziwei-app"');
    expect(html).toContain("/assets/ziwei.js");
    expect(html).toContain('"FAQPage"');
  });

  it("serves /en/ziwei/ in English", async () => {
    const res = await SELF.fetch("http://localhost/en/ziwei/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('data-lang="en"');
  });

  it("full-stack: invalid interpret request gets JSON 400", async () => {
    const res = await SELF.fetch("http://localhost/api/ziwei/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ part: "nope" }),
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(false);
  });

  it("serves the local iztro vendor fallback file", async () => {
    const res = await SELF.fetch("http://localhost/assets/vendor/iztro.min.js");
    expect(res.status).toBe(200);
  });
});
