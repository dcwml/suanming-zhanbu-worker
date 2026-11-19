# 独立接口与访问统计页面设计

- **日期**：2026-11-19
- **状态**：Approved
- **作者**：AI / Antigravity

---

## 1. 背景与目标

### 1.1 现状与痛点
- 当前全站所有页面的访问 PV 和 API 调用均在 Worker 全局中间件中埋点并写入 Cloudflare D1。
- 过去在首页（`/:lang/`）底部以一行小字（`<p class="site-stats">`）展示基础 PV，并在其后以 `api_path total(today)` 形式直接追加平铺各个 API 端点的调用次数。
- 随着命理、占卜、合婚、灵签、生成等 API 接口不断增加，平铺在首页底部的统计字符串变得异常冗长杂乱，破坏了首页清雅庄重的传统文化风格。
- 同时，首页渲染每次都需要阻塞等待 `getStats(db)` 查询 D1 数据库，增加了首页的首包时间与数据库读开销。

### 1.2 目标
1. **首页瘦身**：彻底移除首页底部的 `.site-stats` 统计文本，移除首页路由中对 `getStats(db)` 的同步等待，恢复首页纯静态片段渲染的高性能。
2. **独立统计页**：创建独立的统计页面（`/zh/stats/` 与 `/en/stats/`），提供清晰优雅的仪表盘展示（核心概览卡片 + API 接口调用明细表格）。
3. **隐蔽策略（零入口）**：
   - 该页面不设立任何公开入口（不进顶部导航、不进底部页脚、首页无任何链接）。
   - 从 `sitemap.xml` 中排除，并注入 `robots: noindex, nofollow` 防止搜索引擎抓取索引。
   - 路径简洁明了（直接使用 `/stats/`），无需复杂的密码或额外验证逻辑。

---

## 2. 路由与访问控制

### 2.1 URL 规范
- 中文页面：`/zh/stats/`
- 英文页面：`/en/stats/`
- 快捷重定向：
  - `/stats` 与 `/stats/` 自动 301 重定向至 `/zh/stats/`。
  - `/zh/stats` 自动 301 重定向至 `/zh/stats/`。
  - `/en/stats` 自动 301 重定向至 `/en/stats/`。

### 2.2 防抓取与隐蔽性
- `PageEntry` 注册：
  - `slug: "stats"`
  - `inNav: false`
  - `excludeFromSitemap: true`
  - `robots: "noindex, nofollow"`
- `sitemap.xml` 生成逻辑（`src/seo/sitemap.ts`）：
  - 遍历 `PAGES` 时过滤掉标记为 `excludeFromSitemap: true` 的页面，确保搜索引擎爬虫无法从 sitemap 获取该路径。
- HTML `<head>`（`src/seo/meta.ts`）：
  - 对于带有 `robots` 属性的页面，在 `<head>` 中生成 `<meta name="robots" content="noindex, nofollow">`。

---

## 3. 架构与数据流

### 3.1 首页解耦
- **移除内容**：
  - 删除 `src/layout/render.ts` 中的 `renderPageWithStats` 和 `buildStatsHtml`。
  - 从 `public/assets/style.css` 中移除或清理旧的 `.site-stats` 样式。
- **首页路由（`src/routes/pages.ts`）**：
  - 访问 `/:lang/` 时，仅后台通过 `recordPageView(db, req, "homepage")` 记录访问（不阻塞主响应）。
  - 直接调用标准 `renderPage(findPage("")!, lang)` 输出 HTML。

### 3.2 独立统计页渲染
- **内容片段**：
  - `src/content/stats.zh.html`
  - `src/content/stats.en.html`
  - 包含页面基础标题、副标题说明（例如标注：数据按北京时间 Asia/Shanghai 统计，每日零点更新）。
- **渲染函数**：
  - `renderStatsPage(page: PageEntry, lang: Lang, stats: StatsData | null): string`
  - 动态在正文后注入数据卡片与 API 表格。
- **数据获取**：
  - 路由 `/:lang/stats/` 中：
    ```ts
    const db = c.env?.STATS_DB;
    const stats = db ? await getStats(db) : null;
    return c.html(renderStatsPage(page, lang, stats));
    ```
  - 复用现有的 `getStats(db)`（定义在 `src/stats.ts`）。

---

## 4. 界面与排版设计

统一遵循全站现有的古典文化、素雅沉稳视觉风格：

### 4.1 核心概览卡片（Overview Cards）
采用响应式网格布局（`.stats-grid`），包含 4 张指标卡片：
1. **全站总访问人次**（累计首页与全站 PV）
2. **今日访问人次**（今日 PV）
3. **八字测算累计人次**
4. **六爻占卜累计人次**

每张卡片展示指标数值（醒目大字）与指标名称，配以素雅边框与轻微阴影。

### 4.2 API 接口调用明细表格（API Endpoints Table）
采用标准表格（`.stats-table-container` 与 `.stats-table`）：
- **表头**：
  - 接口路径（API Endpoint）
  - 今日调用次数（Today）
  - 累计调用次数（Total）
- **排序**：按累计调用次数降序排列。
- **空状态**：若当前 `stats.api_calls` 为空，展示居中的优雅提示：“暂无接口调用数据” / “No API call records yet”。

---

## 5. 错误处理与降级

- 若环境未绑定 D1 数据库（如部分本地无状态开发环境），`getStats` 返回默认零值统计，页面展示 0 及空状态提示，绝不抛出 500 异常。
- D1 查询异常时，`safeFirst` 与 `safeAll` 内部已做捕获兜底，保证页面稳定渲染。

---

## 6. 测试与验证计划

### 6.1 自动化测试
1. **集成测试（`test/integration.test.ts`）**：
   - 验证首页不再包含 `.site-stats` 文本；
   - 验证 `GET /stats` 重定向至 `/zh/stats/`；
   - 验证 `GET /zh/stats/` 和 `GET /en/stats/` 返回 200，并包含概览卡片及接口表格结构；
   - 验证 `/sitemap.xml` 中绝对不包含 `/stats/`。
2. **全量通过命令**：
   - `npm test`（Vitest Workers 测试）
   - `npm run typecheck`（TypeScript 类型检查）

### 6.2 生产部署与验证
1. 提交所有变更并推送到 `main` 分支；
2. Cloudflare Workers Builds 自动完成部署；
3. 使用 `curl` 验证线上生产环境：
   - 访问 `https://suanming-zhanbu.com/zh/`，确认已彻底无统计小字；
   - 访问 `https://suanming-zhanbu.com/zh/stats/`，确认返回 200 且正确渲染各接口的调用次数；
   - 访问 `https://suanming-zhanbu.com/sitemap.xml`，确认无 `stats` 记录。
