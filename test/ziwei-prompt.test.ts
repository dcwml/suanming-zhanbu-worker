import { describe, expect, it } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "../src/ziwei/prompt";
import { validChart } from "./fixtures/ziwei-request";

describe("buildSystemPrompt", () => {
  it("zh prompt asks for Markdown output in Chinese", () => {
    const s = buildSystemPrompt("zh");
    expect(s).toContain("Markdown");
    expect(s).toContain("中文");
  });

  it("en prompt asks for English output with star glossary", () => {
    const s = buildSystemPrompt("en");
    expect(s).toContain("Markdown");
    expect(s).toContain("English");
    expect(s).toContain("紫微 Zi Wei");
    expect(s).toContain("命宫");
  });

  it("forbids self-identification as artificial intelligence in the output", () => {
    expect(buildSystemPrompt("zh")).toContain("不要自称或提及人工智能");
    expect(buildSystemPrompt("en")).toContain("artificial intelligence");
    expect(buildSystemPrompt("zh")).not.toMatch(/AI|LLM/i);
  });
});

describe("buildUserPrompt", () => {
  const chart = validChart();

  it("mingpan part lists palaces with brightness and mutagen", () => {
    const p = buildUserPrompt("mingpan", "zh", chart);
    expect(p).toContain("命宫（丑·身宫）");
    expect(p).toContain("紫微(庙");
    expect(p).toContain("破军(旺");
    expect(p).toContain("太阴(陷·科)");
    expect(p).toContain("辅星 天魁");
    expect(p).toContain("无主星");
  });

  it("mingpan part does not include decadal or yearly blocks", () => {
    const p = buildUserPrompt("mingpan", "zh", chart);
    expect(p).not.toContain("当前大限");
    expect(p).not.toContain("今年流年");
  });

  it("daxian part includes decadal block but not yearly", () => {
    const p = buildUserPrompt("daxian", "zh", chart);
    expect(p).toContain("当前大限：丙戌（36-45 岁）");
    expect(p).toContain("天同禄");
    expect(p).toContain("廉贞忌");
    expect(p).not.toContain("今年流年");
  });

  it("liunian part includes decadal and yearly blocks", () => {
    const p = buildUserPrompt("liunian", "zh", chart);
    expect(p).toContain("当前大限：丙戌");
    expect(p).toContain("今年流年：2026 年 丙午");
  });

  it("en prompt keeps chinese star terms and word target", () => {
    const p = buildUserPrompt("mingpan", "en", chart);
    expect(p).toContain("紫微");
    expect(p).toContain("About 400 words");
  });
});
