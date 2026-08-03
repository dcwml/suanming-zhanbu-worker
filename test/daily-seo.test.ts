import { describe, expect, it } from "vitest";
import { SITE_ORIGIN } from "../src/config/site";
import { buildDailyArchiveHead, buildDailyPostHead } from "../src/seo/meta";
import { findDailyPost } from "../src/pages/daily";

describe("buildDailyPostHead", () => {
  const post = findDailyPost("2026-08-03")!;
  const head = buildDailyPostHead(post, "zh");

  it("emits canonical with daily/date path", () => {
    expect(head).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/zh/daily/2026-08-03/">`);
  });

  it("emits hreflang for both languages", () => {
    expect(head).toContain(`hreflang="zh-CN" href="${SITE_ORIGIN}/zh/daily/2026-08-03/"`);
    expect(head).toContain(`hreflang="en" href="${SITE_ORIGIN}/en/daily/2026-08-03/"`);
  });

  it("emits article og:type", () => {
    expect(head).toContain('<meta property="og:type" content="article">');
  });

  it("embeds Article JSON-LD", () => {
    expect(head).toContain('"@type":"Article"');
    expect(head).toContain('"datePublished":"2026-08-03"');
  });
});

describe("buildDailyArchiveHead", () => {
  const head = buildDailyArchiveHead("en");

  it("emits canonical to /:lang/daily/", () => {
    expect(head).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/en/daily/">`);
  });

  it("embeds CollectionPage JSON-LD", () => {
    expect(head).toContain('"@type":"CollectionPage"');
  });
});
