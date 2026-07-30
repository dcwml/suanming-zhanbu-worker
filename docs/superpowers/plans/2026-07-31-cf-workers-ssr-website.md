# Cloudflare Workers SSR 网站基础框架 · 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建一个运行于 Cloudflare Workers 的中英双语 SSR 网站框架，页面正文为仓库内 HTML 片段，运行时由统一布局渲染并自动生成完整 SEO 元素，预留 /api/* 接口，通过 GitHub + Workers Builds 部署。

**Architecture:** Hono 作为路由框架；页面注册表（registry）集中声明每个页面的 slug、双语 meta 与正文片段引用；`renderPage()` 统一拼装 head（全部 SEO 标签 + JSON-LD）、导航、正文、页脚；静态资源经 Workers static assets 由边缘服务。设计文档：`docs/superpowers/specs/2026-07-31-cf-workers-ssr-website-design.md`。

**Tech Stack:** TypeScript, Hono v4, wrangler v4, vitest v3 + @cloudflare/vitest-pool-workers, Workers static assets。

**环境说明：** Windows PowerShell，命令分隔用 `;` 而非 `&&`。

**与设计文档的一处微调：** 静态资源目录使用根目录 `public/`（文件位于 `public/assets/` 下，URL 为 `/assets/*`），替代设计稿中的 `src/static/`，职责更清晰。

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `package.json` / `tsconfig.json` / `wrangler.jsonc` / `vitest.config.ts` / `.gitignore` | 工程配置 |
| `src/html.d.ts` | `*.html` 文本模块的 TS 声明 |
| `src/config/site.ts` | 站点常量（占位域名、站名、语言表）+ 路径工具函数 |
| `src/seo/jsonld.ts` | JSON-LD 对象构建与 `<script>` 序列化（防注入转义） |
| `src/seo/meta.ts` | escapeHtml、title、`<head>` 全部标签生成（canonical/hreflang/og/twitter） |
| `src/seo/sitemap.ts` | sitemap.xml / robots.txt 生成 |
| `src/pages/registry.ts` | 页面类型定义 + 页面注册表 + 404 正文 |
| `src/content/*.html` | 6 个正文片段（home/sample/notfound × zh/en） |
| `src/layout/nav.ts` / `footer.ts` / `render.ts` | 导航（含语言切换）、页脚、整页渲染 |
| `src/routes/pages.ts` | 页面路由、301 规范化、sitemap/robots 挂载 |
| `src/routes/api.ts` | `/api/*` JSON 接口（echo 示例 + JSON 404/500） |
| `src/index.ts` | Worker 入口，组合路由 + HTML 404/500 |
| `public/assets/style.css` / `public/assets/og-default.png` | 静态资源 |
| `test/*.test.ts` | 单测 + SELF.fetch 集成测试 |
| `README.md` | 开发/加页/部署/上线清单 |

---

## Task 1: 工程脚手架

**Files:**
- Create: `package.json`, `tsconfig.json`, `wrangler.jsonc`, `vitest.config.ts`, `.gitignore`, `src/html.d.ts`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "suanming-zhanbu-workers",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "hono": "^4.6.0"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.9.0",
    "@cloudflare/workers-types": "^4.20250601.0",
    "typescript": "^5.6.0",
    "vitest": "^3.2.0",
    "wrangler": "^4.0.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types", "@cloudflare/vitest-pool-workers"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src", "test", "vitest.config.ts"]
}
```

- [ ] **Step 3: 创建 wrangler.jsonc**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "suanming-zhanbu",
  "main": "src/index.ts",
  "compatibility_date": "2025-06-01",
  "assets": {
    "directory": "./public"
  },
  "rules": [
    { "type": "Text", "include": ["**/*.html"] }
  ]
}
```

说明：`assets` 不配置 binding，未命中资产的请求自动落入 Worker；`public/assets/style.css` 对应 URL `/assets/style.css`。

- [ ] **Step 4: 创建 vitest.config.ts**

```ts
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.jsonc" },
      },
    },
  },
});
```

- [ ] **Step 5: 创建 .gitignore**

```
node_modules/
.wrangler/
.dev.vars
dist/
```

- [ ] **Step 6: 创建 src/html.d.ts**

```ts
declare module "*.html" {
  const content: string;
  export default content;
}
```

- [ ] **Step 7: 安装依赖**

Run: `npm install`
Expected: 成功生成 `package-lock.json` 与 `node_modules/`，无 ERR 输出。

- [ ] **Step 8: 验证 wrangler 可用**

Run: `npx wrangler --version`
Expected: 输出 wrangler 版本号（4.x）。

- [ ] **Step 9: Commit**

```powershell
git add package.json package-lock.json tsconfig.json wrangler.jsonc vitest.config.ts .gitignore src/html.d.ts
git commit -m "chore: scaffold workers project (hono + ts + vitest pool)"
```

---

## Task 2: 站点配置与路径工具（TDD）

**Files:**
- Create: `src/config/site.ts`
- Test: `test/site.test.ts`

- [ ] **Step 1: 写失败测试 test/site.test.ts**

```ts
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
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/site.test.ts`
Expected: FAIL，报错找不到 `../src/config/site` 模块。

- [ ] **Step 3: 实现 src/config/site.ts**

