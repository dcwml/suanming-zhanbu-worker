# AGENTS.md

面向 AI 编码代理与新协作者的项目速览。人类文档见 [README.md](./README.md)，完整设计与计划见 `docs/superpowers/`。

## 项目是什么

中英双语 SSR 网站，运行于 Cloudflare Workers（Hono + TypeScript）。页面正文是仓库内 HTML 片段，Worker 运行时套上统一布局（导航/页脚）并自动生成完整 SEO 元素。部署方式：push 到 GitHub `main` → Cloudflare Workers Builds 自动执行 `npx wrangler deploy`。

## 常用命令（Windows PowerShell，用 `;` 不用 `&&`）

```powershell
npm run dev          # wrangler dev → http://localhost:8787
npm test             # vitest run（@cloudflare/vitest-pool-workers，真实 Workers 运行时）
npm run test:watch   # vitest watch
npm run typecheck    # tsc --noEmit
npm run deploy       # 手动部署（正常情况由 Git 集成自动触发，勿随意执行）
npm run purge        # 清空 Cloudflare zone 缓存；附加 URL 参数可只清指定地址（凭证见 purge-cache.js 头部注释）
```

提交前必须通过：`npm test` + `npm run typecheck`。测试结束时 Windows 上可能出现 miniflare 临时目录 EBUSY 警告，属无害噪音，不代表失败。

LLM 密钥：本地开发在 `.dev.vars` 配置 `LLM_API_KEY`（不入库）；生产部署前执行 `wrangler secret put LLM_API_KEY`。`LLM_BASE_URL`/`LLM_MODEL` 是普通 vars，在 `wrangler.jsonc` 里改。

## 目录结构与职责

```
src/
  index.ts            Worker 入口：挂载 api → pages，全局 notFound/onError
  config/site.ts      ★ 全站配置单一来源：SITE_ORIGIN、语言表、pagePath/absoluteUrl/langFromPath
  pages/registry.ts   ★ 页面注册表单一来源：PAGES + NOT_FOUND_CONTENT + findPage/navPages
  content/*.html      正文片段（只有正文，无 html/head/body），命名 <slug>.<lang>.html
  seo/meta.ts         buildHead（title/canonical/hreflang/og/twitter）、escapeHtml
  seo/jsonld.ts       JSON-LD 构建与 </script> 注入转义
  seo/sitemap.ts      sitemap.xml（双语 alternates）与 robots.txt
  layout/nav.ts       品牌块（logo.png + 站名）+ 导航 + 语言切换（第三参 langSwitchSlug 供错误页指向对方语言首页）
  layout/footer.ts    多栏页脚（品牌栏 + 工具/关于链接列 + 底栏版权免责；链接标题取 registry 单一来源）
  layout/render.ts    renderPage / renderNotFound / renderError（组装完整 HTML）
  layout/snippets/    全站静态片段：head.html（验证 meta/GTM 等 <head> 代码）、body-start.html（GTM noscript 等 <body> 开头代码），原样注入所有页面含 404/500，只放仓库内受控代码
  llm.ts              ★ 共享 LLM 客户端：callLlm（OpenAI 兼容）、LlmEnv、RateLimiter 接口
  bazi/               八字解读模块：validate 请求校验 / prompt 提示词 / llm 转出 / types 共享类型
  liuyao/             六爻解读模块：validate 请求校验 / prompt 提示词 / types 共享类型（零算法，不重算卦象）
  routes/pages.ts     页面路由：/ 与无尾斜杠路径 301 → /:lang/:slug/
  routes/api.ts       /api/* 子应用：JSON 响应壳、404/500 均返回 JSON
  routes/bazi.ts      POST /api/bazi/interpret：限流→校验→LLM→Markdown 返回
  routes/liuyao.ts    POST /api/liuyao/interpret：限流→校验→LLM→Markdown 返回
  html.d.ts           *.html 模块的 ambient 声明（配合 wrangler Text rules）
public/assets/        静态资源（style.css、logo.png（印章 LOGO，兼作 favicon）、og-default.png、bazi.js、liuyao.js），由 Workers assets 直接服务
  bazi.js             前端 lunar-javascript 排盘 + 三段串行解读渲染
  liuyao.js           前端 64 卦文本表 + King Wen 查表算法 + 三步投币起卦 + 单段解读渲染
test/                 15 个测试文件、130 个测试（SELF.fetch 集成测试 + 单元测试）
```

