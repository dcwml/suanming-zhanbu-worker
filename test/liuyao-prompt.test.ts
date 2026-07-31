import { describe, expect, it } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "../src/liuyao/prompt";
import { validRequest, staticRequest } from "./fixtures/liuyao-request";

describe("buildSystemPrompt", () => {
  it("zh prompt asks for Markdown output in Chinese", () => {
    const s = buildSystemPrompt("zh");
    expect(s).toContain("Markdown");
    expect(s).toContain("中文");
  });

  it("en prompt asks for English output", () => {
    const s = buildSystemPrompt("en");
    expect(s).toContain("Markdown");
    expect(s).toContain("English");
  });
});

describe("buildUserPrompt", () => {
  it("includes question, primary hexagram, moving lines, changed hexagram, and date", () => {
    const req = validRequest();
    const p = buildUserPrompt(req);
    expect(p).toContain(req.question);
    expect(p).toContain("雷水解");
    expect(p).toContain("九二：田获三狐");
    expect(p).toContain("雷风恒");
    expect(p).toContain("2026-08-01");
  });

  it("omits moving/changed sections for 0 moving lines", () => {
    const req = staticRequest();
    const p = buildUserPrompt(req);
    expect(p).toContain("雷水解");
    expect(p).not.toContain("变卦");
    expect(p).not.toContain("动爻");
  });

  it("en prompt keeps chinese hexagram names", () => {
    const req = validRequest();
    req.lang = "en";
    const p = buildUserPrompt(req);
    expect(p).toContain("雷水解");
  });
});
