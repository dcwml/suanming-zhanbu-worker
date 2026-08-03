# 每日宜忌栏目实施计划（2026-08-03）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增「今日宜忌」日更栏目（归档页 `/:lang/daily/` + 单篇 `/:lang/daily/:date/`），纯静态烘焙、零运行时 LLM；配套生成期工具 `scripts/almanac.ts`；同时删除 sample 页面、导航/页脚接入 daily。

**Architecture:** daily 走独立聚合模块 `src/pages/daily.ts`（不并入 registry 的固定 PAGES）。单篇与归档页路由在 `routes/pages.ts` 新增三段匹配（daily 是唯一的三段路径）。SEO 复用现有 buildHead + 新增 Article/CollectionPage JSON-LD 函数。生成期 Node 脚本独立于 Worker 运行时。

**Tech Stack:** Hono + TypeScript（Cloudflare Workers），vitest（`@cloudflare/vitest-pool-workers`），lunar-javascript（仅生成期 devDependency，不入运行时）。

**设计文档：** `docs/superpowers/specs/2026-08-03-daily-content-design.md`

---

## 文件结构总览

| 文件 | 操作 | 职责 |
|---|---|---|
| `src/pages/daily.ts` | 新建 | `DailyPost`/`DailyArchiveItem` 接口、`DAILY_POSTS`、`findDailyPost`、`dailyArchive`、`DAILY_ARCHIVE_META` |
| `src/content/daily/2026-08-03.zh.html` | 新建 | 首篇 daily 中文正文（三段式） |
| `src/content/daily/2026-08-03.en.html` | 新建 | 首篇 daily 英文正文 |
| `src/routes/pages.ts` | 改 | 新增 daily 归档页 + 单篇路由（三段）、无尾斜杠 301 |
| `src/seo/jsonld.ts` | 改 | 新增 `articleJsonLd`、`collectionPageJsonLd` |
| `src/seo/meta.ts` | 改 | 新增 `buildDailyHead`（Article JSON-LD + daily 路径 canonical/hreflang） |
| `src/seo/sitemap.ts` | 改 | 纳入 daily 单篇 + 归档页，移除 sample |
| `src/layout/render.ts` | 改 | 新增 `renderDailyPost`、`renderDailyArchive` |
| `src/layout/nav.ts` | 改 | 主导航追加 daily 归档页入口 |
| `src/layout/footer.ts` | 改 | 「关于」列 sample → daily |
| `src/pages/registry.ts` | 改 | 删除 sample 的 import 与 PAGES 条目 |
| `src/content/sample.zh.html` | 删除 | |
| `src/content/sample.en.html` | 删除 | |
| `scripts/almanac.ts` | 新建 | 生成期工具：lunar-javascript 算历法量 + 宜忌查表 |
| `package.json` | 改 | devDependencies 加 lunar-javascript + tsx；scripts 加 almanac |
| `test/daily.test.ts` | 新建 | findDailyPost/dailyArchive 单测 |
| `test/daily-seo.test.ts` | 新建 | Article/CollectionPage JSON-LD + daily head 单测 |
| `test/integration.test.ts` | 改 | 补 daily 路由测试、删 sample 测试 |
| `test/render.test.ts` | 改 | sample 引用改用现存 slug |
| `test/sitemap.test.ts` | 改 | 移除 sample 断言、加 daily 断言 |

---

### Task 1: 删除 sample 页面

先做减法。sample 的内容文件、registry 注册、footer 链接全部移除，相关测试改为引用现存页面。此任务完成后系统不引用 sample 任何内容。

**Files:**
- Delete: `src/content/sample.zh.html`
- Delete: `src/content/sample.en.html`
- Modify: `src/pages/registry.ts`
- Modify: `src/layout/footer.ts`
- Modify: `test/integration.test.ts`
- Modify: `test/render.test.ts`
- Modify: `test/sitemap.test.ts`

- [ ] **Step 1: 删除 sample 内容文件**

删除 `src/content/sample.zh.html` 与 `src/content/sample.en.html`。

- [ ] **Step 2: 从 registry 移除 sample**

在 `src/pages/registry.ts` 中删除两行 import 与 PAGES 数组里的 sample 条目。

删除这两行 import（第 4–5 行）：

```ts
import sampleZh from "../content/sample.zh.html";
import sampleEn from "../content/sample.en.html";
```

删除 PAGES 数组中的 sample 条目（原第 57–66 行整个对象）：

```ts
  {
    slug: "sample",
    inNav: true,
    jsonldType: "Article",
    meta: {
      zh: { title: "示例文章", description: "演示如何以正文片段方式新增一个页面。" },
      en: { title: "Sample Article", description: "Shows how to add a page using body fragments." },
    },
    content: { zh: sampleZh, en: sampleEn },
  },
```

- [ ] **Step 3: footer 暂时移除 sample 链接（后面 Task 8 换成 daily）**

`src/layout/footer.ts` 第 21 行，把 `"sample"` 从 aboutLinks 移除，暂时只留首页：

```ts
  const aboutLinks = [""]
```

- [ ] **Step 4: integration.test.ts 删除 sample 相关测试**

删除 `redirects` describe 里的这条测试（原第 22–26 行）：

```ts
  it("redirects /en/sample to /en/sample/", async () => {
    const res = await fetchNoFollow("/en/sample");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/en/sample/");
  });
```

