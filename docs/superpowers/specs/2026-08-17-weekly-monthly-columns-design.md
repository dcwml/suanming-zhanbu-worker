# 每周运势 / 每月运势栏目设计文档

- 日期：2026-08-17
- 状态：已实施并上线（首发：周运 2026-08-17 周、月运 2026-08）
- 需求来源：用户参照广州黄大仙祠公众号周运文（mp.weixin.qq.com/s/pFzGP4Y_1Pt9JGE8XqW05g），为站点新增周运/月运两个内容栏目
- 配套手册：`docs/superpowers/weekly-content-playbook.md`、`docs/superpowers/monthly-content-playbook.md`

---

## 1. 概述

在现有「每日宜忌」栏目之外新增两个纯静态、零运行时 LLM 的内容栏目：

- **每周运势**：每周日发布，覆盖下一周（周一~周日）。内容 = 总览层（特吉/次吉/忠告生肖 + 忠告文案 + 冲忌速查表）+ 十二生肖各六维（整体/财运/爱情/事业/健康/建议）+ 逐日干支速览。
- **每月运势**：每月最后一天发布，覆盖下一个月。内容 = 月柱/节气总览 + 十二生肖六维（比周运深一档）+ 本月吉日速查（嫁娶/搬家/开业/出行/修造五类）。

核心原则与每日栏目一致：**历法数据全部来自 lunar-javascript（经 `scripts/almanac.ts` 的 `compute()`），文案在生成期烘焙进仓库内 HTML 片段，Worker 运行时零 LLM、零历法计算**。

## 2. 决策记录

| # | 问题 | 结论 |
|---|------|------|
| 1 | 发布节奏 | 周运每周日发（覆盖下周一~日）；月运每月最后一天发（覆盖下月）。URL 键：周运 = 该周周一日期，月运 = `YYYY-MM` |
| 2 | 是否与黄大仙文章逐篇对比 | **不做例行文案对比**（almanac 输出是唯一数据权威，文案对比是反目标）；改为把评分规则**回测对齐**其排序（见 §4），验证一次即固化进规则与单测 |
| 3 | 导航形态 | 新增「运势」下拉菜单（纯 CSS，hover/focus-within 展开），子项：每日运势 / 每周运势 / 每月运势；daily 从平铺导航移入下拉 |
| 4 | 周运逐日段与 daily 栏目的链接关系 | **自含 + 链归档**：逐日速览自带每日一行，不链接未写出的 daily 单篇，尾部统一链 `/zh/daily/` 归档页 |
| 5 | 月运范围 | 六维深化（每维 2–3 句）+ 月柱节气总览 + 吉日速查（五类），不做逐日内容 |
| 6 | 聚合模块是否并入 registry | **不并入**（与 daily 相同的取舍）：`src/pages/weekly.ts` / `monthly.ts` 各自维护 `WEEKLY_POSTS` / `MONTHLY_POSTS` |

## 3. URL 与 SEO 方案

| 页面 | URL | head | JSON-LD |
|---|---|---|---|
| 周运归档 | `/:lang/weekly/` | `buildWeeklyArchiveHead` | CollectionPage |
| 周运单篇 | `/:lang/weekly/YYYY-MM-DD/` | `buildWeeklyPostHead` | Article（datePublished = 周一日期） |
| 月运归档 | `/:lang/monthly/` | `buildMonthlyArchiveHead` | CollectionPage |
| 月运单篇 | `/:lang/monthly/YYYY-MM/` | `buildMonthlyPostHead` | Article（datePublished = 当月 1 日） |

- 无尾斜杠路径一律 301 补斜杠（与 daily 相同，先规范化再判存在）
- 路由注册在通用 `/:lang/:slug` 之前；monday 校验 `^\d{4}-\d{2}-\d{2}$`，month 校验 `^\d{4}-\d{2}$`
- `buildStandardHead` 共享助手：daily/weekly/monthly 单篇与归档页的 canonical/hreflang/og/twitter 统一走同一实现（本次顺带把 daily 两个 head 迁移到该助手，输出不变）
- sitemap 增加 weekly/monthly 归档与单篇 URL（双语 alternates，与 daily 相同模式）

## 4. 吉运排序规则（周运核心算法）

