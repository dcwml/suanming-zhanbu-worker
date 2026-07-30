import { describe, expect, it } from "vitest";
import { absoluteUrl, langFromPath, pagePath } from "../src/config/site";

describe("pagePath", () => {
  it("home page path", () => {
    expect(pagePath("zh", "")).toBe("/zh/");
    expect(pagePath("en", "")).toBe("/en/");
  });
  it("content page path always has trailing slash", () => {
    expect(pagePath("en", "sample")).toBe("/en/sample/");
  });
});

describe("absoluteUrl", () => {
  it("prefixes the placeholder origin", () => {
    expect(absoluteUrl("/zh/")).toBe("https://example.com/zh/");
  });
});

describe("langFromPath", () => {
  it("detects english prefix", () => {
    expect(langFromPath("/en/sample/")).toBe("en");
    expect(langFromPath("/en")).toBe("en");
  });
  it("falls back to default language", () => {
    expect(langFromPath("/zh/")).toBe("zh");
    expect(langFromPath("/whatever")).toBe("zh");
    expect(langFromPath("/")).toBe("zh");
    expect(langFromPath("/english")).toBe("zh");
  });
});