删除 `pages` describe 里的这条测试（原第 40–46 行）：

```ts
  it("renders en sample page", async () => {
    const res = await fetchNoFollow("/en/sample/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<html lang="en"');
    expect(html).toContain("How to Add a Page");
  });
```

把「deep path beyond」测试（原第 113–117 行）里的 sample 换成 bazi：

```ts
  it("deep path beyond /:lang/:slug/ returns 404", async () => {
    const res = await fetchNoFollow("/zh/bazi/extra/");
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("页面未找到");
  });
```

- [ ] **Step 5: render.test.ts 改用 bazi 替代 sample**

`test/render.test.ts` 把所有 `findPage("sample")` 改为 `findPage("bazi")`，同步更新断言文本。

第 9 行：

```ts
  const enHtml = renderPage(findPage("bazi")!, "en");
```

第 19 行（导航链接断言）：

```ts
    expect(html).toContain('href="/zh/bazi/"');
```

第 25 行（语言切换断言）：

```ts
    expect(enHtml).toContain('class="lang-switch" href="/zh/bazi/"');
```

第 51 行（正文文本断言）——bazi 英文页含 "BaZi" 字样，改为：

```ts
    expect(enHtml).toContain("BaZi");
```

- [ ] **Step 6: sitemap.test.ts 移除 sample 断言**

`test/sitemap.test.ts`：

第 17–18 行删除 sample 的两个断言：

```ts
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/zh/sample/</loc>`);
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/en/sample/</loc>`);
```

第 24–25 行删除 sample 的两个 alternate 断言：

```ts
    expect(xml).toContain(`<xhtml:link rel="alternate" hreflang="zh-CN" href="${SITE_ORIGIN}/zh/sample/"/>`);
    expect(xml).toContain(`<xhtml:link rel="alternate" hreflang="en" href="${SITE_ORIGIN}/en/sample/"/>`);
```

- [ ] **Step 7: 运行测试确认通过**

Run: `npm test`
Expected: 全部通过。若有失败，检查是否遗漏了 sample 引用。

- [ ] **Step 8: typecheck**

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: remove sample page"
```

---

### Task 2: 创建 daily 聚合模块骨架

新建 `src/pages/daily.ts`，定义类型与导出，但先注册一篇最小 fixture 文章（后续 Task 6 会替换为正式首篇）。此任务的测试先行。

**Files:**
- Create: `src/content/daily/2026-08-03.zh.html`
- Create: `src/content/daily/2026-08-03.en.html`
- Create: `src/pages/daily.ts`
- Create: `test/daily.test.ts`

- [ ] **Step 1: 创建最小 fixture 内容文件**

`src/content/daily/2026-08-03.zh.html`（占位，Task 6 替换为正式内容）：

```html
<section class="daily-almanac">
  <h2>今日宜忌</h2>
  <p>占位</p>
</section>
<section class="daily-zodiac">
  <h2>生肖运势</h2>
  <p>占位</p>
</section>
<section class="daily-story">
  <h2>玄学科普</h2>
  <p>占位</p>
</section>
```

`src/content/daily/2026-08-03.en.html`：

```html
<section class="daily-almanac">
  <h2>Today's Auspicious &amp; Inauspicious</h2>
  <p>placeholder</p>
</section>
<section class="daily-zodiac">
  <h2>Zodiac Fortune</h2>
  <p>placeholder</p>
</section>
<section class="daily-story">
  <h2>Folklore</h2>
  <p>placeholder</p>
</section>
```

- [ ] **Step 2: 写 daily.ts 测试（先失败）**

`test/daily.test.ts`：

```ts
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
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npx vitest run test/daily.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 4: 实现 src/pages/daily.ts**

```ts
import type { Lang } from "../config/site";
import type { PageMeta } from "./registry";
import daily20260803Zh from "../content/daily/2026-08-03.zh.html";
import daily20260803En from "../content/daily/2026-08-03.en.html";

export interface DailyPost {
  /** ISO 日期 "YYYY-MM-DD" */
  date: string;
  meta: Record<Lang, PageMeta>;
  content: Record<Lang, string>;
}

export interface DailyArchiveItem {
  date: string;
  title: Record<Lang, string>;
}

/** 归档页元信息：供 nav.ts / footer.ts 引用（不进 registry） */
export const DAILY_ARCHIVE_META = {
  title: { zh: "今日宜忌", en: "Daily Almanac" } as Record<Lang, string>,
  slug: "daily",
} as const;

export const DAILY_POSTS: readonly DailyPost[] = [
  {
    date: "2026-08-03",
    meta: {
      zh: { title: "2026年8月3日宜忌", description: "今日黄历宜忌、生肖运势与玄学科普。" },
      en: { title: "Daily Almanac — August 3, 2026", description: "Today's auspicious activities, zodiac fortune and folklore." },
    },
    content: { zh: daily20260803Zh, en: daily20260803En },
  },
];

export function findDailyPost(date: string): DailyPost | undefined {
  return DAILY_POSTS.find((p) => p.date === date);
}

export function dailyArchive(): DailyArchiveItem[] {
  return [...DAILY_POSTS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((p) => ({ date: p.date, title: p.meta }));
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npx vitest run test/daily.test.ts`
Expected: PASS。

