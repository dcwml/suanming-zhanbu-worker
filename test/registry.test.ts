import { describe, expect, it } from "vitest";
import { NOT_FOUND_CONTENT, PAGES, findPage, navPages } from "../src/pages/registry";

describe("registry", () => {
  it("contains home with empty slug", () => {
    const home = findPage("");
    expect(home).toBeDefined();
    expect(home!.slug).toBe("");
  });

  it("slugs are unique", () => {
    const slugs = PAGES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every page has non-empty bilingual meta and content", () => {
    for (const page of PAGES) {
      for (const lang of ["zh", "en"] as const) {
        expect(page.meta[lang].title.length, `${page.slug}/${lang} title`).toBeGreaterThan(0);
        expect(page.meta[lang].description.length, `${page.slug}/${lang} description`).toBeGreaterThan(0);
        expect(page.content[lang].trim().length, `${page.slug}/${lang} content`).toBeGreaterThan(0);
      }
    }
  });

  it("content fragments do not contain <html>/<head>/<body> tags", () => {
    for (const page of [...PAGES, { content: NOT_FOUND_CONTENT }]) {
      for (const lang of ["zh", "en"] as const) {
        expect(page.content[lang]).not.toMatch(/<(html|head|body)\b/i);
      }
    }
  });

  it("navPages returns only inNav entries", () => {
    expect(navPages().every((p) => p.inNav)).toBe(true);
  });

  it("notfound content exists for both languages", () => {
    expect(NOT_FOUND_CONTENT.zh.trim().length).toBeGreaterThan(0);
    expect(NOT_FOUND_CONTENT.en.trim().length).toBeGreaterThan(0);
  });
});
