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
npm run almanac -- YYYY-MM-DD  # 生成期工具：输出指定日期的历法数据（干支、宜忌、冲煞、喜/财/福神方位、节气、吉神凶煞、生肖等）
npm run fortune:week -- YYYY-MM-DD  # 生成期工具：周运骨架生成器（参数必须是周一），输出该周 7 天历法骨架 + 生肖关系评分 + 特吉/次吉/忠告排序
npm run fortune:month -- YYYY-MM    # 生成期工具：月运骨架生成器，输出月柱分段、节气、生肖月关系（六合/三合/值月/相害/相冲）、吉日速查
```

提交前必须通过：`npm test` + `npm run typecheck`。测试结束时 Windows 上可能出现 miniflare 临时目录 EBUSY 警告，属无害噪音，不代表失败。

LLM 密钥：本地开发在 `.dev.vars` 配置 `LLM_API_KEY`（不入库）；生产部署前执行 `wrangler secret put LLM_API_KEY`。`LLM_BASE_URL`/`LLM_MODEL` 是普通 vars，在 `wrangler.jsonc` 里改。

## 目录结构与职责

```
src/
  index.ts            Worker 入口：挂载 api → pages，全局 notFound/onError
  config/site.ts      ★ 全站配置单一来源：SITE_ORIGIN、语言表、pagePath/absoluteUrl/langFromPath
  pages/registry.ts   ★ 固定页面注册表单一来源：PAGES + NOT_FOUND_CONTENT + findPage/navPages
  pages/daily.ts      ★ 每日宜忌聚合模块：DAILY_POSTS / DAILY_ARCHIVE_META / findDailyPost / dailyArchive（不进 registry）
  pages/weekly.ts     ★ 每周运势聚合模块：WEEKLY_POSTS / WEEKLY_ARCHIVE_META / findWeeklyPost / weeklyArchive（不进 registry）
  pages/monthly.ts    ★ 每月运势聚合模块：MONTHLY_POSTS / MONTHLY_ARCHIVE_META / findMonthlyPost / monthlyArchive（不进 registry）
  fortune/rules.ts    地支关系查表（六合/三合/相冲/相害/值日）+ 周运评分与吉运排序规则（weekZodiacScores/pickFortuneRanks 等，有单测）
  content/*.html      正文片段（只有正文，无 html/head/body），命名 <slug>.<lang>.html
  content/daily/      每日宜忌正文片段：YYYY-MM-DD.zh.html / .en.html（三段式：almanac / zodiac / story）
  content/weekly/     每周运势正文片段：YYYY-MM-DD.zh.html / .en.html（日期为该周周一；总览排名 + 12 生肖六行 + 每日要点）
  content/monthly/    每月运势正文片段：YYYY-MM.zh.html / .en.html（月柱总览 + 12 生肖六维深化 + 吉日速查）
  seo/meta.ts         escapeHtml、buildHead（固定页面 title/canonical/hreflang/og/twitter）+ daily/weekly/monthly 的单篇与归档 head 构建器
  seo/jsonld.ts       JSON-LD 构建与 </script> 注入转义；含 articleJsonLd / weeklyArticleJsonLd / monthlyArticleJsonLd / collectionPageJsonLd / faqJsonLd（按 faq 字段自动注入 FAQPage）
  seo/sitemap.ts      sitemap.xml（双语 alternates + daily/weekly/monthly 单篇+归档页）与 robots.txt
  layout/nav.ts       品牌块（logo.png + 站名）+ 导航（含「命理」下拉：MINGLI_NAV_LABEL/MINGLI_NAV_ITEMS，八字排盘/紫微斗数，纯按钮无链接；「占卜」下拉：DIVINATION_NAV_LABEL/DIVINATION_NAV_ITEMS，六爻起卦/梅花易数/小六壬，标题链接 divination 总览页；「运势」下拉：FORTUNE_NAV_LABEL/FORTUNE_NAV_ITEMS，每日/每周/每月运势；三个下拉均纯 CSS）+ 语言切换
  layout/footer.ts    多栏页脚（品牌栏 + 工具/运势/关于链接列 + 底栏版权免责；链接标题取 registry 单一来源 + daily/weekly/monthly 显式引用）
  layout/render.ts    renderPage / renderNotFound / renderError / renderDailyPost / renderDailyArchive / renderWeeklyPost / renderWeeklyArchive / renderMonthlyPost / renderMonthlyArchive
  layout/snippets/    全站静态片段：head.html（验证 meta/GTM 等 <head> 代码）、body-start.html（GTM noscript 等 <body> 开头代码），原样注入所有页面含 404/500，只放仓库内受控代码
  llm.ts              ★ 共享 LLM 客户端：callLlm（OpenAI 兼容）、LlmEnv、RateLimiter 接口
  bazi/               八字解读模块：validate 请求校验 / prompt 提示词 / llm 转出 / types 共享类型
  liuyao/             六爻解读模块：validate 请求校验 / prompt 提示词 / types 共享类型（零算法，不重算卦象）
  meihua/             梅花易数解读模块：validate 请求校验 / prompt 提示词 / types 共享类型（零算法，卦象由前端算好传入）
  xiaoliuren/         小六壬解读模块：validate 请求校验 / prompt 提示词 / types 共享类型（含六宫属性数据表；零算法，课式由前端算好传入）
  zeji/               择吉解读模块：validate 请求校验 / prompt 提示词 / types 共享类型（零历法重算）
  ziwei/              紫微斗数解读模块：validate 请求校验 / prompt 提示词 / types 共享类型（零安星重算，命盘由前端 iztro 算好传入）
  routes/pages.ts     页面路由：/ 与无尾斜杠路径 301 → /:lang/:slug/；daily / weekly / monthly 各四条路由（必须在固定页面路由之前）
  routes/api.ts       /api/* 子应用：JSON 响应壳、404/500 均返回 JSON
  routes/bazi.ts      POST /api/bazi/interpret：限流→校验→LLM→Markdown 返回
  routes/liuyao.ts     POST /api/liuyao/interpret：限流→校验→LLM→Markdown 返回
  routes/meihua.ts     POST /api/meihua/interpret：限流→校验→LLM→Markdown 返回
  routes/xiaoliuren.ts POST /api/xiaoliuren/interpret：限流→校验→LLM→Markdown 返回
  routes/zeji.ts      POST /api/zeji/interpret：限流→校验→LLM→Markdown 返回
  routes/ziwei.ts     POST /api/ziwei/interpret：限流→校验→LLM→Markdown 返回
  html.d.ts           *.html 模块的 ambient 声明（配合 wrangler Text rules）
scripts/
  almanac.ts          生成期工具：用 lunar-javascript 输出指定日期历法数据（干支、宜忌、冲煞、纳音、喜/财/福神方位、节气、吉神凶煞等）
  fortune.ts          生成期工具：周运/月运数据骨架生成器（fortune:week 参数须为周一 / fortune:month 参数 YYYY-MM）；历法数据复用 almanac 的 compute()，地支关系与评分规则来自 src/fortune/rules.ts
public/assets/        静态资源（style.css、logo.png（印章 LOGO，兼作 favicon）、og-default.png、bazi.js、liuyao.js、meihua.js、xiaoliuren.js、zeji.js、ziwei.js、vendor/iztro.min.js），由 Workers assets 直接服务；bazi/liuyao/meihua/xiaoliuren/zeji 页面经 CDN 统一加载 lunar-javascript 1.7.7（cdnjs 主源 + staticfile 回退）；ziwei 页面经 unpkg → jsdelivr → 本地 vendor 三级链加载 iztro 2.6.0
  bazi.js             前端 lunar-javascript 排盘 + 三段串行解读渲染
  liuyao.js           前端 64 卦文本表 + King Wen 查表算法 + 三步投币起卦 + 单段解读渲染
  meihua.js           前端先天八卦数/体用五行算法 + 时间/数字起卦 + 本互变卦排盘 + 单段解读渲染
  xiaoliuren.js       前端六宫数据表 + 时间/数字起课（月上起月、日上起日、时上起课）+ 三宫落宫渲染 + 单段解读渲染
  zeji.js             前端 lunar-javascript 扫描 + 避冲排序 + 详解渲染
  ziwei.js            前端 iztro 排盘 + 4×4 盘格渲染 + 三段串行解读渲染
test/                 30 个测试文件、343 个测试（SELF.fetch 集成测试 + 单元测试）
```

## 核心约定（改代码前必读）

1. **新增固定页面 = 两步，别写第三步**：`src/content/` 加 `<slug>.zh.html` + `<slug>.en.html` → `registry.ts` 的 `PAGES` 加一条 `PageEntry`。SEO、sitemap、导航、语言切换全部自动派生，不要手写任何 meta 标签或 sitemap 条目。
2. **新增运势内容（每日/每周/每月）= 两步，不碰 registry**：内容片段 + 对应聚合模块的 POSTS 数组加一条，SEO、sitemap、导航全部自动派生。① 每日：`src/content/daily/` 加 `YYYY-MM-DD.zh.html` + `.en.html` → `src/pages/daily.ts` 的 `DAILY_POSTS` 加一条 `DailyPost`。② 周运：`src/content/weekly/` 加 `YYYY-MM-DD.zh.html` + `.en.html`（日期为该周周一）→ `src/pages/weekly.ts` 的 `WEEKLY_POSTS` 加一条 `WeeklyPost`。③ 月运：`src/content/monthly/` 加 `YYYY-MM.zh.html` + `.en.html` → `src/pages/monthly.ts` 的 `MONTHLY_POSTS` 加一条 `MonthlyPost`。详细流程分别见 [每日内容生产手册](./docs/superpowers/daily-content-playbook.md)、[周运生产手册](./docs/superpowers/weekly-content-playbook.md)、[月运生产手册](./docs/superpowers/monthly-content-playbook.md)。
3. **URL 只有一种拼法**：所有绝对 URL 必须经 `absoluteUrl(pagePath(lang, slug))` 生成；正式 URL 均带尾斜杠，无尾斜杠路径由路由层 301。禁止手拼 `https://...` 字符串。
4. **域名单一来源**：`SITE_ORIGIN` 已设为正式域名 `https://suanming-zhanbu.com`，如需换域名只改这一处。写测试时断言必须基于 `SITE_ORIGIN` 常量而非硬编码域名。
5. **转义纪律**：插入 HTML 属性/文本一律过 `escapeHtml`；JSON-LD 一律经 `toJsonLdScript`（内部把 `<` 转 `\u003c`）。正文片段是唯一被信任的原始 HTML（仓库内受控内容）。
6. **API 形状**：`/api/*` 统一返回 `{ ok: true, data }` 或 `{ ok: false, error: { code, message } }`；错误响应不得回显未截断的用户输入（现有 404 用 `slice(0, 128)`）。未来 LLM 接口（如 `POST /api/divine`）沿用此模式加在 `routes/api.ts`。已落地实例：`POST /api/bazi/interpret`（见 `src/routes/bazi.ts`，错误码 invalid_request/rate_limited/not_configured/upstream_error/upstream_timeout）；`POST /api/liuyao/interpret`（见 `src/routes/liuyao.ts`，错误码同上 + payload_too_large/invalid_json）；`POST /api/meihua/interpret`（见 `src/routes/meihua.ts`，错误码同 liuyao）；`POST /api/xiaoliuren/interpret`（见 `src/routes/xiaoliuren.ts`，错误码同 liuyao）；`POST /api/zeji/interpret`（见 `src/routes/zeji.ts`，错误码同 liuyao）；`POST /api/ziwei/interpret`（见 `src/routes/ziwei.ts`，错误码同 liuyao）。
7. **双语对称**：任何页面/文案改动必须同时覆盖 zh 与 en；`Lang` 类型收紧为 `"zh" | "en"`，新增语言需从 `site.ts` 的语言表全套扩展。
8. **wrangler 配置陷阱**：Text 模块规则字段是 `rules[].globs`（不是 `include`）；`assets.directory` 必须存在，否则 vitest pool 启动失败。
9. **TDD**：本仓库按测试先行开发。改行为先改/加测试；`SELF.fetch` 集成测试放 `test/integration.test.ts`，纯函数单测按模块拆分。

## 每日宜忌栏目

### 架构概览

纯静态日更栏目，零运行时 LLM 调用。每天新增两份 HTML 片段（中英双语），烘焙进 git，push 即上线。

- **归档页**：`/:lang/daily/`（倒序文章列表）
- **单篇页**：`/:lang/daily/YYYY-MM-DD/`
- **聚合模块**：`src/pages/daily.ts`（独立于 registry，导出 `DAILY_POSTS` / `DAILY_ARCHIVE_META`）

### 内容结构（三段式）

每篇文章正文包含三个 `<section>`：

| 段 | class | 内容 | 数据来源 |
|---|---|---|---|
| A | `daily-almanac` | 黄历宜忌（四柱干支、五行、纳音、冲煞、喜/财/福神方位、节气、吉神凶煞、宜/忌）+ 解读文字 | `npm run almanac -- YYYY-MM-DD` |
| B | `daily-zodiac` | 当日地支对应生肖为单一主角运势 | 手写（当日地支决定主角） |
| C | `daily-story` | 围绕当日主题的玄学科普/典故 | 手写 |

### 新增一篇内容的流程

用户说"写一篇博客"时，按 [每日内容生产手册](./docs/superpowers/daily-content-playbook.md) 执行 7 步流程：

1. **确定日期** — 默认明天
2. **跑 almanac** — `npm run almanac -- YYYY-MM-DD` 获取历法数据
3. **写 A 段** — 宜忌数据填入模板 + 写 2-4 句解读
4. **写 B 段** — 当日生肖主角运势（其余生肖留占位）
5. **写 C 段** — 科普/典故
6. **写英文版** — 中英一一对应
7. **注册提交** — 加 HTML 文件 + 更新 `daily.ts` 的 DAILY_POSTS

### 用户审核三看

- 双语齐全（zh + en 都有）
- 三段齐全（almanac / zodiac / story 都有）
- 数据一致（HTML 中的宜忌与 almanac 输出一致）

### 已知边界

- B 段目前只写当日地支对应的单一生肖，其余 11 个生肖显示占位文本（未来可扩展留言问答功能）
- 无自动归档/过期机制，历史文章永久保留
- `DAILY_ARCHIVE_META` 在 nav/footer 中显式引用（不经过 registry 的 `navPages()`），属合理破例

## 每周 / 每月运势栏目

### 架构概览

与每日宜忌栏目同源架构：纯静态更新、零运行时 LLM 调用。数据骨架由生成期工具自动推出（`npm run fortune:week` / `fortune:month`，历法来自 lunar-javascript，地支关系与评分规则在 `src/fortune/rules.ts`、有单测），文案基于骨架撰写，烘焙进 git。

- **周运**：周日发布，覆盖下周一至周日。归档页 `/:lang/weekly/`（倒序），单篇页 `/:lang/weekly/YYYY-MM-DD/`（日期 = 该周周一）。聚合模块 `src/pages/weekly.ts`。
- **月运**：每月最后一日发布，覆盖下月。归档页 `/:lang/monthly/`（倒序），单篇页 `/:lang/monthly/YYYY-MM/`。聚合模块 `src/pages/monthly.ts`。

### 内容结构

| 栏目 | section class | 内容 | 数据来源 |
|---|---|---|---|
| 周运 | `weekly-summary` | 导语 + 特吉/次吉/忠告生肖排名 | `npm run fortune:week -- 周一日期`（评分 = 一周内六合/三合天数减冲/害天数，排序后取前 3 为特吉、次 3 为次吉、最低为忠告） |
| 周运 | `weekly-clash` | 七天冲煞表（每日冲肖 + 煞方） | 同上（日支 → 冲肖 / 煞方查表） |
| 周运 | `weekly-zodiacs` | 12 生肖 × 六行（整体/财运/爱情/事业/健康/建议） | 骨架中各生肖逐日关系 + 手写文案 |
| 周运 | `weekly-days` | 每日要点（干支/冲煞/建除天神/宜忌）+ 链每日归档页 | 同上 |
| 月运 | `monthly-summary` | 月柱分段、节气、月支关系总览 + 排名（六合/三合/相冲/相害） | `npm run fortune:month -- YYYY-MM` |
| 月运 | `monthly-zodiacs` | 12 生肖 × 六维深化（每维 2–3 句） | monthRelation 定基调（六合/三合/值月/相害/相冲，无关系者按五行气势）+ 手写文案 |
| 月运 | `monthly-lucky` | 吉日速查五类（嫁娶订婚/入宅搬家/开业求财/出行/修造动土） | luckyDays 中「天神吉 + 宜含该事项且不在忌」的日期 |

### 生产流程

- 用户说"写周运"：按 [周运生产手册](./docs/superpowers/weekly-content-playbook.md) 执行 7 步流程（确定周一 → 跑 fortune:week → 读评分 → 写中文四大块 → 写英文 → 注册 weekly.ts → 测试提交）。
- 用户说"写月运"：按 [月运生产手册](./docs/superpowers/monthly-content-playbook.md) 执行（确定月份 → 跑 fortune:month → 写中文 → 写英文 → 注册 monthly.ts → 测试提交）。
- 设计与决策记录见 [weekly/monthly 栏目设计文档](./docs/superpowers/specs/2026-08-17-weekly-monthly-columns-design.md)。

### 已知边界

- 周运/月运正文片段自带 `<h1>`（每日栏目单篇的 h1 由布局层生成），属有意差异。
- 周运的每日要点自含关键信息，只链每日归档页，不前链尚未发布的每日单篇。
- 导航「运势」下拉为纯 CSS 实现（hover / :focus-within 展开），无 JS、无动态 aria-expanded。
- 评分规则按「逐日关系计数」回测复现黄大仙祠 2026-08-17 周排名；加权方案已否决，不要改回。

## FAQ 页面（择吉页为首个使用示例）

给页面加 FAQ：在 `registry.ts` 的 `PageEntry` 上填可选字段 `faq?: Record<Lang, { question: string; answer: string }[]>`，head 即自动注入带 `mainEntity`（Question/Answer 数组）的 FAQPage JSON-LD（`faqJsonLd`，见 `src/seo/jsonld.ts`），无需手写 meta 或 JSON-LD：

```ts
// registry.ts（参考 zeji 页）
{
  slug: "zeji",
  inNav: true,
  meta: { zh: {...}, en: {...} },
  content: { zh: zejiZh, en: zejiEn },
  faq: {
    zh: [{ question: "...", answer: "..." }],
    en: [{ question: "...", answer: "..." }],
  },
}
```

正文片段中问答用语义化结构（如 `<h2>问题</h2><p>答案</p>` 或 `<details><summary>`），中英两版问答需一一对应，且 `faq` 字段内容与正文 FAQ 保持一致。

**已知边界**：`faqJsonLd` 的 FAQPage `mainEntity` 已实现并有单测覆盖（择吉页首个使用，占卜总览页第二例，紫微斗数页第三例，上线后宜用 Google Rich Results Test 验证）。`jsonldType: "FAQPage"` 仅切换 `pageJsonLd` 的 `@type`、不含 `mainEntity`，与 `faq` 字段机制独立，暂无页面使用。

## 已知取舍（不要"顺手修复"）

- 无尾斜杠路径无条件 301（先规范化再判存在），是计划预定策略。
- `onError` 500 分支无集成测试（不为测试往生产代码塞抛错路由）。
- sitemap 未含 x-default alternate（Google 文档标注可选）。
- `jsonldType: "FAQPage"` 已定义但暂无使用页面，属前瞻性预留（用法与边界见上节「FAQ 页面」）。
- daily / weekly / monthly 聚合模块均不并入 registry 的 PAGES（各自独立维护 POSTS 数组），是高频更新场景下的有意设计——避免每次新增内容都改动固定页面注册表。

## 上线前检查清单（同 README）

`SITE_ORIGIN` 已设为正式域名（`https://suanming-zhanbu.com`）→ 替换 `og-default.png`（1200×630）→ 确认 Cloudflare Git 集成 → `wrangler secret put LLM_API_KEY` → Google Rich Results Test 抽查 JSON-LD。
