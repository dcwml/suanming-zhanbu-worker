# 时辰推演生产手册（农历九月篇交接）

> 本手册供新会话零上下文开工：生产农历九月（预计 2026-10-10 开月，以扫描输出为准）的时辰推演文章。七月、八月两篇的完整先例均在仓库内，所有步骤照抄即可。

## 本次任务参数

| 项 | 值 | 说明 |
|---|---|---|
| 目标农历月 | 九月 | 初一预计为 **2026-10-10**（八月篇 lastDay = 2026-10-09 = 八月廿九），**必须以第 1 步扫描输出为准** |
| slug | 农历月首日公历日期 `YYYY-MM-DD` | 先例：七月 `2026-08-13`、八月 `2026-09-11`；即正文文件名与 URL 键 |
| 内容文件 | `src/content/tuiyan/<slug>.zh.html` + `.en.html` | 只有正文，无 html/head/body |
| 骨架落盘 | `tmp/tuiyan-2026-lunar09.json` | tmp/ 是 git-ignored 草稿区，不入库 |
| 核验脚本 | `tmp/verify-september.cjs` | 抄 `tmp/verify-august.cjs` 改造，不入库 |
| 交付物 | 2 个内容文件 + `src/pages/tuiyan.ts` + 3 个测试文件 | 共 6 个文件，见第 9 步提交清单 |

## 栏目架构 30 秒速览

- 每个农历月一篇，单篇页 `/:lang/tuiyan/<slug>/`，归档页 `/:lang/tuiyan/`（倒序）。
- 聚合模块 `src/pages/tuiyan.ts`（不进 registry）：`TUIYAN_POSTS` 数组 + `findTuiyanPost()`（按 firstDay 精确匹配）+ `tuiyanArchive()`（localeCompare 倒序）。
- SEO/sitemap/导航/JSON-LD 全部自动派生（`tuiyanArticleJsonLd`、sitemap 单篇+归档、nav「运势」下拉），**不要手写任何 meta 或 sitemap 条目**。
- 纯静态、零运行时计算：骨架由生成期 CLI 扫描烘焙进正文。

## 生产九步

### 1. 跑扫描，锁定九月初一

PowerShell 5.1 的 `>` 重定向输出 UTF-16 带 BOM，node 无法解析——**必须经 cmd 转发字节级重定向**：

```powershell
cmd /c "npx tsx scripts/tuiyan.ts 2026-10-10 > tmp\tuiyan-2026-lunar09.json 2>nul"
```

CLI 参数是农历月内**任意一天**（自动回退归一到初一），传 2026-10-10 即使猜错也会归到正确月份。跑完验证三件事：

```powershell
node -e "const j=require('./tmp/tuiyan-2026-lunar09.json'); console.log(j.lunarMonthLabel, j.firstDay, j.lastDay, j.days+'天', j.totalHours+'时辰'); console.log(j.daily[0].lunarLabel);"
```

- `lunarMonthLabel === "九月"`（若输出「十月」说明 10-10 已过九月初一，改传 2026-09-30 重跑）；
- `daily[0].lunarLabel === "九月初一"`；
- 记下 `firstDay`（= slug）、`lastDay`、`days`（29 或 30 天）、`totalHours`（= days × 12）。

### 2. 读骨架：TuiyanScanResult 字段导读

| 字段 | 类型 | 用途 |
|---|---|---|
| `monthPillarSegments` | `{monthGanZhi, from, to}[]` | 总览段写月柱分段（按每日午时代表，精确交节时刻归段） |
| `jieQiInMonth` | `{name, date}[]` | 总览段写节气 |
| `grand` | `HourSlot[]` | 一级大格（三合成局 ∨ 三合方会 ∨ 标记总数≥4），正文主体 |
| `kuigangDays` | `{date, dayGanZhi, lunarLabel, hours[]}[]` | 魁罡专节（每魁罡日 12 时辰全表） |
| `daily` | `DailyHighlight[]` | 每日速查表（10 列：公历/农历/日柱/纯阳日/天乙/桃花/驿马/将星/羊刃/华盖） |
| `stats` | 各格局时辰总数 | 总览段统计数字（纯阳/纯阴/天乙/桃花/驿马/将星/羊刃/华盖） |

