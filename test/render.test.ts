import { describe, expect, it } from "vitest";
import { renderError, renderNotFound, renderPage, renderStatsPage } from "../src/layout/render";
import bodyStartSnippet from "../src/layout/snippets/body-start.html";
import headSnippet from "../src/layout/snippets/head.html";
import { findPage } from "../src/pages/registry";
import type { StatsData } from "../src/stats";

describe("renderPage", () => {
  const html = renderPage(findPage("")!, "zh");
  const enHtml = renderPage(findPage("bazi")!, "en");

  it("is a full document with correct lang attribute", () => {
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain('<html lang="zh-CN">');
    expect(enHtml).toContain('<html lang="en">');
  });

  it("renders nav with links to all nav pages and highlights current", () => {
    expect(html).toContain('href="/zh/"');
    expect(html).toContain('href="/zh/bazi/"');
    expect(html).toContain('href="/zh/daily/"');
    expect(html).toContain('aria-current="page"');
  });

  it("renders language switch pointing to the same page in the other language", () => {
    expect(html).toContain('class="lang-switch" href="/en/"');
    expect(enHtml).toContain('class="lang-switch" href="/zh/bazi/"');
  });

  it("renders brand link with seal logo pointing to language home", () => {
    expect(html).toContain('class="site-brand" href="/zh/"');
    expect(html).toContain('class="brand-logo" src="/assets/logo.png" alt="玄命阁"');
    expect(enHtml).toContain('class="site-brand" href="/en/"');
    expect(enHtml).toContain('alt="Xuanming Pavilion"');
  });

  it("renders multi-column footer with brand, links and disclaimer", () => {
    expect(html).toContain('class="footer-main"');
    expect(html).toContain('class="footer-bottom"');
    expect(html).toContain("命理 · 占卜 · 传统文化");
    expect(html).toContain("内容侧重传统术数解读，具体应用请结合自身情况");
    expect(html).toContain('href="/zh/daily/"');
    expect(enHtml).toContain("Fortune · Divination · Tradition");
    expect(enHtml).toContain("in light of your own circumstances");
  });

  it("links favicon to the seal logo", () => {
    expect(html).toContain('<link rel="icon" type="image/png" href="/assets/logo.png">');
  });

  it("embeds the body fragment and footer", () => {
    expect(html).toContain("以传统命理与占卜的智慧，观照当下，启迪未来");
    expect(html).toContain("site-footer");
    expect(enHtml).toContain("BaZi");
  });

  it("links the stylesheet", () => {
    expect(html).toContain('<link rel="stylesheet" href="/assets/style.css">');
  });

  it("injects head and body-start snippets", () => {
    expect(html).toContain(headSnippet.trim());
    expect(html).toContain(bodyStartSnippet.trim());
    // 片段在 </head> 之前、<body> 之后
    expect(html.indexOf(headSnippet.trim())).toBeLessThan(html.indexOf("</head>"));
    expect(html.indexOf(bodyStartSnippet.trim())).toBeGreaterThan(html.indexOf("<body>"));
  });
});

describe("renderNotFound", () => {
  it("also injects snippets", () => {
    expect(renderNotFound("zh")).toContain(headSnippet.trim());
    expect(renderNotFound("zh")).toContain(bodyStartSnippet.trim());
  });

  it("is noindex and localized", () => {
    const zh = renderNotFound("zh");
    const en = renderNotFound("en");
    expect(zh).toContain('content="noindex"');
    expect(zh).toContain("页面未找到");
    expect(en).toContain("Page Not Found");
    expect(zh).toContain('class="lang-switch" href="/en/"');
    expect(en).toContain('class="lang-switch" href="/zh/"');
  });
});

describe("renderError", () => {
  it("is noindex and does not leak stack traces", () => {
    const html = renderError("zh");
    expect(html).toContain('content="noindex"');
    expect(html).not.toContain("stack");
  });
});

describe("renderStatsPage", () => {
  const statsPage = findPage("stats")!;
  const mockStats: StatsData = {
    total: { homepage_pv: 1234, bazi_usage: 234, liuyao_usage: 120 },
    today: { homepage_pv: 45, bazi_usage: 12, liuyao_usage: 5 },
    api_calls: [
      { api_path: "/api/bazi/interpret", total_calls: 500, today_calls: 30 },
      { api_path: "/api/fortune/week", total_calls: 200, today_calls: 15 },
    ],
  };

  it("renders overview cards and api table with data", () => {
    const html = renderStatsPage(statsPage, "zh", mockStats);
    expect(html).toContain("全站与接口数据统计");
    expect(html).toContain("1,234");
    expect(html).toContain("234");
    expect(html).toContain("120");
    expect(html).toContain("45");
    expect(html).toContain("/api/bazi/interpret");
    expect(html).toContain("500");
    expect(html).toContain("30");
    expect(html).toContain("/api/fortune/week");
    expect(html).toContain("stats-card");
    expect(html).toContain("stats-table");
  });

  it("renders empty state gracefully when stats is null", () => {
    const html = renderStatsPage(statsPage, "zh", null);
    expect(html).toContain("0");
    expect(html).toContain("暂无接口调用记录");
  });

  it("renders localized en version", () => {
    const enHtml = renderStatsPage(statsPage, "en", mockStats);
    expect(enHtml).toContain("Site & API Statistics");
    expect(enHtml).toContain("API Endpoint");
    expect(enHtml).toContain("Total Calls");
  });
});
