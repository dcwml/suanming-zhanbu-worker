# 独立接口与访问统计页面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 彻底移除首页底部的统计展示与同步查询，实现零入口、防搜索引擎收录的独立统计页面 `/stats/`，展示全站核心访问指标与 API 接口调用明细。

**Architecture:** 
1. `PageEntry` 扩展 `excludeFromSitemap` 与 `robots` 属性，确保 `sitemap.xml` 自动过滤且 HTML head 注入 `noindex, nofollow`；
2. 首页恢复为纯静态 `renderPage`，异步记录 PV；
3. 新增 `renderStatsPage` 在服务端动态组装概览卡片与 API 接口调用表格，在 `/:lang/stats/` 路由中提供服务；
4. 全套中英双语与响应式古典视觉样式。

**Tech Stack:** Cloudflare Workers, Hono, TypeScript, Cloudflare D1, Vitest (`@cloudflare/vitest-pool-workers`).

## Global Constraints

- 页面可见文本一律不出现「AI」字样（文案红线）。
- 所有绝对 URL 必须经 `absoluteUrl(pagePath(lang, slug))` 生成，正规 URL 均带尾斜杠。
- 双语对称：zh 与 en 同步覆盖。
- 插入 HTML 属性/文本一律过 `escapeHtml`。
- 提交前必须通过：`npm test` + `npm run typecheck`。

---

### Task 1: 扩展 PageEntry 支持 robots 与 excludeFromSitemap，更新 SEO 模块与单元测试

**Files:**
- Modify: `src/pages/registry.ts:40-60`
- Modify: `src/seo/meta.ts:50-80`
- Modify: `src/seo/sitemap.ts:10-35`
- Test: `test/meta.test.ts` 或 `test/sitemap.test.ts`

**Interfaces:**
- `PageEntry.excludeFromSitemap?: boolean`
- `PageEntry.robots?: string`
- `buildHead(page: PageEntry, lang: Lang)`: 若 `page.robots` 存在，注入 `<meta name="robots" content="...">`
- `buildSitemapXml()`: 排除 `excludeFromSitemap: true` 的页面

- [ ] **Step 1: 编写 SEO 扩展的测试用例**
在 `test/meta.test.ts` 中增加测试：当 `page.robots` 存在时，`buildHead` 包含 `<meta name="robots" content="noindex, nofollow">`。
在 `test/sitemap.test.ts` 中增加测试：当页面 `excludeFromSitemap: true` 时，`buildSitemapXml()` 生成的 XML 不含该页面的 URL。

- [ ] **Step 2: 运行测试验证失败**
Run: `npx vitest run test/meta.test.ts test/sitemap.test.ts`
Expected: FAIL（属性未定义或标签未输出）

- [ ] **Step 3: 修改 `src/pages/registry.ts`、`src/seo/meta.ts` 与 `src/seo/sitemap.ts`**
在 `src/pages/registry.ts` 中给 `PageEntry` 增加 `excludeFromSitemap?: boolean` 与 `robots?: string` 字段。
在 `src/seo/meta.ts` 的 `buildHead` 中添加对 `page.robots` 的渲染：
```ts
const robotsTag = page.robots ? `\n    <meta name="robots" content="${escapeHtml(page.robots)}">` : "";
```
在 `src/seo/sitemap.ts` 的 `buildSitemapXml` 中过滤：
```ts
const visiblePages = PAGES.filter((p) => !p.excludeFromSitemap);
```

- [ ] **Step 4: 运行测试验证通过**
Run: `npx vitest run test/meta.test.ts test/sitemap.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**
```bash
git add src/pages/registry.ts src/seo/meta.ts src/seo/sitemap.ts test/meta.test.ts test/sitemap.test.ts
git commit -m "feat(seo): add excludeFromSitemap and robots support to PageEntry"
```

---

### Task 2: 首页移除底部统计，解耦 getStats 同步查询

**Files:**
- Modify: `src/routes/pages.ts:188-210`
- Modify: `src/layout/render.ts:70-105`
- Test: `test/integration.test.ts`

**Interfaces:**
- 移除 `renderPageWithStats` 和 `buildStatsHtml`
- 首页路由直接调用 `renderPage(findPage("")!, lang)`

- [ ] **Step 1: 修改测试预期**
在 `test/integration.test.ts` 中添加断言：首页不包含 `class="site-stats"`。若有旧测试断言首页统计文本，予以更新。

- [ ] **Step 2: 运行测试确认当前状态**
Run: `npx vitest run test/integration.test.ts`

- [ ] **Step 3: 修改 `src/layout/render.ts` 与 `src/routes/pages.ts`**
在 `src/layout/render.ts` 中移除 `renderPageWithStats` 与 `buildStatsHtml`。
在 `src/routes/pages.ts` 的首页路由 `pages.get("/:lang/", ...)` 中，去掉 `await getStats(db)`，改为纯静态调用 `renderPage(findPage("")!, lang)`，保留 `recordPageView(db, c.req.raw, "homepage").catch(() => {})`。

- [ ] **Step 4: 运行测试验证通过**
Run: `npx vitest run test/integration.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**
```bash
git add src/layout/render.ts src/routes/pages.ts test/integration.test.ts
git commit -m "refactor(home): remove bottom site-stats from homepage and decouple getStats"
```