`HourSlot = { date, hourZhi, hourRange, bazi, tags }`；tag 全集：`纯阳` `纯阴` `魁罡日` `天乙贵人时` `羊刃时` `桃花时` `驿马时` `将星时` `华盖时` `三合XXXX局` `方会XXXX` `日时干五合` `日时支六合`。

### 3. 分析格局，定总览论点

- `grand.length` = 一级大格局数；按 `date` 排序即正文批断顺序。
- 按 tag 前缀分桶统计：`三合X局` 几局、`方会XX` 几处、涉及哪些天。
- `stats.pureYang` / `pureYin`：纯阳纯阴格总数。注意结构规律（八月篇实例：月柱丁酉为阴柱时纯阳几乎不可得，全月纯阳凝于月柱转阳的一日）——先看月柱分段里有几段阳柱/阴柱，找出纯阳格落在哪些天，这就是总览段的核心叙事。
- `kuigangDays.length`：魁罡日数（庚辰/庚戌/壬辰/戊戌四种日柱）。
- 特别注意跨公历月的节气换月柱日（如八月篇寒露 10-08 交节、次日转戊戌）——这类「一日换柱」往往是本月最大看点。

### 4. 写中文正文

**范本：`src/content/tuiyan/2026-09-11.zh.html`（277 行），逐段对照抄结构。** 六段结构：

| 段 | class | 写法 |
|---|---|---|
| h1 | — | `2026农历九月特殊时辰推演：<三个看点短语>`（与 meta.title 一致） |
| 导语 | `p.tuiyan-lead` | 月份气象 + 起止公历日期（农历初一至廿九/三十）+ 天数/时辰数 + 推演口径一句 |
| 总览 | `section.tuiyan-summary` | `<h2>本月总览</h2>` + 月柱分段/节气一句 + `<ul>` 统计四条（纯阴纯阳/一级大格计数/魁罡日数，各带一句命理解读） |
| 一级大格 | `section.tuiyan-grand` | `<h2>一级·大格N局</h2>` + N 个 `<article class="tuiyan-item">`：`<h3>第N局 · 农历X日X时（M月D日 HH–HH时）</h3>` + `<p class="tuiyan-pillars">四柱：…</p>` + `<p class="tuiyan-tags">格局：…</p>` + `<blockquote class="tuiyan-verdict">` 古批一句 + `<p class="tuiyan-note">` 白话细解两三句（拆解三支何以成局、日主何性、宜何业） |
| 魁罡专节 | `section.tuiyan-kuigang` | `<h2>` + 每魁罡日一小节：12 时辰时柱简表 + 收尾段（已入一级者交叉引用局号不重复） |
| 每日速查 | `section.tuiyan-daily` | 说明段（含纯阳日本月是否成纯阳四柱的口径说明）+ `<table class="tuiyan-table">`，10 列表头照抄范本，每天一行，无格用「—」 |
| 免责 | `section.tuiyan-disclaimer` | `<h2>推演之说，聊备一格</h2>` + 一段文化框架声明（可照抄范本原文） |

**meta 体例**（注册时用，zh 实例见八月条目）：title = h1 原文；description = 「农历九月N个时辰逐时推演：<大格计数>、<魁罡日看点>、<纯阳看点>与每日亮点速查。」

硬性要求：正文自带 `<h1>`；三处 section class `tuiyan-grand` / `tuiyan-kuigang` / `tuiyan-daily` 是测试断言点，缺一必炸；正文可见文本**禁现「AI」字样**，用传统口吻（逐时推演/批断/细解）。

### 5. 写英文正文

**范本：`src/content/tuiyan/2026-09-11.en.html`，结构与中文一一对应。** 术语表（与核验脚本断言强一致，用错即 FAIL）：

