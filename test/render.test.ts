import { describe, expect, it } from "vitest";
import { renderError, renderNotFound, renderPage } from "../src/layout/render";
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
    expect(html).toContain("探索命理与占卜的世界");
    expect(html).toContain("site-footer");
    expect(enHtml).toContain("How to Add a Page");
  });

  it("links the stylesheet", () => {
    expect(html).toContain('<link rel="stylesheet" href="/assets/style.css">');
  });
});

describe("renderNotFound", () => {
  it("is noindex and localized", () => {
    const zh = renderNotFound("zh");
    const en = renderNotFound("en");
    expect(zh).toContain('content="noindex"');
    expect(zh).toContain("页面未找到");
    expect(en).toContain("Page Not Found");
  });
});

describe("renderError", () => {
  it("is noindex and does not leak stack traces", () => {
    const html = renderError("zh");
    expect(html).toContain('content="noindex"');
    expect(html).not.toContain("stack");
  });
});
