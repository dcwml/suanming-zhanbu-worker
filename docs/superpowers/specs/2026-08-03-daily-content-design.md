# 每日宜忌栏目设计（2026-08-03）

来源需求：用户希望「每天写一篇博客」做日更内容，选题倾向「今日宜忌 / 运势」，面向所有人（与具体个人无关）。经讨论确定栏目定位、内容形态与落地架构。本文件既是设计文档，也是日后每日生成内容时所依据的**长期记录**。

## 栏目定位（为什么这个题材合适）

用户的两个核心目的：**SEO 引流**（拉新）+ **提升回访**（留存）。经分析，「今日宜忌/运势」题材在这两点上均成立，但需拆成三段互补结构才能规避各自短板：

| 段落 | 形态 | 解决的问题 |
|---|---|---|
| A · 黄历宜忌 | 程序化核心数据 + 简短解读 | 确定可复现的结构化内容，SEO 护城河、可上 Rich Results、差异化（独家结构化数据） |
| B · 生肖运势 | 当日地支对应的**单一**生肖主角 | 给对应生肖用户明确的回访理由；「单主角」化解每日运势最大 SEO 痛点——同质化 |
| C · 玄学科普/典故 | 围绕当日主题的小知识或故事 | 增加内容厚度，覆盖长尾搜索词 |

关键洞察：B 段采用「当日地支对应生肖 = 本日主角」（如子日写鼠），十二天一轮。地支天然 12 个对 12 生肖，与 A 段干支数据同源，无需维护任何轮换状态——比「按顺序轮」或「用天干」都更自洽。其余生肖留一句占位或留白，为未来「留言问其他生肖」功能预留接口（本期不实现）。

## 关键决策（已与用户确认）

1. **生产方式：半自动（AI 生成 + 人工审核）**。每日工作流：用户说「写一篇」→ AI 生成中英 HTML → 用户审核 → `git push` → Cloudflare Workers Builds 自动部署。SEO 合规风险低（人工把关），可持续性强。
2. **架构：纯静态日更**。每日新增静态 HTML 片段，git 仓库即数据源。零新基础设施（不引入 KV/D1），与现有「git push 部署」工作流天然契合，SEO 最稳。
3. **零运行时 LLM 调用**。整个每日栏目不挂任何 `/api/*` 接口，所有内容（含 A 段解读）在生成时即烘焙进静态 HTML。这与现有 `bazi`/`liuyao` 页面的「实时输入 → 实时调 LLM」模式完全不同——每日栏目无密钥依赖、加载快、内容可被搜索引擎完整抓取。
4. **A 段包含解读**：A 段不止列宜忌，还要对建除十二神、冲煞、当日干支五行给出简短解读。该解读由 AI 在生成时直接写出（基于固定历法规则），**不调用 LLM 接口**。
5. **URL 形态**：单篇 `/daily/YYYY-MM-DD/`（带尾斜杠），归档页 `/daily/`。栏目 slug = `daily`。无尾斜杠路径一律 301（沿用现有规范化策略）。
6. **双语对称**：遵循项目核心约定，每篇文章中英各一篇，AI 生成两版、用户审核。
7. **删除 sample 页面**：示例页（slug=`sample`）已完成使命，本期一并删除其内容文件、registry 注册、footer 链接及相关测试断言。
8. **导航与页脚接入 daily**：主导航与页脚「关于」列均加入 daily 归档页入口（中文「今日宜忌」/ 英文「Daily Almanac」→ `/:lang/daily/`）。daily 模块导出归档页元信息（`DAILY_ARCHIVE_META`）供 `nav.ts`/`footer.ts` 引用；daily 单篇不注册进 registry。

## 内容结构（三段式）

每篇每日文章正文片段由三段组成，统一用语义化 HTML 区块包裹（便于归档页/未来样式差异化）。

### A · 黄历宜忌（含解读）

程序化核心数据，由 lunar-javascript 在**生成时**计算并烘焙为静态 HTML（非运行时计算）：

- 公历日期、农历日期；
- 当日四柱干支中的日柱干支、当日地支；
- 建除十二神（建/除/满/平/定/执/破/危/成/收/开/闭）；
- 五行（日干五行）；
- 冲煞生肖；
- 由建除十二神查标准宜忌表得出的「今日宜／今日忌」列表；
- **解读段**：基于当日建除十二神含义、冲煞、干支五行，用 2–4 句话解释今日整体基调与宜忌的由来。该段由 AI 生成时直接撰写，遵循「解释为什么」而非「堆砌术语」的原则。

### B · 生肖运势（当日地支主角）

- 主角 = 当日地支对应生肖（子鼠/丑牛/寅虎/卯兔/辰龙/巳蛇/午马/未羊/申猴/酉鸡/戌狗/亥猪）；
- 一段详细运势（事业/财运/人际/健康等择要，由 AI 撰写）；
- 其余生肖：留一句占位说明或留白，结构上预留未来「留言问其他生肖」的接口位置，**本期不实现该功能**。