实现在 `src/fortune/rules.ts`（纯函数，18 个单测覆盖），生成期 CLI 在 `scripts/fortune.ts`：

1. **关系判定** `branchRelation(a, b)`：六合 → 相冲 → 相害 → 三合（优先级固定），值日返回中性
2. **逐日计分** `weekZodiacScores`：每生肖对本周 7 天日支逐一查关系，吉（六合/三合）+1、凶（冲/害）−1、值日 0
3. **排序**：总分降序 → 正分天数降序 → 生肖固定序（鼠牛虎…）
4. **名次** `pickFortuneRanks`：前 3 = 特吉，4–6 = 次吉；总分最低 = 忠告生肖，并列时取年生肖（本命年压力更大）

**回测验证**：以黄大仙祠 2026-08-17 周运为基准（特吉鸡鼠牛 / 次吉猴狗猪 / 忠告马），最初尝试加权评分（六合+2/三合+1/冲−2/害−1）复现失败（次吉混入虎）；改为逐日计数评分后**精确复现**其名次。该用例固化为 `test/fortune-rules.test.ts` 的回归测试。

**月运关系**：月支取月中第 15 天的日支所在月柱（`monthBranch`），生肖与月支的关系（六合/三合/冲/害/值月）由同一套 `branchRelation` 表推导，只做定性基调，不计分排序。

## 5. 生成器 CLI

```powershell
npm run fortune:week -- 2026-08-17    # 参数必须是周一；输出 7 天骨架 + 生肖评分 + ranks
npm run fortune:month -- 2026-08      # 输出月柱分段 + 节气 + 生肖月关系 + 五类吉日速查
```

- 底层复用 `scripts/almanac.ts` 的 `compute()`（已加 `isDirectRun` 守卫，可被 import 而不触发 CLI）
- 月运吉日筛选规则内置于 `LUCKY_CATEGORIES`：天神为吉 **且** 匹配宜项不在忌中；五类 = 嫁娶纳采订盟 / 入宅移徙安床 / 开市交易立券纳财 / 出行 / 修造动土竖柱上梁盖屋

## 6. 代码落点

| 模块 | 文件 |
|---|---|
| 关系表 + 评分规则 | `src/fortune/rules.ts`（进 tsconfig、有单测；不放 scripts/ 因 scripts 不在 typecheck 范围） |
| 生成期 CLI | `scripts/fortune.ts` |
| 聚合模块 | `src/pages/weekly.ts` / `src/pages/monthly.ts`（含 `*_ARCHIVE_META`） |
| 正文片段 | `src/content/weekly/YYYY-MM-DD.{zh,en}.html`、`src/content/monthly/YYYY-MM.{zh,en}.html` |
| 路由 | `src/routes/pages.ts`（weekly/monthly 各 4 条，注册在 `/:lang/:slug` 之前） |
| 渲染 | `src/layout/render.ts`：`renderWeeklyPost/Archive`、`renderMonthlyPost/Archive` |
| head | `src/seo/meta.ts`：`buildStandardHead` + 4 个 builder |
| JSON-LD | `src/seo/jsonld.ts`：`weeklyArticleJsonLd` / `monthlyArticleJsonLd` / 泛化的 `collectionPageJsonLd(lang, name?, slug?)` |
| 导航/页脚 | `src/layout/nav.ts`（FORTUNE_NAV_LABEL/ITEMS + .nav-dropdown）、`src/layout/footer.ts`（运势栏，daily 自「关于」移入） |
| 样式 | `public/assets/style.css`：.nav-dropdown*、.weekly-*、.monthly-*、.zodiac-*、.rank-*、.lucky-*、.day-row（页脚 grid 改 4 列） |

## 7. 已知取舍

- 周运/月运单篇的正文片段内自带 `<h1>`（与 meta.title 相同），而 daily 单篇无 h1——新栏目采用更好的做法，暂不回改 daily
- 下拉菜单为纯 CSS（hover + focus-within），无 JS；触屏点按按钮获得焦点即展开，可用但无 aria-expanded 动态切换
- `rank-good/rank-neutral/rank-bad` 三个 CSS 变体已预留（月运 fortune-ranks 目前只用 rank-te/rank-ci/rank-warn）
- 周运不链接具体 daily 单篇（决策 #4），未来若周运发布时该周 daily 已齐，可考虑补链，届时改手册即可