- [ ] **Step 6: typecheck**

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add daily content module skeleton with fixture"
```

---

### Task 3: 扩展 JSON-LD（Article + CollectionPage）

为 daily 单篇（Article）和归档页（CollectionPage）新增 JSON-LD 构建函数。纯函数，TDD。

**Files:**
- Modify: `src/seo/jsonld.ts`
- Modify: `test/jsonld.test.ts`

- [ ] **Step 1: 写测试（先失败）**

在 `test/jsonld.test.ts` 末尾追加（保留现有 import，补充 `articleJsonLd`、`collectionPageJsonLd` 到 import）：

```ts
import {
  articleJsonLd,
  collectionPageJsonLd,
} from "../src/seo/jsonld";
import type { DailyPost } from "../src/pages/daily";

const dailyFixture: DailyPost = {
  date: "2026-08-03",
  meta: {
    zh: { title: "测试日宜忌", description: "描述" },
    en: { title: "Test Daily", description: "Desc" },
  },
  content: { zh: "<p>zh</p>", en: "<p>en</p>" },
};

describe("articleJsonLd", () => {
  it("emits Article type with date and author", () => {
    const d = articleJsonLd(dailyFixture, "zh") as Record<string, unknown>;
    expect(d["@type"]).toBe("Article");
    expect(d.headline).toBe("测试日宜忌");
    expect(d.datePublished).toBe("2026-08-03");
    expect(d.dateModified).toBe("2026-08-03");
    expect(d.author).toEqual({ "@type": "Organization", name: "玄命阁" });
    expect(d.url).toBe(`${SITE_ORIGIN}/zh/daily/2026-08-03/`);
  });

  it("uses en author name for en", () => {
    const d = articleJsonLd(dailyFixture, "en") as Record<string, unknown>;
    expect((d.author as { name: string }).name).toBe("Xuanming Pavilion");
  });
});

describe("collectionPageJsonLd", () => {
  it("emits CollectionPage pointing to archive url", () => {
    const d = collectionPageJsonLd("zh") as Record<string, unknown>;
    expect(d["@type"]).toBe("CollectionPage");
    expect(d.url).toBe(`${SITE_ORIGIN}/zh/daily/`);
    expect(d.name).toBe("今日宜忌");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/jsonld.test.ts`
Expected: FAIL（函数未导出）。

- [ ] **Step 3: 实现 articleJsonLd 与 collectionPageJsonLd**

在 `src/seo/jsonld.ts` 顶部 import 区追加 `DailyPost` 类型：

```ts
import type { DailyPost } from "../pages/daily";
```

在文件末尾（`buildJsonLdScripts` 之前）追加：

```ts
export function articleJsonLd(post: DailyPost, lang: Lang): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.meta[lang].title,
    description: post.meta[lang].description,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: lang === "zh" ? SITE_NAME : SITE_NAME_EN },
    url: absoluteUrl(pagePath(lang, `daily/${post.date}`)),
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(pagePath(lang, `daily/${post.date}`)) },
    inLanguage: HREFLANG_CODE[lang],
  };
}

export function collectionPageJsonLd(lang: Lang): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: lang === "zh" ? "今日宜忌" : "Daily Almanac",
    url: absoluteUrl(pagePath(lang, "daily")),
    inLanguage: HREFLANG_CODE[lang],
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/jsonld.test.ts`
Expected: PASS。

- [ ] **Step 5: typecheck**

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Article and CollectionPage JSON-LD builders"
```

---

### Task 4: 扩展 meta（buildDailyHead）

daily 单篇和归档页的 canonical/hreflang 路径与普通页面不同（三段路径 `/:lang/daily/:date/`），现有 `buildHead` 硬编码 `pagePath(lang, page.slug)` 只支持两段。新增专用 head 构建函数，不改动现有 `buildHead`。

**Files:**
- Modify: `src/seo/meta.ts`
- Create: `test/daily-seo.test.ts`

- [ ] **Step 1: 写测试（先失败）**

`test/daily-seo.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { SITE_ORIGIN } from "../src/config/site";
import { buildDailyArchiveHead, buildDailyPostHead } from "../src/seo/meta";
import { findDailyPost } from "../src/pages/daily";

describe("buildDailyPostHead", () => {
  const post = findDailyPost("2026-08-03")!;
  const head = buildDailyPostHead(post, "zh");

  it("emits canonical with daily/date path", () => {
    expect(head).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/zh/daily/2026-08-03/">`);
  });

  it("emits hreflang for both languages", () => {
    expect(head).toContain(`hreflang="zh-CN" href="${SITE_ORIGIN}/zh/daily/2026-08-03/"`);
    expect(head).toContain(`hreflang="en" href="${SITE_ORIGIN}/en/daily/2026-08-03/"`);
  });

  it("emits article og:type", () => {
    expect(head).toContain('<meta property="og:type" content="article">');
  });

  it("embeds Article JSON-LD", () => {
    expect(head).toContain('"@type":"Article"');
    expect(head).toContain('"datePublished":"2026-08-03"');
  });
});

