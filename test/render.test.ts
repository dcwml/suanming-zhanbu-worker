import { describe, expect, it } from "vitest";
import { renderError, renderNotFound, renderPage } from "../src/layout/render";
import bodyStartSnippet from "../src/layout/snippets/body-start.html";
import headSnippet from "../src/layout/snippets/head.html";
import { findPage } from "../src/pages/registry";

describe("renderPage", () => {
  const html = renderPage(findPage("")!, "zh");
  const enHtml = renderPage(findPage("sample")!, "en");

  it("is a full document with correct lang attribute", () => {
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain('<html lang="zh-CN">');
    expect(enHtml).toContain('<html lang="en">');
  });

  it("renders nav with links to all nav pages and highlights current", () => {
    expect(html).toContain('href="/zh/"');
    expect(html).toContain('href="/zh/sample/"');
    expect(html).toContain('aria-current="page"');
  });

  it("renders language switch pointing to the same page in the other language", () => {
    expect(html).toContain('class="lang-switch" href="/en/"');
    expect(enHtml).toContain('class="lang-switch" href="/zh/sample/"');
  });

  it("embeds the body fragment and footer", () => {
    expect(html).toContain("以传统命理与占卜的智慧，观照当下，启迪未来");
    expect(html).toContain("site-footer");
    expect(enHtml).toContain("How to Add a Page");
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
