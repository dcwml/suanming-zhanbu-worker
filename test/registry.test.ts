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
        expect(page.content[lang]).not.toMatch(/<\/?(html|head|body)\b/i);
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

  it("zeji page exists with bilingual faq of equal length", () => {
    const zeji = findPage("zeji");
    expect(zeji).toBeDefined();
    expect(zeji!.inNav).toBe(true);
    expect(zeji!.faq!.zh.length).toBeGreaterThan(0);
    expect(zeji!.faq!.zh.length).toBe(zeji!.faq!.en.length);
  });

  it("divination page exists with bilingual faq of equal length", () => {
    const divination = findPage("divination");
    expect(divination).toBeDefined();
    // 经「占卜」下拉标题进入，不在平铺导航里
    expect(divination!.inNav).toBe(false);
    expect(divination!.faq!.zh.length).toBeGreaterThan(0);
    expect(divination!.faq!.zh.length).toBe(divination!.faq!.en.length);
  });

  it("ziwei page exists with bilingual faq of equal length", () => {
    const ziwei = findPage("ziwei");
    expect(ziwei).toBeDefined();
    // 经「命理」下拉进入，不在平铺导航里
    expect(ziwei!.inNav).toBe(false);
    expect(ziwei!.faq!.zh.length).toBeGreaterThan(0);
    expect(ziwei!.faq!.zh.length).toBe(ziwei!.faq!.en.length);
  });

  it("hehun page exists with bilingual faq of equal length", () => {
    const hehun = findPage("hehun");
    expect(hehun).toBeDefined();
    // 经「命理」下拉进入，不在平铺导航里
    expect(hehun!.inNav).toBe(false);
    expect(hehun!.faq!.zh.length).toBeGreaterThan(0);
    expect(hehun!.faq!.zh.length).toBe(hehun!.faq!.en.length);
  });

  it("mingli page exists with bilingual faq of equal length", () => {
    const mingli = findPage("mingli");
    expect(mingli).toBeDefined();
    // 经「命理」下拉标题进入，不在平铺导航里
    expect(mingli!.inNav).toBe(false);
    expect(mingli!.faq!.zh.length).toBeGreaterThan(0);
    expect(mingli!.faq!.zh.length).toBe(mingli!.faq!.en.length);
  });

  it("chouqian page exists with bilingual faq of equal length", () => {
    const chouqian = findPage("chouqian");
    expect(chouqian).toBeDefined();
    // 经「抽签」下拉标题进入，不在平铺导航里
    expect(chouqian!.inNav).toBe(false);
    expect(chouqian!.faq!.zh.length).toBeGreaterThan(0);
    expect(chouqian!.faq!.zh.length).toBe(chouqian!.faq!.en.length);
  });

  it("huangdaxian, guanyin and yuelao pages exist with bilingual faq of equal length", () => {
    for (const slug of ["huangdaxian", "guanyin", "yuelao"] as const) {
      const page = findPage(slug);
      expect(page, slug).toBeDefined();
      // 经「抽签」下拉进入，不在平铺导航里
      expect(page!.inNav, slug).toBe(false);
      expect(page!.faq!.zh.length, slug).toBeGreaterThan(0);
      expect(page!.faq!.zh.length, slug).toBe(page!.faq!.en.length);
    }
  });

  it("bazi page no longer sits in the flat nav", () => {
    expect(findPage("bazi")!.inNav).toBe(false);
  });

  it("about page exists, out of flat nav, entered via footer", () => {
    const about = findPage("about");
    expect(about).toBeDefined();
    // 经 footer「关于」栏进入（见 layout/footer.ts），不在顶部导航
    expect(about!.inNav).toBe(false);
  });

  it("about and methodology copy never mention AI", () => {
    for (const slug of ["about", "methodology"] as const) {
      const page = findPage(slug);
      expect(page, slug).toBeDefined();
      for (const lang of ["zh", "en"] as const) {
        expect(page!.content[lang], `${slug}/${lang}`).not.toMatch(/\bAI\b/);
      }
    }
  });

  it("methodology page exists, out of flat nav", () => {
    const methodology = findPage("methodology");
    expect(methodology).toBeDefined();
    // 经 footer「关于」栏进入（见 layout/footer.ts），不在顶部导航
    expect(methodology!.inNav).toBe(false);
  });
});
