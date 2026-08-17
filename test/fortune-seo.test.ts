import { describe, expect, it } from "vitest";
import { SITE_ORIGIN } from "../src/config/site";
import {
  buildMonthlyArchiveHead,
  buildMonthlyPostHead,
  buildWeeklyArchiveHead,
  buildWeeklyPostHead,
} from "../src/seo/meta";
import { findWeeklyPost } from "../src/pages/weekly";
import { findMonthlyPost } from "../src/pages/monthly";
import { monthlyArticleJsonLd, weeklyArticleJsonLd } from "../src/seo/jsonld";

describe("buildWeeklyPostHead", () => {
  const post = findWeeklyPost("2026-08-17")!;
  const head = buildWeeklyPostHead(post, "zh");

  it("emits canonical with weekly/monday path", () => {
    expect(head).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/zh/weekly/2026-08-17/">`);
  });

  it("emits hreflang for both languages", () => {
    expect(head).toContain(`hreflang="zh-CN" href="${SITE_ORIGIN}/zh/weekly/2026-08-17/"`);
    expect(head).toContain(`hreflang="en" href="${SITE_ORIGIN}/en/weekly/2026-08-17/"`);
  });

  it("emits article og:type", () => {
    expect(head).toContain('<meta property="og:type" content="article">');
  });

  it("embeds Article JSON-LD dated by monday", () => {
    expect(head).toContain('"@type":"Article"');
    expect(head).toContain('"datePublished":"2026-08-17"');
  });
});

describe("buildWeeklyArchiveHead", () => {
  const head = buildWeeklyArchiveHead("en");

  it("emits canonical to /:lang/weekly/", () => {
    expect(head).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/en/weekly/">`);
  });

  it("embeds CollectionPage JSON-LD", () => {
    expect(head).toContain('"@type":"CollectionPage"');
    expect(head).toContain('"Weekly Horoscope"');
  });
});

describe("buildMonthlyPostHead", () => {
  const post = findMonthlyPost("2026-08")!;
  const head = buildMonthlyPostHead(post, "zh");

  it("emits canonical with monthly/month path", () => {
    expect(head).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/zh/monthly/2026-08/">`);
  });

  it("emits hreflang for both languages", () => {
    expect(head).toContain(`hreflang="zh-CN" href="${SITE_ORIGIN}/zh/monthly/2026-08/"`);
    expect(head).toContain(`hreflang="en" href="${SITE_ORIGIN}/en/monthly/2026-08/"`);
  });

  it("embeds Article JSON-LD dated to the first of the month", () => {
    expect(head).toContain('"@type":"Article"');
    expect(head).toContain('"datePublished":"2026-08-01"');
  });
});

describe("buildMonthlyArchiveHead", () => {
  const head = buildMonthlyArchiveHead("en");

  it("emits canonical to /:lang/monthly/", () => {
    expect(head).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/en/monthly/">`);
  });

  it("embeds CollectionPage JSON-LD", () => {
    expect(head).toContain('"@type":"CollectionPage"');
    expect(head).toContain('"Monthly Horoscope"');
  });
});

describe("weekly/monthly articleJsonLd", () => {
  it("weekly uses monday as date and weekly url", () => {
    const d = weeklyArticleJsonLd(findWeeklyPost("2026-08-17")!, "en") as Record<string, unknown>;
    expect(d["@type"]).toBe("Article");
    expect(d.datePublished).toBe("2026-08-17");
    expect(d.url).toBe(`${SITE_ORIGIN}/en/weekly/2026-08-17/`);
  });

  it("monthly uses first-of-month date and monthly url", () => {
    const d = monthlyArticleJsonLd(findMonthlyPost("2026-08")!, "zh") as Record<string, unknown>;
    expect(d["@type"]).toBe("Article");
    expect(d.datePublished).toBe("2026-08-01");
    expect(d.url).toBe(`${SITE_ORIGIN}/zh/monthly/2026-08/`);
  });
});
