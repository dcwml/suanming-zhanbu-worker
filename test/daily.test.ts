import { describe, expect, it } from "vitest";
import {
  DAILY_ARCHIVE_META,
  DAILY_POSTS,
  dailyArchive,
  findDailyPost,
} from "../src/pages/daily";

describe("findDailyPost", () => {
  it("finds an existing post by date", () => {
    const post = findDailyPost("2026-08-03");
    expect(post).toBeDefined();
    expect(post!.date).toBe("2026-08-03");
    expect(post!.meta.zh.title).toBeTruthy();
    expect(post!.meta.en.title).toBeTruthy();
  });

  it("returns undefined for missing date", () => {
    expect(findDailyPost("2099-01-01")).toBeUndefined();
  });
});

describe("dailyArchive", () => {
  it("returns items sorted newest-first", () => {
    const items = dailyArchive();
    expect(items.length).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].date > items[i].date).toBe(true);
    }
  });

  it("each item has date and bilingual titles", () => {
    const items = dailyArchive();
    const first = items[0];
    expect(first.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(first.title.zh).toBeTruthy();
    expect(first.title.en).toBeTruthy();
  });
});

describe("DAILY_ARCHIVE_META", () => {
  it("has bilingual nav titles", () => {
    expect(DAILY_ARCHIVE_META.title.zh).toBe("今日宜忌");
    expect(DAILY_ARCHIVE_META.title.en).toBe("Daily Almanac");
  });
});

void DAILY_POSTS;