- 格局英译：`纯阳→all-yang chart`、`华盖→Canopy Star`、`驿马→Traveling Horse`、`天乙贵人→Heavenly Noble`、`魁罡日→Kui Gang day`、`羊刃→Yang Blade`、`桃花→Peach Blossom`、`将星→General Star`；局名按生肖动物：`三合巳酉丑局→Snake-Rooster-Ox metal trine`、`三合寅午戌局→Tiger-Horse-Dog fire trine`、`方会巳午未→Snake-Horse-Goat southern union`、`方会申酉戌→Monkey-Rooster-Dog western union`（九月新出什么局就照此造：三合 = 三生肖动物 + 五行 trine，方会 = 三动物 + 方位 union）。en 标签行前缀 `Configuration: `，逗号分隔。
- 时辰英名（h3 用）：子 Zi / 丑 Ox / 寅 Tiger / 卯 Rabbit / 辰 Dragon / 巳 Snake / 午 Horse / 未 Goat / 申 Monkey / 酉 Rooster / 戌 Dog / 亥 Pig，后接 ` hour`。
- 速查表时辰用拼音：Zi / Chou / Yin / Mao / Chen / Si / Wu / Wei / Shen / You / Xu / Hai；空格写 `—`。
- 日期格式：zh「10月11日」、en「Oct 11」（跨 11 月用 Nov）；en 农历 h3 写 `Day 2` 式、速查表农历列写 `9/3` 式（农历月序/日序）。
- 标题样式：`Hour Omens of Lunar September 2026: <看点>`；description 用 spelled-out 数字（nineteen grand configurations 式）。

### 6. 注册 TUIYAN_POSTS

`src/pages/tuiyan.ts`：顶部加两行 html import，`TUIYAN_POSTS` 数组末尾（八月条目之后）照抄一条：

```ts
{
  firstDay: "<slug>",
  meta: {
    zh: { title: "<h1 原文>", description: "<≤120字，含N个时辰逐时推演+计数>" },
    en: { title: "Hour Omens of Lunar September 2026: …", description: "All N double-hours of lunar September 2026 charted one by one: …" },
  },
  content: { zh: tuiyan<Slug压缩>Zh, en: tuiyan<Slug压缩>En },
},
```

import 变量命名照先例：`tuiyan20260813Zh` → 九月篇 `tuiyan20261010Zh`（无连字符）。

### 7. 更新三个测试文件

**`test/tuiyan.test.ts`**（照八月用例样式）：

- 新增 `it("registers the lunar September 2026 post in both languages")`：`TUIYAN_POSTS.length` 改断 3 → 注意**八月用例里 L18 的 `toBe(2)` 和归档用例 L40 的 `toBe(2)` 也要改成 3**，否则必炸；
- 新用例断言：firstDay = slug、zh title 含「九月」、en title 含 "Hour Omens"、zh/en 含 `tuiyan-grand`/`tuiyan-kuigang`/`tuiyan-daily` 三个 class、zh/en 含 `<h1>`；
- 归档排序用例：items[0] 变九月（firstDay + title 断言），八月顺延为 items[1]；
- **地雷**：L35 `expect(findTuiyanPost("2026-10-11")).toBeUndefined()` 是未注册负例。若九月篇 firstDay 恰为 2026-10-11 此测试必炸——届时把负例改晚（如 `2026-11-01`）。firstDay = 10-10 则无需动（firstDay 精确匹配，10-11 仍 undefined）。

**`test/sitemap.test.ts`**（tuiyan 用例在 L60-79）：加 4 条 `<loc>` 断言（`/zh/tuiyan/<slug>/` 与 `/en/tuiyan/<slug>/`）+ 4 条 hreflang alternates 断言，照九月上一条的样式。

**`test/integration.test.ts`**（tuiyan describe 在 L253 起）：zh 归档用例加 `href="/zh/tuiyan/<slug>/"` 断言并更新倒序断言（新篇 index < 八月 index）；en 归档用例加对应 href 断言。

### 8. 核验脚本：verify-september.cjs

复制 `tmp/verify-august.cjs` → `tmp/verify-september.cjs`，逐点改（对照 august 版行号）：