## 核心约定（改代码前必读）

1. **新增页面 = 两步，别写第三步**：`src/content/` 加 `<slug>.zh.html` + `<slug>.en.html` → `registry.ts` 的 `PAGES` 加一条 `PageEntry`。SEO、sitemap、导航、语言切换全部自动派生，不要手写任何 meta 标签或 sitemap 条目。
2. **URL 只有一种拼法**：所有绝对 URL 必须经 `absoluteUrl(pagePath(lang, slug))` 生成；正式 URL 均带尾斜杠，无尾斜杠路径由路由层 301。禁止手拼 `https://...` 字符串。
3. **域名单一来源**：`SITE_ORIGIN` 已设为正式域名 `https://suanming-zhanbu.com`，如需换域名只改这一处。写测试时断言必须基于 `SITE_ORIGIN` 常量而非硬编码域名。
4. **转义纪律**：插入 HTML 属性/文本一律过 `escapeHtml`；JSON-LD 一律经 `toJsonLdScript`（内部把 `<` 转 `\u003c`）。正文片段是唯一被信任的原始 HTML（仓库内受控内容）。
5. **API 形状**：`/api/*` 统一返回 `{ ok: true, data }` 或 `{ ok: false, error: { code, message } }`；错误响应不得回显未截断的用户输入（现有 404 用 `slice(0, 128)`）。未来 LLM 接口（如 `POST /api/divine`）沿用此模式加在 `routes/api.ts`。已落地实例：`POST /api/bazi/interpret`（见 `src/routes/bazi.ts`，错误码 invalid_request/rate_limited/not_configured/upstream_error/upstream_timeout）；`POST /api/liuyao/interpret`（见 `src/routes/liuyao.ts`，错误码同上 + payload_too_large/invalid_json）。
6. **双语对称**：任何页面/文案改动必须同时覆盖 zh 与 en；`Lang` 类型收紧为 `"zh" | "en"`，新增语言需从 `site.ts` 的语言表全套扩展。
7. **wrangler 配置陷阱**：Text 模块规则字段是 `rules[].globs`（不是 `include`）；`assets.directory` 必须存在，否则 vitest pool 启动失败。
8. **TDD**：本仓库按测试先行开发。改行为先改/加测试；`SELF.fetch` 集成测试放 `test/integration.test.ts`，纯函数单测按模块拆分。

## FAQ 页面（暂无示例，先记录用法）

仓库目前没有 FAQ 示例页。要新增一个 FAQ 页面，按普通页面两步走，注册时标注类型：

```ts
// registry.ts
{
  slug: "faq",
  inNav: true,
  jsonldType: "FAQPage",   // pageJsonLd 的 @type 会输出 FAQPage
  meta: { zh: {...}, en: {...} },
  content: { zh: faqZh, en: faqEn },
}
```

正文片段中问答建议用语义化结构（如 `<h2>问题</h2><p>答案</p>` 或 `<details><summary>`），中英两版问答需一一对应。

**已知边界**：当前 `pageJsonLd`（`src/seo/jsonld.ts`）只切换 `@type`，**不生成 `mainEntity` 的 Question/Answer 数组**——而 Google 的 FAQ 富结果要求 `mainEntity`。因此首次真正落地 FAQ 页时需要扩展：在 `PageEntry` 上加可选的双语问答数据（如 `faq?: Record<Lang, { question: string; answer: string }[]>`），并在 `pageJsonLd` 中当 `jsonldType === "FAQPage"` 时输出 `mainEntity`（文本经 `escapeHtml`/`toJsonLdScript` 现有纪律处理），同时补对应单测。上线后用 Google Rich Results Test 验证。

## 已知取舍（不要"顺手修复"）

- 无尾斜杠路径无条件 301（先规范化再判存在），是计划预定策略。
- `onError` 500 分支无集成测试（不为测试往生产代码塞抛错路由）。
- sitemap 未含 x-default alternate（Google 文档标注可选）。
- `jsonldType: "FAQPage"` 已定义但暂无使用页面，属前瞻性预留（用法与边界见上节「FAQ 页面」）。

## 上线前检查清单（同 README）

`SITE_ORIGIN` 已设为正式域名（`https://suanming-zhanbu.com`）→ 替换 `og-default.png`（1200×630）→ 确认 Cloudflare Git 集成 → `wrangler secret put LLM_API_KEY` → Google Rich Results Test 抽查 JSON-LD。
