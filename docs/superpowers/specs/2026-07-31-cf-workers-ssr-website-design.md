# Cloudflare Workers SSR 网站基础框架 · 设计文档

日期：2026-07-31
状态：已获用户批准

## 1. 目标与需求

构建一个运行于 Cloudflare Workers 的服务端渲染（SSR）网站基础框架：

1. 每个页面包含完整 SEO 元素：title、description、canonical、hreflang/x-default、og/twitter、JSON-LD。
2. 部署方式：本地修改 → git 提交 → 推送 GitHub → Cloudflare Workers Builds（Git 集成）自动拉取构建部署。
3. 服务端渲染：导航栏等布局整站一致，由 Worker 运行时统一渲染。
4. 中英双语（zh-CN / en），URL 前缀 `/zh/`、`/en/`，中文为默认语言。
5. 页面正文以 HTML 片段文件（仅正文，无 html/head）存放在仓库内，构建时打包进 Worker。
6. 预留 `/api/*` AJAX 后端接口，未来接入 LLM API。
7. 域名未定，使用占位配置 `https://example.com`，集中在一处，上线时改一处全站生效。
8. 初始内容：首页 + 示例内容页 + 404 页（各中英两版）、sitemap.xml、robots.txt、示例 API 路由。

## 2. 技术选型

- **Hono**（路由 + 中间件框架，Workers 生态主流，约 20KB）
- **TypeScript**
- **wrangler**（本地开发与部署 CLI）
- **vitest + @cloudflare/vitest-pool-workers**（测试）
- HTML 正文片段通过 wrangler `rules: [{ type: "Text", globs: ["**/*.html"] }]` 作为文本模块打包，运行时零 I/O。
- 静态资源（style.css、og-default.png 等）使用 Workers static assets 绑定，由边缘直接服务。

已否决方案：零依赖手写路由（未来 API 增多时维护成本高）；Astro SSR（对本体量过重，构建链路复杂）。

## 3. 目录结构

```
suanming-zhanbu-workers/
├── wrangler.jsonc              # Workers 配置（入口、兼容日期、text 模块规则、assets）
├── package.json                # hono + wrangler + typescript + vitest
├── tsconfig.json
├── src/
│   ├── index.ts                # Worker 入口：挂载页面路由 + API 路由 + 404
│   ├── config/
│   │   └── site.ts             # SITE_ORIGIN（占位）、站名、默认语言、语言列表
│   ├── pages/
│   │   └── registry.ts         # 页面注册表：slug、双语 meta、JSON-LD 类型、正文片段、inNav
│   ├── content/                # 正文 HTML 片段（只有正文）
│   │   ├── home.zh.html / home.en.html
│   │   ├── sample.zh.html / sample.en.html
│   │   └── notfound.zh.html / notfound.en.html   # 404 页正文（不进 sitemap/导航）
│   ├── layout/
│   │   ├── render.ts           # renderPage()：<head>（全部 SEO）+ 布局 + 正文
│   │   ├── nav.ts              # 导航栏（由注册表生成，含语言切换）
│   │   └── footer.ts
│   ├── seo/
│   │   ├── meta.ts             # title/description/canonical/hreflang/og/twitter
│   │   └── jsonld.ts           # JSON-LD（WebSite / WebPage / BreadcrumbList）
│   ├── routes/
│   │   ├── pages.ts            # /:lang/:slug 页面路由 + sitemap.xml + robots.txt
│   │   └── api.ts              # /api/* 预留路由 + 示例 JSON 接口
│   └── static/
│       ├── style.css           # 全站样式（assets 绑定服务）
│       └── og-default.png      # 默认分享图占位
└── test/                       # vitest 单测与集成测
```

**核心机制：页面 = 注册表中的一条记录。** 新增页面只需添加两个语言的 `.html` 片段并在 `registry.ts` 增加一条记录；SEO 标签、sitemap、导航自动生成。meta 字段由 TypeScript 类型强制双语必填，漏写编译不过。

