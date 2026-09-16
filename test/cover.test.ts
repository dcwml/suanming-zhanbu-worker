/**
 * 文章封面图渲染链路测试
 *
 * 覆盖：单篇 head 的 og:image 覆盖、Article JSON-LD image、
 * 单篇正文头图 figure、归档页缩略图（仅对配置了 cover 的条目生效）。
 */

import { describe, expect, it } from "vitest";
import { absoluteUrl, COVERS_ORIGIN, OG_IMAGE_PATH, coverThumbPath, coverUrl } from "../src/config/site";
import { DAILY_POSTS, dailyArchive, findDailyPost } from "../src/pages/daily";
import { buildDailyPostHead } from "../src/seo/meta";
import { articleJsonLd } from "../src/seo/jsonld";
import { renderDailyArchive, renderDailyPost } from "../src/layout/render";

/** 当前仓库中带封面的锚点文章（首个配置 cover 的条目） */
const coveredPost = DAILY_POSTS.find((p) => p.cover)!;
const uncoveredPost = DAILY_POSTS.find((p) => !p.cover)!;

describe("cover url helpers", () => {
  it("coverUrl 拼接 R2 自定义域名", () => {
    expect(coverUrl("/covers/daily/2026-09-16.jpg")).toBe(`${COVERS_ORIGIN}/covers/daily/2026-09-16.jpg`);
  });

  it("coverThumbPath 派生同前缀缩略图路径", () => {
    expect(coverThumbPath("/covers/daily/2026-09-16.jpg")).toBe("/covers/daily/2026-09-16.thumb.webp");
  });
});

describe("post head with cover", () => {
  const head = buildDailyPostHead(coveredPost, "zh");
  const coverAbs = coverUrl(coveredPost.cover!);

  it("og:image / twitter:image 指向封面", () => {
    expect(head).toContain(`<meta property="og:image" content="${coverAbs}">`);
    expect(head).toContain(`<meta name="twitter:image" content="${coverAbs}">`);
  });

  it("Article JSON-LD 携带 image 数组", () => {
    expect(head).toContain(`"image":["${coverAbs}"]`);
  });

  it("jsonld 构建器输出与 head 一致", () => {
    const jsonld = articleJsonLd(coveredPost, "en") as { image?: string[] };
    expect(jsonld.image).toEqual([coverAbs]);
  });
});

describe("post head without cover", () => {
  const head = buildDailyPostHead(uncoveredPost, "zh");

  it("回落到全站默认 og 图", () => {
    expect(head).toContain(`<meta property="og:image" content="${absoluteUrl(OG_IMAGE_PATH)}">`);
  });

  it("JSON-LD 不含 image 字段", () => {
    expect(head).not.toContain('"image"');
  });
});

describe("renderDailyPost cover figure", () => {
  it("带封面时正文顶部插入 figure.post-cover", () => {
    const html = renderDailyPost(coveredPost, "zh");
    expect(html).toContain('<figure class="post-cover">');
    expect(html).toContain(`src="${coverUrl(coveredPost.cover!)}"`);
    expect(html).toContain('width="1312" height="736"');
    // 头图在正文第一个 section 之前
    expect(html.indexOf('class="post-cover"')).toBeLessThan(html.indexOf('<section class="daily-almanac"'));
  });

  it("无封面时不插入 figure", () => {
    const html = renderDailyPost(uncoveredPost, "zh");
    expect(html).not.toContain("post-cover");
  });
});

describe("renderDailyArchive cover thumbs", () => {
  const items = dailyArchive();
  const html = renderDailyArchive(items, "zh");

  it("有封面的条目带缩略图链接", () => {
    expect(html).toContain("daily-archive-thumb");
    expect(html).toContain(`src="${coverUrl(coverThumbPath(coveredPost.cover!))}"`);
    expect(html).toContain('loading="lazy"');
  });

  it("缩略图数量与带封面条目数一致，且少于总条目数（存量默认无封面）", () => {
    const thumbCount = (html.match(/daily-archive-thumb/g) ?? []).length;
    const coveredCount = items.filter((i) => i.cover).length;
    expect(thumbCount).toBe(coveredCount);
    expect(coveredCount).toBeLessThan(items.length);
  });

  it("条目链接指向对应单篇", () => {
    expect(html).toContain(`href="/zh/daily/${coveredPost.date}/"`);
  });

  it("findDailyPost 返回的锚点文章确实配置了 cover", () => {
    expect(findDailyPost(coveredPost.date)?.cover).toBeTruthy();
  });
});
