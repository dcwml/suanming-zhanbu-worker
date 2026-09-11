import { describe, expect, it } from "vitest";
import { TUIYAN_ARCHIVE_META, TUIYAN_POSTS, findTuiyanPost, tuiyanArchive } from "../src/pages/tuiyan";

describe("tuiyan archive module", () => {
  it("registers the lunar July 2026 post in both languages", () => {
    const post = TUIYAN_POSTS[0];
    expect(post.firstDay).toBe("2026-08-13");
    expect(post.meta.zh.title).toContain("七月");
    expect(post.meta.en.title).toContain("Hour Omens");
    expect(post.content.zh).toContain('class="tuiyan-grand"');
    expect(post.content.zh).toContain('class="tuiyan-daily"');
    expect(post.content.en).toContain('class="tuiyan-grand"');
    expect(post.content.zh).toContain("<h1>");
    expect(post.content.en).toContain("<h1>");
  });

  it("registers the lunar August 2026 post in both languages", () => {
    expect(TUIYAN_POSTS.length).toBe(2);
    const post = TUIYAN_POSTS[1];
    expect(post.firstDay).toBe("2026-09-11");
    expect(post.meta.zh.title).toContain("八月");
    expect(post.meta.en.title).toContain("Hour Omens");
    expect(post.content.zh).toContain('class="tuiyan-grand"');
    expect(post.content.zh).toContain('class="tuiyan-kuigang"');
    expect(post.content.zh).toContain('class="tuiyan-daily"');
    expect(post.content.en).toContain('class="tuiyan-grand"');
    expect(post.content.en).toContain('class="tuiyan-kuigang"');
    expect(post.content.zh).toContain("<h1>");
    expect(post.content.en).toContain("<h1>");
  });

  it("finds a post by lunar-month first day", () => {
    expect(findTuiyanPost("2026-08-13")?.firstDay).toBe("2026-08-13");
    expect(findTuiyanPost("2026-09-11")?.firstDay).toBe("2026-09-11");
    expect(findTuiyanPost("2026-10-11")).toBeUndefined();
  });

  it("returns newest-first archive items", () => {
    const items = tuiyanArchive();
    expect(items.length).toBe(2);
    expect(items[0].firstDay).toBe("2026-09-11");
    expect(items[0].title.zh).toContain("八月");
    expect(items[0].title.en).toContain("Hour Omens");
    expect(items[1].firstDay).toBe("2026-08-13");
    expect(items[1].title.zh).toContain("七月");
  });

  it("exposes archive meta for nav and footer", () => {
    expect(TUIYAN_ARCHIVE_META.slug).toBe("tuiyan");
    expect(TUIYAN_ARCHIVE_META.title.zh).toBe("时辰推演");
    expect(TUIYAN_ARCHIVE_META.title.en).toBe("Hour Omens");
  });
});