## 4. 路由与多语言

- 页面 URL：`/zh/`、`/en/`（首页）、`/zh/sample/`、`/en/sample/`（内容页）。统一带尾斜杠；非规范形式 301 到规范形式。
- 根路径 `/` → 301 到 `/zh/`。不做 Accept-Language 自动跳转（SEO 安全）。
- `/sitemap.xml`：由注册表生成，每个 URL 含 `xhtml:link` 双语 alternate。
- `/robots.txt`：允许全部抓取，`Disallow: /api/`，指向 sitemap。
- 未命中路由：404 状态码 + 带完整布局的 404 页（正文片段 notfound.zh/en.html，不入注册表导航与 sitemap）；按 URL 前缀选语言，无前缀用中文。
- 导航栏：注册表中 `inNav: true` 的页面自动生成链接，当前页高亮；右侧语言切换链接指向当前页另一语言版本，与 hreflang 一致。
- 静态资源经 `/assets/*` 由 Cloudflare 边缘服务。

## 5. SEO 元素生成规则

每页 `<head>` 由 `seo/meta.ts` + `seo/jsonld.ts` 自动生成：

| 元素 | 规则 |
|---|---|
| `<title>` | `{页面title} - {站名}`；首页为 `{站名} - {slogan}` |
| description | 注册表该语言 description |
| canonical | `{SITE_ORIGIN}{当前语言路径}`，绝对 URL，带尾斜杠规范形式 |
| hreflang | `zh-CN` → /zh/...、`en` → /en/...、`x-default` → /zh/...（中文版） |
| Open Graph | og:type（首页 website，其余 article）、og:title、og:description、og:url（=canonical）、og:site_name、og:locale（zh_CN/en_US）+ og:locale:alternate、og:image（默认分享图 `/assets/og-default.png`） |
| Twitter | twitter:card=summary_large_image、twitter:title/description/image |
| JSON-LD | ① `WebSite`（仅首页）；② `WebPage` 或注册表指定子类型（Article/FAQPage 等），含 name/description/url/inLanguage + `BreadcrumbList`（首页 → 当前页） |
| 基础 | charset、viewport、`html lang="zh-CN"/"en"` |

安全约束：所有插值文本经 `escapeHtml()`；JSON-LD 经 `JSON.stringify` 后转义 `</script>`。

## 6. API 层

- 全部挂 `/api/*`，返回 JSON，统一响应壳：`{ ok: true, data }` / `{ ok: false, error: { code, message } }`。
- 示例接口 `POST /api/echo`：原样返回请求 body，验证 JSON 解析与错误处理。
- 同源调用为主，暂不开放 CORS。
- `/api/*` 未命中返回 JSON 404（非 HTML）。
- 未来接 LLM：按相同模式新增接口（如 `POST /api/divine`）。

## 7. 部署

- GitHub 仓库连接 Cloudflare **Workers Builds（Git 集成）**，构建命令 `npx wrangler deploy`，push 到 `main` 自动部署。
- 控制台一次性连接步骤写入 README（需用户在 Cloudflare 界面手动操作一次）。
- 本地开发：`npm run dev`（wrangler dev）。

## 8. 错误处理

- 页面路由异常 → 500 + 带布局的简单错误页。
- API 异常 → JSON 500。
- 均不泄漏堆栈信息。

## 9. 测试策略

- 单测：meta/jsonld 生成函数——给定注册表记录，断言输出含 canonical/hreflang/og/twitter/JSON-LD 且转义正确。
- 集成测：`/zh/`、`/en/sample/`、`/`（301）、非规范 URL（301）、`/sitemap.xml`、`/robots.txt`、`POST /api/echo`、404（页面与 API 两种），断言状态码与关键内容。

## 10. 上线前待办（非本框架范围）

- 将 `site.ts` 的 `SITE_ORIGIN` 改为正式域名。
- 替换默认 og 分享图。
- 在 Cloudflare 控制台完成 Git 集成连接。
