import { describe, expect, it } from "vitest";
import {
  WEEKLY_ARCHIVE_META,
  WEEKLY_POSTS,
  findWeeklyPost,
  weeklyArchive,
} from "../src/pages/weekly";
import {
  MONTHLY_ARCHIVE_META,
  MONTHLY_POSTS,
  findMonthlyPost,
  monthlyArchive,
} from "../src/pages/monthly";

describe("findWeeklyPost", () => {
  it("finds an existing post by monday date", () => {
    const post = findWeeklyPost("2026-08-17");
    expect(post).toBeDefined();
    expect(post!.monday).toBe("2026-08-17");
    expect(post!.meta.zh.title).toBeTruthy();
    expect(post!.meta.en.title).toBeTruthy();
  });

  it("returns undefined for missing monday", () => {
    expect(findWeeklyPost("2099-01-04")).toBeUndefined();
  });

  it("every post has bilingual content and a monday key", () => {
    for (const post of WEEKLY_POSTS) {
      expect(post.monday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.content.zh.length).toBeGreaterThan(0);
      expect(post.content.en.length).toBeGreaterThan(0);
    }
  });
});

describe("weeklyArchive", () => {
  it("returns items sorted newest-first", () => {
    const items = weeklyArchive();
    expect(items.length).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].monday > items[i].monday).toBe(true);
    }
  });

  it("each item has monday and bilingual titles", () => {
    const first = weeklyArchive()[0];
    expect(first.monday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(first.title.zh).toBeTruthy();
    expect(first.title.en).toBeTruthy();
  });
});

describe("WEEKLY_ARCHIVE_META", () => {
  it("has bilingual titles and the weekly slug", () => {
    expect(WEEKLY_ARCHIVE_META.title.zh).toBe("每周运势");
    expect(WEEKLY_ARCHIVE_META.title.en).toBe("Weekly Horoscope");
    expect(WEEKLY_ARCHIVE_META.slug).toBe("weekly");
  });
});

describe("findMonthlyPost", () => {
  it("finds an existing post by month", () => {
    const post = findMonthlyPost("2026-08");
    expect(post).toBeDefined();
    expect(post!.month).toBe("2026-08");
    expect(post!.meta.zh.title).toBeTruthy();
    expect(post!.meta.en.title).toBeTruthy();
  });

  it("returns undefined for missing month", () => {
    expect(findMonthlyPost("2099-01")).toBeUndefined();
  });

  it("every post has bilingual content and a month key", () => {
    for (const post of MONTHLY_POSTS) {
      expect(post.month).toMatch(/^\d{4}-\d{2}$/);
      expect(post.content.zh.length).toBeGreaterThan(0);
      expect(post.content.en.length).toBeGreaterThan(0);
    }
  });
});

describe("monthlyArchive", () => {
  it("returns items sorted newest-first", () => {
    const items = monthlyArchive();
    expect(items.length).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].month > items[i].month).toBe(true);
    }
  });
});

describe("MONTHLY_ARCHIVE_META", () => {
  it("has bilingual titles and the monthly slug", () => {
    expect(MONTHLY_ARCHIVE_META.title.zh).toBe("每月运势");
    expect(MONTHLY_ARCHIVE_META.title.en).toBe("Monthly Horoscope");
    expect(MONTHLY_ARCHIVE_META.slug).toBe("monthly");
  });
});