describe("buildDailyArchiveHead", () => {
  const head = buildDailyArchiveHead("en");

  it("emits canonical to /:lang/daily/", () => {
    expect(head).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/en/daily/">`);
  });

  it("embeds CollectionPage JSON-LD", () => {
    expect(head).toContain('"@type":"CollectionPage"');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/daily-seo.test.ts`
Expected: FAIL（函数未导出）。

- [ ] **Step 3: 实现 buildDailyPostHead 与 buildDailyArchiveHead**

在 `src/seo/meta.ts` 顶部 import 区追加：

```ts
import type { DailyPost } from "../pages/daily";
import { articleJsonLd, collectionPageJsonLd, toJsonLdScript } from "./jsonld";
```

注意：`buildJsonLdScripts` 已经 import 自 jsonld，但 `toJsonLdScript` 和 `articleJsonLd`/`collectionPageJsonLd` 是新引用。检查现有 import 行（第 17 行 `import { buildJsonLdScripts } from "./jsonld";`），合并为：

```ts
import { articleJsonLd, buildJsonLdScripts, collectionPageJsonLd, toJsonLdScript } from "./jsonld";
```

在文件末尾追加两个函数：

```ts
/** daily 单篇 head：三段路径 canonical + Article JSON-LD */
export function buildDailyPostHead(post: DailyPost, lang: Lang): string {
  const path = pagePath(lang, `daily/${post.date}`);
  const canonical = absoluteUrl(path);
  const title = escapeHtml(`${post.meta[lang].title} - ${siteName(lang)}`);
  const description = escapeHtml(post.meta[lang].description);
  const image = absoluteUrl(OG_IMAGE_PATH);
  const otherLang = OTHER_LANG[lang];

  const hreflangs = LANGS.map(
    (l) =>
      `<link rel="alternate" hreflang="${HREFLANG_CODE[l]}" href="${absoluteUrl(pagePath(l, `daily/${post.date}`))}">`,
  ).join("\n    ");
  const xDefault = `<link rel="alternate" hreflang="x-default" href="${absoluteUrl(pagePath(DEFAULT_LANG, `daily/${post.date}`))}">`;

  return [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<link rel="icon" type="image/png" href="/assets/logo.png">`,
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${canonical}">`,
    hreflangs,
    xDefault,
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="${escapeHtml(siteName(lang))}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:locale" content="${OG_LOCALE[lang]}">`,
    `<meta property="og:locale:alternate" content="${OG_LOCALE[otherLang]}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${image}">`,
    toJsonLdScript(articleJsonLd(post, lang)),
  ].join("\n    ");
}

/** daily 归档页 head */
export function buildDailyArchiveHead(lang: Lang): string {
  const path = pagePath(lang, "daily");
  const canonical = absoluteUrl(path);
  const title = escapeHtml(lang === "zh" ? `今日宜忌 - ${SITE_NAME}` : `Daily Almanac - ${SITE_NAME_EN}`);
  const description = escapeHtml(lang === "zh" ? "每日黄历宜忌、生肖运势与玄学科普。" : "Daily Chinese almanac, zodiac fortune and folklore.");
  const image = absoluteUrl(OG_IMAGE_PATH);
  const otherLang = OTHER_LANG[lang];

  const hreflangs = LANGS.map(
    (l) =>
      `<link rel="alternate" hreflang="${HREFLANG_CODE[l]}" href="${absoluteUrl(pagePath(l, "daily"))}">`,
  ).join("\n    ");
  const xDefault = `<link rel="alternate" hreflang="x-default" href="${absoluteUrl(pagePath(DEFAULT_LANG, "daily"))}">`;

  return [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<link rel="icon" type="image/png" href="/assets/logo.png">`,
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${canonical}">`,
    hreflangs,
    xDefault,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escapeHtml(siteName(lang))}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:locale" content="${OG_LOCALE[lang]}">`,
    `<meta property="og:locale:alternate" content="${OG_LOCALE[otherLang]}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${image}">`,
    toJsonLdScript(collectionPageJsonLd(lang)),
  ].join("\n    ");
}
```

注意：daily 单篇只注入 Article JSON-LD，不加面包屑（`breadcrumbJsonLd` 需要 PageEntry 形状，daily 走 DailyPost，避免 `as any` 类型耦合）。Article JSON-LD 自身已满足 SEO 富结果要求。

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/daily-seo.test.ts`
Expected: PASS。

- [ ] **Step 5: typecheck**

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add buildDailyPostHead and buildDailyArchiveHead"
```

---

### Task 5: 扩展 render（renderDailyPost + renderDailyArchive）

复用现有 `layout` 内部函数，为 daily 两种页面类型提供渲染入口。

**Files:**
- Modify: `src/layout/render.ts`

- [ ] **Step 1: 实现 renderDailyPost 与 renderDailyArchive**

在 `src/layout/render.ts` 顶部 import 区追加：

```ts
import type { DailyArchiveItem, DailyPost } from "../pages/daily";
import { DAILY_ARCHIVE_META } from "../pages/daily";
import { buildDailyArchiveHead, buildDailyPostHead } from "../seo/meta";
import { pagePath } from "../config/site";
```

在文件末尾追加：

```ts
/** daily 单篇：导航高亮归档页（slug="daily"），语言切换指向同日期另一语言版 */
export function renderDailyPost(post: DailyPost, lang: Lang): string {
  return layout(
    lang,
    buildDailyPostHead(post, lang),
    renderNav(lang, "daily", `daily/${post.date}`),
    post.content[lang],
  );
}

/** daily 归档页：按日期倒序列出文章链接 */
export function renderDailyArchive(items: DailyArchiveItem[], lang: Lang): string {
  const title = DAILY_ARCHIVE_META.title[lang];
  const links = items
    .map(
      (item) =>
        `      <article class="daily-archive-item">\n        <h2><a href="${pagePath(lang, `daily/${item.date}`)}">${item.title[lang]}</a></h2>\n      </article>`,
    )
    .join("\n");
  const main = `      <h1>${title}</h1>\n${links}`;
  return layout(lang, buildDailyArchiveHead(lang), renderNav(lang, "daily", "daily"), main);
}
```

注意 `renderNav` 的第三参 `langSwitchSlug` 需要能让 `pagePath(other, langSwitchSlug)` 生成正确的路径。`pagePath(lang, "daily/2026-08-03")` 会生成 `/:lang/daily/2026-08-03/`，符合预期。但 `renderNav` 内部用的是 `pagePath(other, langSwitchSlug ?? currentSlug)`——需要确认 `langSwitchSlug` 原样传入。查看 nav.ts 第 27 行确认：`pagePath(other, langSwitchSlug ?? currentSlug)`。传入 `daily/${post.date}` 作为第三参即可。

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add renderDailyPost and renderDailyArchive"
```

---

### Task 6: 新增 daily 路由

在 `routes/pages.ts` 注册 daily 归档页和单篇路由。这是 daily 上线的核心接入点。路由需处理三段路径，且无尾斜杠 301 归一化。

**Files:**
- Modify: `src/routes/pages.ts`
- Modify: `test/integration.test.ts`

- [ ] **Step 1: 写集成测试（先失败）**

在 `test/integration.test.ts` 新增一个 describe 块（放在 `describe("404 handling")` 之前）：

```ts
describe("daily", () => {
  it("renders zh daily archive", async () => {
    const res = await fetchNoFollow("/zh/daily/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("今日宜忌");
  });

  it("renders en daily archive", async () => {
    const res = await fetchNoFollow("/en/daily/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Daily Almanac");
  });

  it("renders existing zh daily post", async () => {
    const res = await fetchNoFollow("/zh/daily/2026-08-03/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("daily-almanac");
    expect(html).toContain("daily-zodiac");
    expect(html).toContain("daily-story");
  });

  it("renders existing en daily post", async () => {
    const res = await fetchNoFollow("/en/daily/2026-08-03/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("daily-almanac");
  });

  it("redirects /zh/daily/2026-08-03 to trailing-slash", async () => {
    const res = await fetchNoFollow("/zh/daily/2026-08-03");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/zh/daily/2026-08-03/");
  });

  it("redirects /zh/daily to /zh/daily/", async () => {
    const res = await fetchNoFollow("/zh/daily");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/zh/daily/");
  });

  it("returns 404 for non-existent daily date", async () => {
    const res = await fetchNoFollow("/zh/daily/2099-01-01/");
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("页面未找到");
  });

  it("returns 404 for invalid date format", async () => {
    const res = await fetchNoFollow("/zh/daily/not-a-date/");
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/integration.test.ts`
Expected: FAIL（daily 路由不存在，返回 404 而非 200）。

- [ ] **Step 3: 实现 daily 路由**

在 `src/routes/pages.ts` 顶部 import 区追加：

```ts
import { DAILY_ARCHIVE_META, dailyArchive, findDailyPost } from "../pages/daily";
import { renderDailyArchive, renderDailyPost } from "../layout/render";
```

在文件中现有的 `/:lang/:slug/` 内容页路由（第 47 行）**之前**，插入 daily 路由（daily 是三段路径，必须比两段的 `/:lang/:slug` 更具体，但 Hono 按定义顺序匹配静态段，需显式声明）。在 `// 内容页` 注释前插入：

```ts
// /zh/daily → 301 补尾斜杠（无尾斜杠归档页）
pages.get("/:lang/daily", (c) => {
  const lang = c.req.param("lang");
  if (!isLang(lang)) return c.notFound();
  return c.redirect(pagePath(lang, "daily"), 301);
});

// /zh/daily/ → 归档页
pages.get("/:lang/daily/", (c) => {
  const lang = c.req.param("lang");
  if (!isLang(lang)) return c.notFound();
  return c.html(renderDailyArchive(dailyArchive(), lang));
});

// /zh/daily/2026-08-03 → 301 补尾斜杠
pages.get("/:lang/daily/:date", (c) => {
  const lang = c.req.param("lang");
  const date = c.req.param("date");
  if (!isLang(lang)) return c.notFound();
  return c.redirect(pagePath(lang, `daily/${date}`), 301);
});

// /zh/daily/2026-08-03/ → 单篇
pages.get("/:lang/daily/:date/", (c) => {
  const lang = c.req.param("lang");
  const date = c.req.param("date");
  if (!isLang(lang)) return c.notFound();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return c.notFound();
  const post = findDailyPost(date);
  if (!post) return c.notFound();
  return c.html(renderDailyPost(post, lang));
});
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/integration.test.ts`
Expected: PASS。

- [ ] **Step 5: typecheck**

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add daily archive and post routes"
```

---

### Task 7: 导航与页脚接入 daily

让用户能从主导航和页脚进入 daily 栏目。

**Files:**
- Modify: `src/layout/nav.ts`
- Modify: `src/layout/footer.ts`
- Modify: `test/render.test.ts`

- [ ] **Step 1: nav.ts 追加 daily 入口**

`src/layout/nav.ts`。在 import 区追加：

```ts
import { DAILY_ARCHIVE_META } from "../pages/daily";
```

修改 `renderNav` 函数体。当前 `links` 只遍历 `navPages()`，需在其后追加 daily 链接。找到：

```ts
  const links = navPages()
    .map((p) => {
      const active = p.slug === currentSlug ? ' class="active" aria-current="page"' : "";
      return `<a href="${pagePath(lang, p.slug)}"${active}>${escapeHtml(p.meta[lang].title)}</a>`;
    })
    .join("\n        ");
```

替换为：

```ts
  const navItems = navPages().map((p) => ({
    slug: p.slug,
    title: p.meta[lang].title,
  }));
  navItems.push({ slug: DAILY_ARCHIVE_META.slug, title: DAILY_ARCHIVE_META.title[lang] });
  const links = navItems
    .map((item) => {
      const active = item.slug === currentSlug ? ' class="active" aria-current="page"' : "";
      return `<a href="${pagePath(lang, item.slug)}"${active}>${escapeHtml(item.title)}</a>`;
    })
    .join("\n        ");
```

- [ ] **Step 2: footer.ts 把 daily 接回「关于」列**

`src/layout/footer.ts`。Task 1 暂时把 aboutLinks 改成了 `[""]`，现在补回 daily。

顶部 import 区追加：

```ts
import { DAILY_ARCHIVE_META } from "../pages/daily";
```

修改 aboutLinks 构建逻辑。现有（Task 1 后）：

```ts
  const aboutLinks = [""]
    .map((slug) => `<a href="${pagePath(lang, slug)}">${title(slug)}</a>`)
    .join("\n          ");
```

替换为：

```ts
  const homeLink = `<a href="${pagePath(lang, "")}">${title("")}</a>`;
  const dailyLink = `<a href="${pagePath(lang, DAILY_ARCHIVE_META.slug)}">${escapeHtml(DAILY_ARCHIVE_META.title[lang])}</a>`;
  const aboutLinks = [homeLink, dailyLink].join("\n          ");
```

注意：`title()` 函数内部用 `findPage(slug)!`，daily 不在 registry 所以不能用 `title("daily")`。daily 链接单独用 `DAILY_ARCHIVE_META` 构建，避开 `findPage`。

- [ ] **Step 3: render.test.ts 补 daily 导航断言**

在 `test/render.test.ts` 的 `renders nav with links` 测试（第 17–21 行）追加 daily 断言。找到：

```ts
  it("renders nav with links to all nav pages and highlights current", () => {
    expect(html).toContain('href="/zh/"');
    expect(html).toContain('href="/zh/bazi/"');
    expect(html).toContain('aria-current="page"');
  });
```

在 `bazi` 断言后加一行：

```ts
    expect(html).toContain('href="/zh/daily/"');
```

在 `renders multi-column footer` 测试（第 35 行起）的 zh 断言中追加：

```ts
    expect(html).toContain('href="/zh/daily/"');
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/render.test.ts`
Expected: PASS。

- [ ] **Step 5: 全量测试**

Run: `npm test`
Expected: 全部通过。

- [ ] **Step 6: typecheck**

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add daily entry to nav and footer"
```

---

### Task 8: sitemap 纳入 daily

让搜索引擎发现 daily 页面。

**Files:**
- Modify: `src/seo/sitemap.ts`
- Modify: `test/sitemap.test.ts`

- [ ] **Step 1: 写测试（先失败）**

在 `test/sitemap.test.ts` 的 `lists every page in both languages` 测试末尾追加 daily 归档页断言：

```ts
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/zh/daily/</loc>`);
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/en/daily/</loc>`);
```

新增一个测试块（放在 `does not list the 404 page` 之后）：

```ts
  it("includes daily posts with bilingual alternates", () => {
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/zh/daily/2026-08-03/</loc>`);
    expect(xml).toContain(`<xhtml:link rel="alternate" hreflang="zh-CN" href="${SITE_ORIGIN}/zh/daily/2026-08-03/"/>`);
    expect(xml).toContain(`<xhtml:link rel="alternate" hreflang="en" href="${SITE_ORIGIN}/en/daily/2026-08-03/"/>`);
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/sitemap.test.ts`
Expected: FAIL（daily 未在 sitemap）。

- [ ] **Step 3: 实现 sitemap 改造**

`src/seo/sitemap.ts`。顶部 import 区追加：

```ts
import { DAILY_POSTS } from "../pages/daily";
```

改造 `buildSitemapXml`。把 `PAGES.flatMap(...)` 的结果与 daily 的 URL 合并。现有函数体替换为：

```ts
export function buildSitemapXml(): string {
  const pageUrls = PAGES.flatMap((page) =>
    LANGS.map((lang) => ({ lang, slug: page.slug })),
  );

  const dailyArchiveUrls = LANGS.map((lang) => ({ lang, slug: "daily" }));

  const dailyPostUrls = DAILY_POSTS.flatMap((post) =>
    LANGS.map((lang) => ({ lang, slug: `daily/${post.date}` })),
  );

  const allUrls = [...pageUrls, ...dailyArchiveUrls, ...dailyPostUrls];

  const urls = allUrls
    .map(({ lang, slug }) => {
      const alternates = LANGS.map(
        (l) =>
          `    <xhtml:link rel="alternate" hreflang="${HREFLANG_CODE[l]}" href="${absoluteUrl(pagePath(l, slug))}"/>`,
      ).join("\n");
      return `  <url>\n    <loc>${absoluteUrl(pagePath(lang, slug))}</loc>\n${alternates}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/sitemap.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: include daily pages in sitemap"
```

---

### Task 9: 生成期工具 scripts/almanac.ts

让每日内容生成的历法数据可复核、不依赖 AI 推算。这是每日工作流的基础设施。

**Files:**
- Modify: `package.json`
- Create: `scripts/almanac.ts`

- [ ] **Step 1: 安装 devDependencies**

Run: `npm install --save-dev lunar-javascript tsx`
Expected: 安装成功，package.json devDependencies 出现这两个包。

- [ ] **Step 2: package.json 加 almanac 脚本**

在 `scripts` 对象的 `"purge"` 后追加：

```json
,
    "almanac": "tsx scripts/almanac.ts"
```

- [ ] **Step 3: 实现 scripts/almanac.ts**

```ts
/* eslint-disable */
// 生成期工具：计算指定日期的黄历宜忌数据，输出结构化 JSON。
// 仅在本地 Node 运行，不入 Worker 运行时。
import { Solar } from "lunar-javascript";

/** 建除十二神 → 宜/忌 查表（传统黄历映射，受控常量） */
const ZHISHEN_YIJI: Record<string, { yi: string[]; ji: string[] }> = {
  建: { yi: ["谒贵", "出行", "入学", "上任"], ji: ["动土", "破土", "开仓"] },
  除: { yi: ["祭祀", "解除", "沐浴", "求医"], ji: ["嫁娶", "求嗣"] },
  满: { yi: ["祭祀", "祈福", "进人口", "捕捉"], ji: ["安葬", "移徙"] },
  平: { yi: ["修造", "动土", "治病"], ji: ["祭祀", "祈福", "求嗣"] },
  定: { yi: ["祭祀", "祈福", "冠笄", "嫁娶", "纳采"], ji: ["诉讼", "出行", "词讼"] },
  执: { yi: ["捕捉", "畋猎", "祭祀"], ji: ["开市", "立券", "出货"] },
  破: { yi: ["求医疗病", "破屋坏垣"], ji: ["嫁娶", "开市", "立券", "出行", "安葬"] },
  危: { yi: ["祭祀", "祈福", "安床", "入殓"], ji: ["登山", "乘船", "出行"] },
  成: { yi: ["祭祀", "祈福", "开市", "立券", "交易", "入学", "赴任", "嫁娶", "移徙", "入宅"], ji: ["诉讼", "词讼", "出行", "安葬"] },
  收: { yi: ["祭祀", "进人口", "纳财", "纳畜", "捕捉"], ji: ["出行", "安葬", "破土", "开市", "立券"] },
  开: { yi: ["祭祀", "祈福", "求嗣", "赴任", "出行", "入学", "嫁娶", "移徙", "入宅", "修造"], ji: ["安葬", "破土", "伐木"] },
  闭: { yi: ["筑堤", "塞穴", "安葬"], ji: ["开市", "立券", "出行", "嫁娶", "移徙", "求医", "动土", "祈福"] },
};

/** 地支 → 生肖 */
const ZHI_TO_ZODIAC: Record<string, string> = {
  子: "鼠", 丑: "牛", 寅: "虎", 卯: "兔", 辰: "龙", 巳: "蛇",
  午: "马", 未: "羊", 申: "猴", 酉: "鸡", 戌: "狗", 亥: "猪",
};

/** 地支相冲 → 被冲生肖（子午相冲、丑未相冲…） */
const ZHI_CHONG: Record<string, string> = {
  子: "午", 丑: "未", 寅: "申", 卯: "酉", 辰: "戌", 巳: "亥",
  午: "子", 未: "丑", 申: "寅", 酉: "卯", 戌: "辰", 亥: "巳",
};

/** 天干 → 五行 */
const GAN_WUXING: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

function compute(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const solar = Solar.fromYmd(y, m, d);
  const lunar = solar.getLunar();
  const dayGanZhi = lunar.getDayGanZhi();
  const dayGan = dayGanZhi[0];
  const dayZhi = dayGanZhi[1];
  const riZhi = dayZhi; // 当日地支
  const zhiShen = lunar.getDayZhiShen(); // 建除十二神
  const wuxing = GAN_WUXING[dayGan] ?? "?";
  const chongZhi = ZHI_CHONG[dayZhi] ?? "?";
  const chongZodiac = ZHI_TO_ZODIAC[chongZhi] ?? "?";
  const zodiac = ZHI_TO_ZODIAC[dayZhi] ?? "?";
  const yiji = ZHISHEN_YIJI[zhiShen] ?? { yi: [], ji: [] };

  return {
    solar: `${y}年${m}月${d}日`,
    lunar: lunar.toString(),
    dayGanZhi,
    dayGan,
    dayZhi,
    zodiac,
    zhiShen,
    wuxing,
    chongZhi,
    chongZodiac,
    yi: yiji.yi,
    ji: yiji.ji,
  };
}

const arg = process.argv[2];
const today = new Date();
const dateStr = arg ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
  console.error(`Invalid date: ${dateStr} (expected YYYY-MM-DD)`);
  process.exit(1);
}

const result = compute(dateStr);
console.log(JSON.stringify(result, null, 2));
```

- [ ] **Step 4: 验证脚本运行**

Run: `npm run almanac -- 2026-08-03`
Expected: 输出 JSON，包含 `solar`、`lunar`、`dayGanZhi`、`zodiac`、`zhiShen`、`wuxing`、`chongZodiac`、`yi`、`ji` 等字段。

- [ ] **Step 5: typecheck（almanac 脚本）**

Run: `npx tsc --noEmit scripts/almanac.ts`
Expected: 无错误（tsconfig 不包含 scripts 目录则用 --noEmit 单独检查；若有 tsconfig 报错，确认 scripts 不在 exclude 中）。

注意：如果项目 tsconfig.json 的 `include` 不含 `scripts/`，需确认 tsx 能直接运行。tsx 不依赖 tsc，运行时直接转译。typecheck 覆盖范围以 `npm run typecheck`（即 `tsc --noEmit`）为准，如 scripts 不在 include 中则不影响 CI。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add almanac generation script"
```

---

### Task 10: 填充首篇正式内容

把 Task 2 的占位 fixture 替换为正式的三段式内容（基于 `npm run almanac -- 2026-08-03` 的输出撰写）。

**Files:**
- Modify: `src/content/daily/2026-08-03.zh.html`
- Modify: `src/content/daily/2026-08-03.en.html`
- Modify: `src/pages/daily.ts`（更新 meta title/description）

- [ ] **Step 1: 运行 almanac 获取当日数据**

Run: `npm run almanac -- 2026-08-03`
Expected: 记录输出的 JSON（dayGanZhi、zodiac、zhiShen、wuxing、chongZodiac、yi、ji）。

- [ ] **Step 2: 撰写中文正文**

根据 almanac JSON 输出，替换 `src/content/daily/2026-08-03.zh.html` 全文。结构：

```html
<section class="daily-almanac">
  <h2>今日宜忌</h2>
  <p class="daily-date">{solar}（农历{lunar}）</p>
  <p>日柱：<strong>{dayGanZhi}</strong>　五行：<strong>{wuxing}</strong>　建除：<strong>{zhiShen}</strong></p>
  <p>冲煞：冲{chongZodiac}</p>
  <div class="daily-yiji">
    <p>宜：{yi 列表，顿号分隔}</p>
    <p>忌：{ji 列表，顿号分隔}</p>
  </div>
  <p class="daily-interpretation">{2–4 句解读：解释今日整体基调与宜忌由来}</p>
</section>
<section class="daily-zodiac">
  <h2>生肖运势 · {zodiac}</h2>
  <p>{一段详细运势，围绕当日地支生肖}</p>
  <p class="daily-zodiac-others">其他生肖的运势，我们后续开放留言问答。</p>
</section>
<section class="daily-story">
  <h2>玄学科普</h2>
  <p>{围绕当日主题的科普/典故一段}</p>
</section>
```

`{...}` 占位用实际数据与文案替换。解读段、运势段、科普段由人工/作者撰写。

- [ ] **Step 3: 撰写英文正文**

`src/content/daily/2026-08-03.en.html`，DOM 结构与中文一致，文案对应翻译。生肖/干支术语保留汉字+拼音或英文意译（与 bazi 页风格一致）。

- [ ] **Step 4: 更新 daily.ts 的 meta**

`src/pages/daily.ts` 中首篇的 meta，title/description 改为正式文案（含具体日期与生肖主角）：

```ts
    meta: {
      zh: { title: "2026年8月3日宜忌·{生肖}", description: "{solar}今日黄历宜忌、{生肖}运势与玄学科普。" },
      en: { title: "Daily Almanac — August 3, 2026 ({Zodiac})", description: "..." },
    },
```

- [ ] **Step 5: 全量测试**

Run: `npm test`
Expected: 全部通过。

- [ ] **Step 6: typecheck**

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: write first daily article for 2026-08-03"
```

---

### Task 11: 最终全量验证

确保所有改动协同工作、无回归。

**Files:** 无（仅验证）

- [ ] **Step 1: 全量测试**

Run: `npm test`
Expected: 全部通过（130+ 测试含新增 daily 测试，Windows miniflare EBUSY 警告属无害噪音）。

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 3: 本地 dev 手工验证**

Run: `npm run dev`
然后浏览器访问：
- `http://localhost:8787/zh/daily/` → 归档页，列出首篇文章
- `http://localhost:8787/zh/daily/2026-08-03/` → 单篇，三段内容齐全
- `http://localhost:8787/en/daily/2026-08-03/` → 英文单篇
- `http://localhost:8787/zh/daily/2099-01-01/` → 404
- 主导航和页脚都能看到「今日宜忌」入口

- [ ] **Step 4: 验证 almanac 工具**

Run: `npm run almanac`
Expected: 输出当天日期的历法 JSON。

- [ ] **Step 5: 最终 Commit（如有遗漏修复）**

```bash
git add -A
git commit -m "test: final verification for daily content feature"
```