```ts
export type Lang = "zh" | "en";

/** 站点源（上线前改这一处即可全站生效） */
export const SITE_ORIGIN = "https://example.com";

export const SITE_NAME = "玄命阁";
export const SITE_NAME_EN = "Xuanming Pavilion";
export const SITE_SLOGAN = "命理 · 占卜 · 传统文化";
export const SITE_SLOGAN_EN = "Fortune · Divination · Tradition";

export const DEFAULT_LANG: Lang = "zh";
export const LANGS: readonly Lang[] = ["zh", "en"];
export const OTHER_LANG: Record<Lang, Lang> = { zh: "en", en: "zh" };
export const HREFLANG_CODE: Record<Lang, string> = { zh: "zh-CN", en: "en" };
export const OG_LOCALE: Record<Lang, string> = { zh: "zh_CN", en: "en_US" };
export const HTML_LANG: Record<Lang, string> = { zh: "zh-CN", en: "en" };

/** 页面规范路径：首页 /zh/，内容页 /zh/sample/ */
export function pagePath(lang: Lang, slug: string): string {
  return slug === "" ? `/${lang}/` : `/${lang}/${slug}/`;
}

export function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path}`;
}

/** 从 URL 路径推断语言，无 /en 前缀一律返回默认语言 */
export function langFromPath(path: string): Lang {
  return path === "/en" || path.startsWith("/en/") ? "en" : DEFAULT_LANG;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/site.test.ts`
Expected: PASS（6 个断言全绿）。

- [ ] **Step 5: Commit**

```powershell
git add src/config/site.ts test/site.test.ts
git commit -m "feat: site config with lang/path helpers"
```

---

## Task 3: JSON-LD 生成（TDD）

**Files:**
- Create: `src/seo/jsonld.ts`
- Test: `test/jsonld.test.ts`

- [ ] **Step 1: 写失败测试 test/jsonld.test.ts**

```ts
import { describe, expect, it } from "vitest";
import type { PageEntry } from "../src/pages/registry";
import {
  buildJsonLdScripts,
  breadcrumbJsonLd,
  pageJsonLd,
  toJsonLdScript,
  websiteJsonLd,
} from "../src/seo/jsonld";

const home: PageEntry = {
  slug: "",
  inNav: true,
  meta: {
    zh: { title: "首页", description: "首页描述" },
    en: { title: "Home", description: "Home description" },
  },
  content: { zh: "<p>zh</p>", en: "<p>en</p>" },
};

const article: PageEntry = {
  slug: "sample",
  inNav: true,
  jsonldType: "Article",
  meta: {
    zh: { title: "示例文章", description: "文章描述" },
    en: { title: "Sample", description: "Article description" },
  },
  content: { zh: "<p>zh</p>", en: "<p>en</p>" },
};

describe("toJsonLdScript", () => {
  it("neutralizes </script> injection", () => {
    const s = toJsonLdScript({ evil: "</script><script>alert(1)</script>" });
    expect(s.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(s).not.toContain("</script><script>");
    expect(s).toContain("\\u003c");
  });
});

describe("websiteJsonLd", () => {
  it("describes the site", () => {
    const d = websiteJsonLd() as Record<string, unknown>;
    expect(d["@type"]).toBe("WebSite");
    expect(d.url).toBe("https://example.com/");
  });
});

describe("pageJsonLd", () => {
  it("defaults to WebPage and uses registry type when set", () => {
    expect((pageJsonLd(home, "zh") as Record<string, unknown>)["@type"]).toBe("WebPage");
    expect((pageJsonLd(article, "en") as Record<string, unknown>)["@type"]).toBe("Article");
  });
  it("carries url and inLanguage", () => {
    const d = pageJsonLd(article, "zh") as Record<string, unknown>;
    expect(d.url).toBe("https://example.com/zh/sample/");
    expect(d.inLanguage).toBe("zh-CN");
  });
});

describe("breadcrumbJsonLd", () => {
  it("home has one crumb, content page has two", () => {
    const homeItems = (breadcrumbJsonLd(home, "zh") as { itemListElement: unknown[] }).itemListElement;
    const articleItems = (breadcrumbJsonLd(article, "en") as { itemListElement: unknown[] }).itemListElement;
    expect(homeItems).toHaveLength(1);
    expect(articleItems).toHaveLength(2);
  });
});

describe("buildJsonLdScripts", () => {
  it("home includes WebSite script", () => {
    expect(buildJsonLdScripts(home, "zh")).toContain('"WebSite"');
  });
  it("non-home excludes WebSite script", () => {
    expect(buildJsonLdScripts(article, "zh")).not.toContain('"WebSite"');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/jsonld.test.ts`
Expected: FAIL，找不到 `../src/seo/jsonld`。

- [ ] **Step 3: 先创建 src/pages/registry.ts 的类型桩（供测试 import type 使用）**

创建 `src/pages/registry.ts`（仅类型，注册表数据在 Task 5 补全）：

```ts
import type { Lang } from "../config/site";

export interface PageMeta {
  title: string;
  description: string;
}

export interface PageEntry {
  /** URL 段；"" 表示首页 */
  slug: string;
  /** 是否出现在顶部导航 */
  inNav: boolean;
  /** JSON-LD @type，默认 WebPage */
  jsonldType?: "Article" | "FAQPage";
  meta: Record<Lang, PageMeta>;
  content: Record<Lang, string>;
}
```

- [ ] **Step 4: 实现 src/seo/jsonld.ts**

```ts
import type { PageEntry } from "../pages/registry";
import {
  HREFLANG_CODE,
  SITE_NAME,
  SITE_NAME_EN,
  absoluteUrl,
  pagePath,
  type Lang,
} from "../config/site";

interface BreadcrumbItem {
  "@type": "ListItem";
  position: number;
  name: string;
  item: string;
}

/** 序列化为 JSON-LD script 标签；转义所有 "<" 防止 </script> 注入 */
export function toJsonLdScript(data: object): string {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

export function websiteJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: SITE_NAME_EN,
    url: absoluteUrl("/"),
    inLanguage: ["zh-CN", "en"],
  };
}

export function pageJsonLd(page: PageEntry, lang: Lang): object {
  return {
    "@context": "https://schema.org",
    "@type": page.jsonldType ?? "WebPage",
    name: page.meta[lang].title,
    description: page.meta[lang].description,
    url: absoluteUrl(pagePath(lang, page.slug)),
    inLanguage: HREFLANG_CODE[lang],
  };
}

export function breadcrumbJsonLd(page: PageEntry, lang: Lang): object {
  const items: BreadcrumbItem[] = [
    {
      "@type": "ListItem",
      position: 1,
      name: lang === "zh" ? "首页" : "Home",
      item: absoluteUrl(pagePath(lang, "")),
    },
  ];
  if (page.slug !== "") {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: page.meta[lang].title,
      item: absoluteUrl(pagePath(lang, page.slug)),
    });
  }
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

export function buildJsonLdScripts(page: PageEntry, lang: Lang): string {
  const scripts: object[] = [pageJsonLd(page, lang), breadcrumbJsonLd(page, lang)];
  if (page.slug === "") {
    scripts.unshift(websiteJsonLd());
  }
  return scripts.map(toJsonLdScript).join("\n    ");
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npx vitest run test/jsonld.test.ts`
Expected: PASS。

- [ ] **Step 6: Commit**

```powershell
git add src/seo/jsonld.ts src/pages/registry.ts test/jsonld.test.ts
git commit -m "feat: json-ld generation with script-injection escaping"
```

---

## Task 4: head 元标签生成（TDD）

**Files:**
- Create: `src/seo/meta.ts`
- Test: `test/meta.test.ts`

- [ ] **Step 1: 写失败测试 test/meta.test.ts**

```ts
import { describe, expect, it } from "vitest";
import type { PageEntry } from "../src/pages/registry";
import { buildHead, buildPlainHead, escapeHtml } from "../src/seo/meta";

const fixture: PageEntry = {
  slug: "sample",
  inNav: true,
  meta: {
    zh: { title: '测试页 <"&>', description: "描述" },
    en: { title: "Test Page", description: "Description" },
  },
  content: { zh: "<p>zh</p>", en: "<p>en</p>" },
};

const home: PageEntry = {
  slug: "",
  inNav: true,
  meta: {
    zh: { title: "首页", description: "首页描述" },
    en: { title: "Home", description: "Home description" },
  },
  content: { zh: "<p>zh</p>", en: "<p>en</p>" },
};

describe("escapeHtml", () => {
  it("escapes the five special characters", () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
  });
});

describe("buildHead", () => {
  const head = buildHead(fixture, "zh");

  it("emits title with site suffix and escaping", () => {
    expect(head).toContain("<title>测试页 &lt;&quot;&amp;&gt; - 玄命阁</title>");
  });
  it("emits description", () => {
    expect(head).toContain('<meta name="description" content="描述">');
  });
  it("emits canonical", () => {
    expect(head).toContain('<link rel="canonical" href="https://example.com/zh/sample/">');
  });
  it("emits hreflang zh-CN, en and x-default pointing to zh", () => {
    expect(head).toContain('hreflang="zh-CN" href="https://example.com/zh/sample/"');
    expect(head).toContain('hreflang="en" href="https://example.com/en/sample/"');
    expect(head).toContain('hreflang="x-default" href="https://example.com/zh/sample/"');
  });
  it("emits og tags", () => {
    expect(head).toContain('<meta property="og:type" content="article">');
    expect(head).toContain('<meta property="og:url" content="https://example.com/zh/sample/">');
    expect(head).toContain('<meta property="og:image" content="https://example.com/assets/og-default.png">');
    expect(head).toContain('<meta property="og:locale" content="zh_CN">');
    expect(head).toContain('<meta property="og:locale:alternate" content="en_US">');
  });
  it("emits twitter tags", () => {
    expect(head).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(head).toContain('<meta name="twitter:image"');
  });
  it("embeds json-ld", () => {
    expect(head).toContain('application/ld+json');
  });
  it("home uses website og:type and slogan title", () => {
    const homeHead = buildHead(home, "zh");
    expect(homeHead).toContain('<meta property="og:type" content="website">');
    expect(homeHead).toContain("玄命阁 - 命理 · 占卜 · 传统文化");
  });
});

describe("buildPlainHead", () => {
  it("is noindex and carries given title", () => {
    const head = buildPlainHead("en", "Page Not Found");
    expect(head).toContain('<meta name="robots" content="noindex">');
    expect(head).toContain("<title>Page Not Found</title>");
    expect(head).not.toContain("canonical");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/meta.test.ts`
Expected: FAIL，找不到 `../src/seo/meta`。

- [ ] **Step 3: 实现 src/seo/meta.ts**

```ts
import type { PageEntry } from "../pages/registry";
import {
  HREFLANG_CODE,
  LANGS,
  OG_LOCALE,
  SITE_NAME,
  SITE_NAME_EN,
  SITE_SLOGAN,
  SITE_SLOGAN_EN,
  absoluteUrl,
  pagePath,
  type Lang,
} from "../config/site";
import { buildJsonLdScripts } from "./jsonld";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function siteName(lang: Lang): string {
  return lang === "zh" ? SITE_NAME : SITE_NAME_EN;
}

export function pageTitle(page: PageEntry, lang: Lang): string {
  if (page.slug === "") {
    return lang === "zh" ? `${SITE_NAME} - ${SITE_SLOGAN}` : `${SITE_NAME_EN} - ${SITE_SLOGAN_EN}`;
  }
  return `${page.meta[lang].title} - ${siteName(lang)}`;
}

/** 生成 <head> 内全部标签（含 JSON-LD），不含 <head> 本身 */
export function buildHead(page: PageEntry, lang: Lang): string {
  const meta = page.meta[lang];
  const canonical = absoluteUrl(pagePath(lang, page.slug));
  const title = escapeHtml(pageTitle(page, lang));
  const description = escapeHtml(meta.description);
  const image = absoluteUrl("/assets/og-default.png");
  const otherLang = LANGS.find((l) => l !== lang)!;

  const hreflangs = LANGS.map(
    (l) =>
      `<link rel="alternate" hreflang="${HREFLANG_CODE[l]}" href="${absoluteUrl(pagePath(l, page.slug))}">`,
  ).join("\n    ");
  const xDefault = `<link rel="alternate" hreflang="x-default" href="${absoluteUrl(pagePath("zh", page.slug))}">`;

  return [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${canonical}">`,
    hreflangs,
    xDefault,
    `<meta property="og:type" content="${page.slug === "" ? "website" : "article"}">`,
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
    buildJsonLdScripts(page, lang),
  ].join("\n    ");
}

/** 404/500 用的极简 head：noindex，无 canonical/og */
export function buildPlainHead(lang: Lang, titleText: string): string {
  void lang;
  return [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<meta name="robots" content="noindex">`,
    `<title>${escapeHtml(titleText)}</title>`,
  ].join("\n    ");
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/meta.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```powershell
git add src/seo/meta.ts test/meta.test.ts
git commit -m "feat: head meta generation (canonical/hreflang/og/twitter)"
```

---

## Task 5: 正文片段与页面注册表（TDD）

**Files:**
- Create: `src/content/home.zh.html`, `src/content/home.en.html`, `src/content/sample.zh.html`, `src/content/sample.en.html`, `src/content/notfound.zh.html`, `src/content/notfound.en.html`
- Modify: `src/pages/registry.ts`（补全注册表数据）
- Test: `test/registry.test.ts`

- [ ] **Step 1: 写失败测试 test/registry.test.ts**

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/registry.test.ts`
Expected: FAIL（registry 尚未导出 PAGES 等）。

- [ ] **Step 3: 创建 6 个正文片段**

`src/content/home.zh.html`：

```html
<h1>探索命理与占卜的世界</h1>
<p class="lead">欢迎来到玄命阁。我们以传统文化中的命理与占卜智慧，为你提供参考与启发。</p>
<section>
  <h2>栏目一览</h2>
  <ul>
    <li><strong>八字命理</strong>：从出生时间解读命运脉络。</li>
    <li><strong>塔罗占卜</strong>：以牌面映照当下与趋势。</li>
    <li><strong>文化专栏</strong>：传统术数知识入门。</li>
  </ul>
</section>
```

`src/content/home.en.html`：

```html
<h1>Explore Fortune-Telling &amp; Divination</h1>
<p class="lead">Welcome to Xuanming Pavilion. We draw on traditional Chinese fortune-telling and divination for insight and inspiration.</p>
<section>
  <h2>What we cover</h2>
  <ul>
    <li><strong>BaZi</strong> — reading destiny from birth time.</li>
    <li><strong>Tarot</strong> — mirroring the present and what lies ahead.</li>
    <li><strong>Culture</strong> — introductions to traditional practices.</li>
  </ul>
</section>
```

`src/content/sample.zh.html`：

```html
<article>
  <h1>示例文章：如何新增一个页面</h1>
  <p>这是一篇示例内容页，用于演示「正文 HTML 片段 + 统一布局」的写作方式。</p>
  <h2>三步新增页面</h2>
  <ol>
    <li>在 <code>src/content/</code> 下新建 <code>xxx.zh.html</code> 与 <code>xxx.en.html</code>，只写正文。</li>
    <li>在 <code>src/pages/registry.ts</code> 中注册该页面（slug、双语 title/description）。</li>
    <li>提交并推送。SEO 标签、sitemap 与导航全部自动生成。</li>
  </ol>
</article>
```

`src/content/sample.en.html`：

```html
<article>
  <h1>Sample Article: How to Add a Page</h1>
  <p>This is a sample content page demonstrating the "body fragment + shared layout" workflow.</p>
  <h2>Three steps to add a page</h2>
  <ol>
    <li>Create <code>xxx.zh.html</code> and <code>xxx.en.html</code> under <code>src/content/</code> — body content only.</li>
    <li>Register the page in <code>src/pages/registry.ts</code> (slug, bilingual title/description).</li>
    <li>Commit and push. SEO tags, sitemap and navigation are generated automatically.</li>
  </ol>
</article>
```

`src/content/notfound.zh.html`：

```html
<h1>404 · 页面未找到</h1>
<p>你访问的页面不存在，可能已被移动或删除。</p>
<p><a href="/zh/">返回首页</a></p>
```

`src/content/notfound.en.html`：

```html
<h1>404 · Page Not Found</h1>
<p>The page you requested does not exist. It may have been moved or removed.</p>
<p><a href="/en/">Back to home</a></p>
```

- [ ] **Step 4: 补全 src/pages/registry.ts**

在 Task 3 的类型之后追加（完整文件 = 类型 + 以下内容）：

```ts
import homeZh from "../content/home.zh.html";
import homeEn from "../content/home.en.html";
import sampleZh from "../content/sample.zh.html";
import sampleEn from "../content/sample.en.html";
import notfoundZh from "../content/notfound.zh.html";
import notfoundEn from "../content/notfound.en.html";

export const PAGES: PageEntry[] = [
  {
    slug: "",
    inNav: true,
    meta: {
      zh: { title: "首页", description: "玄命阁首页：八字命理、塔罗占卜与传统文化专栏。" },
      en: { title: "Home", description: "Xuanming Pavilion: BaZi, tarot and traditional culture." },
    },
    content: { zh: homeZh, en: homeEn },
  },
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
];

export const NOT_FOUND_CONTENT: Record<Lang, string> = {
  zh: notfoundZh,
  en: notfoundEn,
};

export function findPage(slug: string): PageEntry | undefined {
  return PAGES.find((p) => p.slug === slug);
}

export function navPages(): PageEntry[] {
  return PAGES.filter((p) => p.inNav);
}
```

注意：import 语句需移到文件顶部（与 Task 3 的 `import type { Lang }` 合并整理）。

- [ ] **Step 5: 运行测试确认通过**

Run: `npx vitest run test/registry.test.ts`
Expected: PASS。

- [ ] **Step 6: Commit**

```powershell
git add src/content src/pages/registry.ts test/registry.test.ts
git commit -m "feat: page registry with bilingual content fragments"
```

---

## Task 6: sitemap 与 robots（TDD）

**Files:**
- Create: `src/seo/sitemap.ts`
- Test: `test/sitemap.test.ts`

- [ ] **Step 1: 写失败测试 test/sitemap.test.ts**

```ts
import { describe, expect, it } from "vitest";
import { buildRobotsTxt, buildSitemapXml } from "../src/seo/sitemap";

describe("buildSitemapXml", () => {
  const xml = buildSitemapXml();

  it("declares sitemap and xhtml namespaces", () => {
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  });

  it("lists every page in both languages", () => {
    expect(xml).toContain("<loc>https://example.com/zh/</loc>");
    expect(xml).toContain("<loc>https://example.com/en/</loc>");
    expect(xml).toContain("<loc>https://example.com/zh/sample/</loc>");
    expect(xml).toContain("<loc>https://example.com/en/sample/</loc>");
  });

  it("adds xhtml:link alternates per url", () => {
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="zh-CN" href="https://example.com/zh/sample/"/>');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="en" href="https://example.com/en/sample/"/>');
  });

  it("does not list the 404 page", () => {
    expect(xml).not.toContain("404");
  });
});

describe("buildRobotsTxt", () => {
  it("allows crawling, blocks /api/ and points to sitemap", () => {
    const txt = buildRobotsTxt();
    expect(txt).toContain("User-agent: *");
    expect(txt).toContain("Disallow: /api/");
    expect(txt).toContain("Sitemap: https://example.com/sitemap.xml");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/sitemap.test.ts`
Expected: FAIL，找不到 `../src/seo/sitemap`。

- [ ] **Step 3: 实现 src/seo/sitemap.ts**

```ts
import {
  HREFLANG_CODE,
  LANGS,
  absoluteUrl,
  pagePath,
} from "../config/site";
import { PAGES } from "../pages/registry";

export function buildSitemapXml(): string {
  const urls = PAGES.flatMap((page) =>
    LANGS.map((lang) => {
      const alternates = LANGS.map(
        (l) =>
          `    <xhtml:link rel="alternate" hreflang="${HREFLANG_CODE[l]}" href="${absoluteUrl(pagePath(l, page.slug))}"/>`,
      ).join("\n");
      return `  <url>\n    <loc>${absoluteUrl(pagePath(lang, page.slug))}</loc>\n${alternates}\n  </url>`;
    }),
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

export function buildRobotsTxt(): string {
  return `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${absoluteUrl("/sitemap.xml")}
`;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/sitemap.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```powershell
git add src/seo/sitemap.ts test/sitemap.test.ts
git commit -m "feat: sitemap.xml and robots.txt generation"
```

---

## Task 7: 布局层：导航、页脚、整页渲染（TDD）

**Files:**
- Create: `src/layout/nav.ts`, `src/layout/footer.ts`, `src/layout/render.ts`
- Test: `test/render.test.ts`

- [ ] **Step 1: 写失败测试 test/render.test.ts**

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/render.test.ts`
Expected: FAIL，找不到 `../src/layout/render`。

- [ ] **Step 3: 实现 src/layout/nav.ts**

```ts
import { OTHER_LANG, pagePath, type Lang } from "../config/site";
import { navPages } from "../pages/registry";
import { escapeHtml } from "../seo/meta";

/** 顶部导航：链接由注册表生成，含语言切换 */
export function renderNav(lang: Lang, currentSlug: string): string {
  const links = navPages()
    .map((p) => {
      const active = p.slug === currentSlug ? ' class="active" aria-current="page"' : "";
      return `<a href="${pagePath(lang, p.slug)}"${active}>${escapeHtml(p.meta[lang].title)}</a>`;
    })
    .join("\n        ");

  const other = OTHER_LANG[lang];
  const switchLabel = other === "en" ? "English" : "中文";

  return `<nav class="site-nav" aria-label="${lang === "zh" ? "主导航" : "Main navigation"}">
      <div class="nav-links">
        ${links}
      </div>
      <a class="lang-switch" href="${pagePath(other, currentSlug)}">${switchLabel}</a>
    </nav>`;
}
```

- [ ] **Step 4: 实现 src/layout/footer.ts**

```ts
import { SITE_NAME, SITE_NAME_EN, type Lang } from "../config/site";
import { escapeHtml } from "../seo/meta";

export function renderFooter(lang: Lang): string {
  const name = lang === "zh" ? SITE_NAME : SITE_NAME_EN;
  const note = lang === "zh" ? "内容仅供娱乐参考" : "For entertainment purposes only";
  return `<footer class="site-footer">
      <p>© ${new Date().getFullYear()} ${escapeHtml(name)} · ${escapeHtml(note)}</p>
    </footer>`;
}
```

- [ ] **Step 5: 实现 src/layout/render.ts**

```ts
import { HTML_LANG, SITE_NAME, SITE_NAME_EN, type Lang } from "../config/site";
import type { PageEntry } from "../pages/registry";
import { NOT_FOUND_CONTENT } from "../pages/registry";
import { buildHead, buildPlainHead } from "../seo/meta";
import { renderFooter } from "./footer";
import { renderNav } from "./nav";

function layout(lang: Lang, head: string, nav: string, main: string): string {
  return `<!DOCTYPE html>
<html lang="${HTML_LANG[lang]}">
  <head>
    ${head}
    <link rel="stylesheet" href="/assets/style.css">
  </head>
  <body>
    <header class="site-header">
      ${nav}
    </header>
    <main>
${main}
    </main>
    ${renderFooter(lang)}
  </body>
</html>
`;
}

export function renderPage(page: PageEntry, lang: Lang): string {
  return layout(lang, buildHead(page, lang), renderNav(lang, page.slug), page.content[lang]);
}

export function renderNotFound(lang: Lang): string {
  const title = lang === "zh" ? `页面未找到 - ${SITE_NAME}` : `Page Not Found - ${SITE_NAME_EN}`;
  return layout(lang, buildPlainHead(lang, title), renderNav(lang, "__notfound__"), NOT_FOUND_CONTENT[lang]);
}

export function renderError(lang: Lang): string {
  const title = lang === "zh" ? `服务器错误 - ${SITE_NAME}` : `Server Error - ${SITE_NAME_EN}`;
  const body =
    lang === "zh"
      ? "      <h1>服务器错误</h1>\n      <p>请稍后再试。</p>"
      : "      <h1>Server Error</h1>\n      <p>Please try again later.</p>";
  return layout(lang, buildPlainHead(lang, title), renderNav(lang, "__error__"), body);
}
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npx vitest run test/render.test.ts`
Expected: PASS。

- [ ] **Step 7: Commit**

```powershell
git add src/layout test/render.test.ts
git commit -m "feat: shared layout with nav, language switch and footer"
```

---

## Task 8: API 路由（TDD）

**Files:**
- Create: `src/routes/api.ts`
- Test: `test/api.test.ts`

- [ ] **Step 1: 写失败测试 test/api.test.ts**

```ts
import { describe, expect, it } from "vitest";
import { api } from "../src/routes/api";

function req(path: string, init?: RequestInit): Request {
  return new Request(`https://example.com${path}`, init);
}

describe("POST /api/echo", () => {
  it("echoes a valid JSON body inside the ok envelope", async () => {
    const res = await api.fetch(req("/api/echo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hello: "世界" }),
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { echo: { hello: "世界" } } });
  });

  it("rejects invalid JSON with code invalid_json", async () => {
    const res = await api.fetch(req("/api/echo", { method: "POST", body: "not-json" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: { code: string } };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("invalid_json");
  });
});

describe("unknown api routes", () => {
  it("returns a JSON 404, not HTML", async () => {
    const res = await api.fetch(req("/api/nope"));
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = (await res.json()) as { ok: boolean; error: { code: string } };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("not_found");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/api.test.ts`
Expected: FAIL，找不到 `../src/routes/api`。

- [ ] **Step 3: 实现 src/routes/api.ts**

```ts
import { Hono } from "hono";

/**
 * /api/* 预留接口层。
 * 统一响应壳：{ ok: true, data } / { ok: false, error: { code, message } }
 * 未来接入 LLM 时按同样模式新增接口，例如 POST /api/divine。
 */
export const api = new Hono().basePath("/api");

api.post("/echo", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { ok: false, error: { code: "invalid_json", message: "Request body must be valid JSON." } },
      400,
    );
  }
  return c.json({ ok: true, data: { echo: body } });
});

// 兜底：/api/* 未命中一律返回 JSON 404（而非 HTML 404 页）
api.all("*", (c) =>
  c.json(
    { ok: false, error: { code: "not_found", message: `API endpoint not found: ${c.req.path}` } },
    404,
  ),
);

api.onError((_err, c) =>
  c.json({ ok: false, error: { code: "internal_error", message: "Internal Server Error" } }, 500),
);
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/api.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```powershell
git add src/routes/api.ts test/api.test.ts
git commit -m "feat: /api layer with echo endpoint and json error envelope"
```

---

## Task 9: 页面路由 + Worker 入口（TDD 集成测试）

**Files:**
- Create: `src/routes/pages.ts`, `src/index.ts`
- Test: `test/integration.test.ts`

- [ ] **Step 1: 写失败测试 test/integration.test.ts**

```ts
import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

function fetchNoFollow(path: string, init?: RequestInit): Promise<Response> {
  return SELF.fetch(`https://example.com${path}`, { redirect: "manual", ...init });
}

describe("redirects", () => {
  it("redirects / to /zh/", async () => {
    const res = await fetchNoFollow("/");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/zh/");
  });

  it("redirects /zh to /zh/ (trailing slash canonical)", async () => {
    const res = await fetchNoFollow("/zh");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/zh/");
  });

  it("redirects /en/sample to /en/sample/", async () => {
    const res = await fetchNoFollow("/en/sample");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/en/sample/");
  });
});

describe("pages", () => {
  it("renders zh home with full seo head", async () => {
    const res = await fetchNoFollow("/zh/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<html lang="zh-CN">');
    expect(html).toContain('<link rel="canonical" href="https://example.com/zh/">');
    expect(html).toContain('hreflang="x-default"');
    expect(html).toContain('application/ld+json');
  });

  it("renders en sample page", async () => {
    const res = await fetchNoFollow("/en/sample/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<html lang="en"');
    expect(html).toContain("How to Add a Page");
  });

  it("serves sitemap.xml", async () => {
    const res = await fetchNoFollow("/sitemap.xml");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/xml");
    expect(await res.text()).toContain("<urlset");
  });

  it("serves robots.txt", async () => {
    const res = await fetchNoFollow("/robots.txt");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Sitemap:");
  });
});

describe("404 handling", () => {
  it("unknown page returns HTML 404 with noindex", async () => {
    const res = await fetchNoFollow("/zh/nope/");
    expect(res.status).toBe(404);
    const html = await res.text();
    expect(html).toContain("页面未找到");
    expect(html).toContain('content="noindex"');
  });

  it("unknown root path returns 404 in default language", async () => {
    const res = await fetchNoFollow("/whatever/");
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("页面未找到");
  });

  it("unknown /api path returns JSON 404", async () => {
    const res = await fetchNoFollow("/api/nope");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
  });
});

describe("api via worker", () => {
  it("echo works through the full stack", async () => {
    const res = await SELF.fetch("https://example.com/api/echo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a: 1 }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { echo: { a: 1 } } });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/integration.test.ts`
Expected: FAIL（找不到 `../src/routes/pages` / Worker 入口不存在）。

- [ ] **Step 3: 实现 src/routes/pages.ts**

```ts
import { Hono } from "hono";
import { LANGS, pagePath, type Lang } from "../config/site";
import { renderPage } from "../layout/render";
import { findPage } from "../pages/registry";
import { buildRobotsTxt, buildSitemapXml } from "../seo/sitemap";

export const pages = new Hono();

function isLang(v: string): v is Lang {
  return (LANGS as readonly string[]).includes(v);
}

// 根路径 → 默认语言首页
pages.get("/", (c) => c.redirect(pagePath("zh", ""), 301));

pages.get("/sitemap.xml", (c) =>
  c.body(buildSitemapXml(), 200, { "Content-Type": "application/xml; charset=utf-8" }),
);

pages.get("/robots.txt", (c) =>
  c.body(buildRobotsTxt(), 200, { "Content-Type": "text/plain; charset=utf-8" }),
);

// /zh 或 /en → 301 补尾斜杠
pages.get("/:lang", (c) => {
  const lang = c.req.param("lang");
  if (!isLang(lang)) return c.notFound();
  return c.redirect(pagePath(lang, ""), 301);
});

// /zh/sample → 301 补尾斜杠
pages.get("/:lang/:slug", (c) => {
  const lang = c.req.param("lang");
  const slug = c.req.param("slug");
  if (!isLang(lang)) return c.notFound();
  return c.redirect(pagePath(lang, slug), 301);
});

// 首页
pages.get("/:lang/", (c) => {
  const lang = c.req.param("lang");
  if (!isLang(lang)) return c.notFound();
  return c.html(renderPage(findPage("")!, lang));
});

// 内容页
pages.get("/:lang/:slug/", (c) => {
  const lang = c.req.param("lang");
  const slug = c.req.param("slug");
  if (!isLang(lang)) return c.notFound();
  const page = findPage(slug);
  if (!page) return c.notFound();
  return c.html(renderPage(page, lang));
});
```

- [ ] **Step 4: 实现 src/index.ts**

```ts
import { Hono } from "hono";
import { langFromPath } from "./config/site";
import { renderError, renderNotFound } from "./layout/render";
import { api } from "./routes/api";
import { pages } from "./routes/pages";

const app = new Hono();

// api 先挂载：/api/* 未命中时返回 JSON 404，而不是落入页面路由
app.route("/", api);
app.route("/", pages);

app.notFound((c) => c.html(renderNotFound(langFromPath(c.req.path)), 404));

app.onError((_err, c) => c.html(renderError(langFromPath(c.req.path)), 500));

export default app;
```

- [ ] **Step 5: 运行全部测试确认通过**

Run: `npx vitest run`
Expected: PASS（site/jsonld/meta/registry/sitemap/render/api/integration 全绿）。

- [ ] **Step 6: 类型检查**

Run: `npm run typecheck`
Expected: 无错误输出。

- [ ] **Step 7: Commit**

```powershell
git add src/routes/pages.ts src/index.ts test/integration.test.ts
git commit -m "feat: page routing with redirects, sitemap/robots and worker entry"
```

---

## Task 10: 静态资源 + 本地端到端验证

**Files:**
- Create: `public/assets/style.css`, `public/assets/og-default.png`

- [ ] **Step 1: 创建 public/assets/style.css**

```css
:root {
  --fg: #2b2622;
  --muted: #7a7168;
  --accent: #8a3324;
  --bg: #faf7f2;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: "Noto Serif SC", "Songti SC", Georgia, serif;
  color: var(--fg);
  background: var(--bg);
  line-height: 1.75;
}

.site-header {
  border-bottom: 1px solid #e5ddd2;
  background: #fff;
}

.site-nav {
  max-width: 720px;
  margin: 0 auto;
  padding: 0.9rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.nav-links { display: flex; gap: 1.25rem; }

.site-nav a {
  color: var(--fg);
  text-decoration: none;
}

.site-nav a.active { color: var(--accent); font-weight: 600; }

.lang-switch {
  font-size: 0.85rem;
  border: 1px solid #d8cfc2;
  border-radius: 999px;
  padding: 0.15rem 0.7rem;
}

main {
  max-width: 720px;
  margin: 0 auto;
  padding: 2.5rem 1rem 4rem;
}

h1 { font-size: 1.9rem; line-height: 1.35; }
h2 { font-size: 1.35rem; }

.lead { font-size: 1.1rem; color: var(--muted); }

code {
  background: #f0e9df;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.9em;
}

.site-footer {
  border-top: 1px solid #e5ddd2;
  color: var(--muted);
  font-size: 0.85rem;
  text-align: center;
  padding: 1.25rem 1rem;
}
```

- [ ] **Step 2: 生成占位分享图 public/assets/og-default.png（1×1 透明 PNG）**

Run:
```powershell
New-Item -ItemType Directory -Force -Path public\assets | Out-Null
[IO.File]::WriteAllBytes("$PWD\public\assets\og-default.png", [Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="))
```
Expected: 生成约 70 字节的 png 文件。上线前替换为正式 1200×630 分享图。

- [ ] **Step 3: 启动本地开发服务器**

Run: `npm run dev`（后台运行）
Expected: 输出 `Ready on http://localhost:8787`。

- [ ] **Step 4: 端到端验证**

Run（另开终端）:
```powershell
curl.exe -s -o NUL -w "%{http_code} %{redirect_url}`n" http://localhost:8787/
curl.exe -s http://localhost:8787/zh/ | Select-String -Pattern "canonical|hreflang|ld\+json" | Measure-Object | Select-Object -ExpandProperty Count
curl.exe -s -o NUL -w "%{http_code}`n" http://localhost:8787/assets/style.css
curl.exe -s -o NUL -w "%{http_code}`n" http://localhost:8787/assets/og-default.png
```
Expected:
- 第 1 条输出 `301` 且 redirect_url 以 `/zh/` 结尾
- 第 2 条输出 ≥ 5（canonical、3 条 hreflang、ld+json 均存在）
- 第 3、4 条输出 `200`

验证完毕后停止 dev server。

- [ ] **Step 5: Commit**

```powershell
git add public
git commit -m "feat: static assets (stylesheet + placeholder og image)"
```

---

## Task 11: README 与最终校验

**Files:**
- Create: `README.md`

- [ ] **Step 1: 创建 README.md**

README 需包含以下章节（用标准 Markdown 书写，代码块用三反引号）：

1. **标题与简介**：玄命阁 · Cloudflare Workers SSR 网站；中英双语服务端渲染，正文为仓库内 HTML 片段，Worker 运行时统一渲染布局并自动生成完整 SEO 元素（title/description/canonical/hreflang/og/twitter/JSON-LD）。
2. **本地开发**：`npm install`、`npm run dev`（http://localhost:8787）、`npm test`（vitest，含 Workers 运行时集成测试）、`npm run typecheck`。
3. **新增一个页面（三步）**：① 在 `src/content/` 下新建 `xxx.zh.html` 与 `xxx.en.html`，只写正文（不要 html/head/body 标签）；② 在 `src/pages/registry.ts` 的 `PAGES` 中注册 slug、inNav、双语 title/description，可选 jsonldType（Article/FAQPage）；③ 提交推送，canonical、hreflang、og/twitter、JSON-LD、sitemap、导航全部自动生成。
4. **部署（GitHub → Cloudflare Workers Builds）**：一次性设置（控制台手动）—— Workers & Pages → Create → Connect to Git，选择本 GitHub 仓库；Build command 填 `npx wrangler deploy`，Build output directory 留空；保存后每次 push 到 `main` 自动构建部署。
5. **API**：接口挂在 `/api/*`，统一响应壳 `{ ok, data | error: { code, message } }`；示例 `POST /api/echo`；未来接入 LLM 按同模式新增接口。
6. **上线前检查清单**：将 `src/config/site.ts` 的 `SITE_ORIGIN` 改为正式域名（canonical/hreflang/sitemap 全部依赖它）；替换 `public/assets/og-default.png` 为正式 1200×630 分享图；确认 Cloudflare Git 集成已连接并完成首次部署；部署后用 Google Rich Results Test 抽查 JSON-LD。

- [ ] **Step 2: 全量最终校验**

Run: `npm run typecheck; npm test`
Expected: typecheck 无错误；全部测试 PASS。

- [ ] **Step 3: Commit**

```powershell
git add README.md
git commit -m "docs: readme with dev, add-page and deploy guide"
```

---

## 验收标准（全部任务完成后）

1. `npm test` 全绿，`npm run typecheck` 无错误。
2. `npm run dev` 后：`/` 301 → `/zh/`；`/zh/`、`/en/sample/` 返回含完整 SEO 元素的 200 HTML；`/sitemap.xml`、`/robots.txt` 正常；`POST /api/echo` 正常；未知路径返回 noindex 的 404 页。
3. 每个页面 head 含：title、description、canonical、hreflang（zh-CN/en/x-default）、og（含 locale alternate）、twitter、JSON-LD（WebPage + BreadcrumbList，首页额外 WebSite）。
4. 推送到 GitHub 并连接 Workers Builds 后即可自动部署（连接步骤见 README，需用户在控制台操作一次）。