---

### Task 3: 创建 stats 页面内容片段与注册

**Files:**
- Create: `src/content/stats.zh.html`
- Create: `src/content/stats.en.html`
- Modify: `src/pages/registry.ts`

**Interfaces:**
- `PAGES` 中注册 `slug: "stats"`：
  - `inNav: false`
  - `excludeFromSitemap: true`
  - `robots: "noindex, nofollow"`
  - `meta`: 中英双语标题与描述
  - `content`: `{ zh: statsZh, en: statsEn }`

- [ ] **Step 1: 创建 `src/content/stats.zh.html` 与 `src/content/stats.en.html`**
内容包含页面主标题、副标题提示（统计口径为北京时间 Asia/Shanghai，每日零点更新）。
- [ ] **Step 2: 在 `src/pages/registry.ts` 中引入并注册 `stats` 页面**
- [ ] **Step 3: 运行 typecheck 确保无类型错误**
Run: `npm run typecheck`
Expected: 0 errors
- [ ] **Step 4: 提交**
```bash
git add src/content/stats.zh.html src/content/stats.en.html src/pages/registry.ts
git commit -m "feat(pages): register stats page with noindex and excludeFromSitemap"
```

---

### Task 4: 实现 renderStatsPage 渲染函数与 CSS 样式

**Files:**
- Modify: `src/layout/render.ts`
- Modify: `public/assets/style.css`
- Test: `test/render.test.ts`

**Interfaces:**
- `renderStatsPage(page: PageEntry, lang: Lang, stats: StatsData | null): string`
  - 概览卡片区：全站访问、今日访问、八字使用、六爻使用
  - API 接口明细表：接口路径、今日调用次数、累计调用总量，按总量降序排列
  - 空状态兜底

- [ ] **Step 1: 编写 `renderStatsPage` 渲染测试**
测试在有 stats 数据和 stats 为 null/空数组时的渲染结果，验证表格和卡片包含正确的字段与文本。
- [ ] **Step 2: 运行测试验证失败**
Run: `npx vitest run test/render.test.ts`
Expected: FAIL (`renderStatsPage` 未定义)
- [ ] **Step 3: 在 `src/layout/render.ts` 中实现 `renderStatsPage`**
组装 `.stats-grid` 卡片和 `.stats-table`，并配合 `escapeHtml` 和数字格式化 `toLocaleString("en-US")`。
在 `public/assets/style.css` 中添加 `.stats-grid`、`.stats-card`、`.stats-table` 等古典雅致样式。
- [ ] **Step 4: 运行测试验证通过**
Run: `npx vitest run test/render.test.ts`
Expected: PASS
- [ ] **Step 5: 提交**
```bash
git add src/layout/render.ts public/assets/style.css test/render.test.ts
git commit -m "feat(layout): implement renderStatsPage and dashboard styling"
```

---

### Task 5: 配置 stats 路由与快捷重定向

**Files:**
- Modify: `src/routes/pages.ts`
- Test: `test/integration.test.ts`

**Interfaces:**
- `/stats` 与 `/stats/` 301 重定向到 `/zh/stats/`
- `/:lang/stats/` 路由处理函数：读取 `getStats(db)` 并调用 `renderStatsPage` 输出 HTML

- [ ] **Step 1: 编写路由与重定向集成测试**
在 `test/integration.test.ts` 中测试：
1. `GET /stats` -> 301 重定向到 `/zh/stats/`
2. `GET /stats/` -> 301 重定向到 `/zh/stats/`
3. `GET /zh/stats/` -> 200，包含统计卡片与表格
4. `GET /en/stats/` -> 200，包含英文统计卡片与表格
5. `GET /sitemap.xml` -> 不包含 `/stats/`

- [ ] **Step 2: 运行测试验证失败**
Run: `npx vitest run test/integration.test.ts`
Expected: FAIL（重定向或 404）

- [ ] **Step 3: 在 `src/routes/pages.ts` 中挂载 stats 路由**
在路由中增加根重定向和 `/:lang/stats/` 路由处理器。

- [ ] **Step 4: 运行全量测试与类型检查**
Run: `npm test; npm run typecheck`
Expected: 全部 PASS

- [ ] **Step 5: 提交**
```bash
git add src/routes/pages.ts test/integration.test.ts
git commit -m "feat(routes): add stats page routes and root redirects"
```

---

### Task 6: 全量验证、Git Push 与线上生产验证

**Files:**
- None (执行阶段与生产验证)

- [ ] **Step 1: 全量测试验证**
Run: `npm test; npm run typecheck`
确认无任何错误或失败。
- [ ] **Step 2: Git Push 到 main 分支**
Run: `git push origin main`
- [ ] **Step 3: 线上生产环境验证**
通过 curl 验证：
1. `curl -I https://suanming-zhanbu.com/stats` 确认 301 到 `/zh/stats/`
2. `curl -s https://suanming-zhanbu.com/zh/ | grep site-stats` 确认无输出（首页底部已彻底移除）
3. `curl -s https://suanming-zhanbu.com/zh/stats/` 确认 200，且包含统计表格与卡片数据
4. `curl -s https://suanming-zhanbu.com/sitemap.xml | grep stats` 确认无输出（未被 sitemap 泄露）