### C · 玄学科普 / 典故

围绕当日主题（干支、节气、神煞典故、历史逸事等）的小知识或故事一段，增加内容厚度与长尾 SEO 覆盖。

## 技术架构

### 文件组织

```
src/content/daily/
  2026-08-03.zh.html
  2026-08-03.en.html
  2026-08-04.zh.html
  2026-08-04.en.html
  ...
```

每个文件仅正文片段（无 html/head/body），遵循现有 `html.d.ts` ambient 声明 + wrangler Text rules。两版 DOM 结构一致，仅文案不同。

### 生成期工具：`scripts/almanac.ts`

为确保 A 段历法数据（干支、建除十二神、五行、冲煞、宜忌）**准确可复现**，新增本地生成期脚本。要点：

- 在 Node 环境用 `lunar-javascript`（作为 **devDependency**，仅生成期使用，**不入 Worker 运行时**——与 bazi 页前端 CDN 引入是两回事）计算当日历法量；
- 脚本内置「建除十二神 → 宜/忌」查表数据（传统黄历映射表，作为受控数据写入脚本）；
- 入参：日期（默认今天）；输出：结构化 JSON（公历日期、农历日期、日柱干支、当日地支、建除十二神、五行、冲煞生肖、宜列表、忌列表）；
- `package.json` 加一条 `almanac` 脚本，如 `npm run almanac -- 2026-08-03`；
- AI 基于该 JSON 撰写 A 段解读与 B/C 段文案，烘焙成静态 HTML。

数据源唯一、可复核，避免 AI 凭记忆推算干支出错。宜忌表作为受控常量，变更时只改这一处。

### 聚合模块：`src/pages/daily.ts`

新增独立模块，**不并入 `registry.ts` 的 `PAGES`**（daily 是动态增长的列表，不应每天手改固定页面注册表）。导出：

- `DailyPost` 接口：`date`（`"YYYY-MM-DD"`）+ 双语 `meta`（title/description）+ 双语 `content`；
- `DAILY_POSTS: readonly DailyPost[]`：按日期倒序（新文章在前）；
- `findDailyPost(date)`：精确查找，找不到返回 `undefined`（交给路由走 404）；
- `dailyArchive()`：归档页所需数据（date + 双语 title 列表）。

每个 daily HTML 文件在模块顶部 `import` 进来（同 registry 现有写法），新增文章即在 `DAILY_POSTS` 加一条。

### 路由扩展：`src/routes/pages.ts`

在现有页面路由基础上增加两条规则（无尾斜杠仍由现有 301 逻辑统一处理）：

| 路径 | 行为 |
|---|---|
| `/:lang/daily/` | 归档页：按日期倒序列出所有 daily 文章标题+链接，`<h1>` 栏目名，JSON-LD `CollectionPage` |
| `/:lang/daily/:date/` | 单篇：`findDailyPost(date)`，日期正则校验 `^\d{4}-\d{2}-\d{2}$`，不存在 → 复用 `renderNotFound` |

单篇渲染复用 `renderPage`（同一布局/SEO 管线），传入 daily 的 meta + content。归档页如复用 `renderPage` 困难，在 `render.ts` 增加一个最小列表渲染辅助（不强造新抽象，沿用现有风格）。

### 与现有系统的集成点

| 系统 | 改动 |
|---|---|
| `seo/sitemap.ts` | 纳入所有 daily 单篇 + 归档页（双语 alternate，基于 `SITE_ORIGIN` + `pagePath`）；**移除 sample 条目** |
| `seo/jsonld.ts` | 单篇用 `Article` 类型，补 `datePublished`/`dateModified`/`author`/`headline`；归档页用 `CollectionPage`。现 `pageJsonLd` 只切 `@type`，需扩展支持 Article 的日期字段 |
| `layout/nav.ts` | 主导航加入口：「今日宜忌」/「Daily Almanac」→ `/:lang/daily/`。daily 归档页不在 `navPages()`（registry），需让 `nav.ts` 兼容引用 `daily.ts` 导出的 `DAILY_ARCHIVE_META` |
| `layout/footer.ts` | 「关于」列 `["", "sample"]` → `["", "daily"]`（首页 + 今日宜忌归档）。daily 条目标题取自 `DAILY_ARCHIVE_META` 而非 `findPage()` |
| `pages/registry.ts` | **删除 sample** 的两条 import 与 `PAGES` 条目；daily 不注册于此 |
| `content/sample.zh.html`、`sample.en.html` | **删除** |

## SEO 细节