| 位置 | 八月值 | 九月改为 |
|---|---|---|
| L3 | `tuiyan-2026-lunar08.json` | `tuiyan-2026-lunar09.json` |
| L25 | `2026-09-11.zh.html` | `<slug>.zh.html`（en 同） |
| L32/41/87 | grand 计数 `19` | 九月实际 `grand.length` |
| L57 | `(?:9月\|10月\|Sep\|Oct)` | 九月实际公历月份，预计 `(?:10月\|11月\|Oct\|Nov)` |
| L58/73 | 日行数 `29` | 九月实际 `days` |
| L62 | `replace("八月","")` | `replace("九月","")` |
| L65 | `"8/" +` | `"9/" +`（en 速查表农历月序） |
| L76/80 | 魁罡时柱 `36` | 九月实际 `kuigangDays.length * 12` |
| L94/98 | 中文数字表到「廿九」 | 若九月 30 天补 `"三十": "30"` |
| L101 | `mon === 9 ? "Sep " : "Oct "` | `mon === 10 ? "Oct " : "Nov "` |
| L43-48 | 标签翻译表 JU_EN/FANG_EN | 九月新出的局名/方会名照第 5 步术语表补条目 |

运行：`node tmp/verify-september.cjs`，输出 `ALL CHECKS PASSED` 才算过。它对 HTML 内容 vs 扫描 JSON 做全量对照（grand 四柱与标签逐条、速查表逐格、魁罡时柱逐行、h3 农历+公历+时辰交叉核对、section 计数），比人眼可靠——**数据必须全过脚本，不许手改数字凑合**。

### 9. 全量验证 + 提交

```powershell
npm run typecheck ; npm test
```

（npm test 在 Windows 首跑可能 workerd 资源耗尽：collect 阶段文件级 FAIL 但 Tests passed 计数正常 = 环境性，等 200 秒重跑即愈；可先单跑 `npx vitest run test/tuiyan.test.ts` 隔离验证。miniflare EBUSY 警告无害。）

全绿后**逐个精确 add**（并行会话共用工作区，绝不 `git add -A`）：

```powershell
git add src/content/tuiyan/<slug>.zh.html src/content/tuiyan/<slug>.en.html src/pages/tuiyan.ts test/tuiyan.test.ts test/sitemap.test.ts test/integration.test.ts
git commit -m "feat(tuiyan): add lunar September 2026 post (<slug>)"
```

tmp/ 下所有产物（json + verify 脚本）留在本地，不入库。push 前问用户（八月先例是用户明示「要 push」后才推）。

## Windows 环境坑清单

1. **PowerShell `>` 重定向**：输出 UTF-16 带 BOM，node require 必炸 → 一律 `cmd /c "... > tmp\xxx.json 2>nul"`。
2. **npm test 首跑**：workerd 并发资源耗尽，collect 阶段大面积 FAIL 但 Tests passed 正常 → 等 200 秒重跑；先单文件隔离验证省时间。
3. **git push 进度走 stderr**：PowerShell 报 NativeCommandError 是误报，成功标志是输出里 `xxxx..yyyy main -> main`；push 超时（ExitCode 124）直接重试。
4. **git add CRLF 警告**：无害。
5. **npm.ps1**：npm 走 `C:\Program Files\nodejs\npm.ps1`，正常调用即可。

## 红线

- 正文可见文本禁现「AI」字样（中文传统口吻、英文 in-depth readings 措辞）；免责段不可少。
- 双语严格对称：中英段落一一对应、速查表同构，数据以扫描 JSON 为唯一事实源。
- **不要改 `src/tuiyan/scan.ts`**（算法与规则表，改动牵动七月/八月两篇的既有事实）。
- 时辰口径勿改文案表述：取时辰中点排盘（子时取 0 点早子时）；月柱分段以每日午时为代表。
- 纯阳/纯阴只进总览统计与速查表标注，不单独成批（八月先例）。
- 设计与决策背景见 `docs/superpowers/specs/2026-08-29-tuiyan-column-design.md`。