- **单篇 canonical/hreflang/og**：复用 `buildHead`，canonical = `absoluteUrl(pagePath(lang, "daily/" + date))`（具体 pagePath 拼接在 plan 阶段定，原则是不手拼 `https://`，走 `absoluteUrl`）。
- **Article JSON-LD 必填字段**：`@type: Article`、`headline`（= 文章 title）、`datePublished`、`dateModified`（= 当日 ISO 日期）、`author`（站点/品牌名）、`mainEntityOfPage`（= canonical）。文本经 `escapeHtml`/`toJsonLdScript` 现有纪律处理。
- **归档页**：`CollectionPage`，列出文章项。
- **sitemap**：daily 单篇与归档页全部纳入，双语 alternate 齐全。

## 每日工作流（标准动作）

用户说「写一篇博客」时，AI 按以下步骤产出（严格依本 spec）：

1. 确定目标日期（默认今天，按用户提供）；
2. 运行 `npm run almanac -- <date>` 生成当日历法 JSON（干支、建除十二神、五行、冲煞、宜忌）→ AI 据此写 A 段（含解读）；
3. 当日地支 → 定 B 段生肖主角 → 写主角运势段 + 其余生肖占位；
4. 围绕当日主题写 C 段科普/典故；
5. 产出 `src/content/daily/YYYY-MM-DD.zh.html` + `.en.html`（结构一致、文案对应）；
6. 在 `src/pages/daily.ts` 的 `DAILY_POSTS` 加一条 import + 注册；
7. 提交 diff 给用户审核 → 用户 `git push` → 自动部署。

**重复性约束**：每日生成必须双语齐全、三段齐全、A 段宜忌与建除十二神一致。审核重点即这三点。

## 健壮性与错误处理

- 访问不存在日期（如 `/zh/daily/2026-13-45/` 或 `/zh/daily/2099-01-01/`）→ 日期正则不匹配或 `findDailyPost` 返回 `undefined` → 走现有 `renderNotFound`。
- 日期格式非 `YYYY-MM-DD` → 不匹配路由，落入 404。
- 无运行时外部依赖失败路径（全静态），无超时/限流/上游错误分支。

## 测试计划（TDD 先行）

遵循项目「改行为先改/加测试」约定，所有断言基于 `SITE_ORIGIN` 常量（不硬编码域名）。

- `test/integration.test.ts` 补充：
  - `/zh/daily/` 与 `/en/daily/` 返回 200，含归档页标题；
  - 存在的 `/zh/daily/<fixture-date>/` 与 `/en/daily/<fixture-date>/` 返回 200，含三段结构标记；
  - `/zh/daily/<fixture-date>`（无尾斜杠）→ 301 到带尾斜杠；
  - `/zh/daily/2099-01-01/`（不存在）→ 404；
  - `/zh/daily/not-a-date/` → 404。
- `test/daily.test.ts`（新增）：`findDailyPost` 命中/未命中、`dailyArchive` 排序与字段。
- `test/jsonld.test.ts`：Article JSON-LD 含 `datePublished`/`dateModified`/`author`，`</script>` 转义正确。
- `test/sitemap.test.ts`：sitemap 含 daily 单篇与归档页、双语 alternate；**不再含 sample**。
- **删除/改造 sample 相关测试**：
  - `test/integration.test.ts`：删除「redirects /en/sample」「renders en sample page」两条；render 测试改用 daily fixture 或已有页面。
  - `test/render.test.ts`：`findPage("sample")` → 改用 `findPage("bazi")`（或其他现存 slug），同步更新断言中的 `/sample/` 链接与正文文本（"How to Add a Page"）。
  - `test/meta.test.ts`：该文件用 `slug: "sample"` 作**自建 fixture**（不读 registry），技术不受影响；为避免语义混淆可改为中性 slug（可选，非必须）。

fixture：在 `DAILY_POSTS` 内置 1–2 篇测试文章（或测试专用构建），避免依赖真实日期。

## 已知取舍（不要「顺手修复」）

- **仓库增长**：每日两文件，一年约 730 个小文件。git 完全可承受；若未来成负担，老文章可按年归档（本期不做）。
- **A 段运行时不重算**：因当日生成当日发，烘焙进静态完全够用，不引入运行时历法计算（方案 2 的半动态收益不成比例，已舍弃）。
- **不做留言/UGC**：B 段其余生肖的「留言问其他生肖」属未来功能，本期只留结构占位。
- **不接 RSS**：未列入本期需求，未来可加（对日更栏目的回访/订阅有价值，但属独立议题）。
- **nav/footer 对 daily 特殊处理**：daily 归档页不走 registry，nav/footer 需显式引用 `daily.ts` 的 `DAILY_ARCHIVE_META`。这破坏了「registry 单一来源」的纯粹性，但 daily 本质是动态增长的独立栏目，与固定页面分离是合理的（已在关键决策第 8 条确认）。
