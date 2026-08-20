# 八字合婚工具 + 命理总览页设计文档

- 日期：2026-08-20
- 状态：设计已确认，待实施
- 需求来源：候选清单（`docs/2026-08-17-tool-candidates-design.md` §2.2 第二批第 5 项「八字合婚」）；用户 08-20 立项，要求同时新增「命理」总览页并将「命理」导航对齐「占卜」的标题链接形态
- 实施方式：直接在 main 分支 TDD 开发，push 触发 Cloudflare Workers 自动部署（用户显式指令）

---

## 1. 概述

两个交付物：

- **八字合婚**（`hehun`）：站点第七个解读工具。双人（男方/女方）出生信息输入 → 前端 lunar-javascript 双排盘 + 确定性配对规则计算 → 标签徽章展示 → 单次 LLM 调用获取整份合婚报告。
- **命理总览页**（`mingli`）：镜像 `divination` 总览页结构（工具卡 + 对比表 + FAQ），归拢八字排盘 / 紫微斗数 / 八字合婚三个命理工具。

配套导航改造：「命理」下拉标题从纯按钮变为链接（指向 mingli 总览页，与「占卜」一致），下拉菜单新增「八字合婚」子项。

核心原则与现有六工具完全一致：**前端排盘与配对计算、后端零重算只验结构、LLM 只做解读**。零新依赖、零运行时架构变化、LLM 配置零改动（复用 LLM_BASE_URL / LLM_MODEL / LLM_API_KEY）。

## 2. 决策记录

| # | 问题 | 结论 |
|---|------|------|
| 1 | 工具形态 | 交互式工具 + LLM 解读（否决纯前端零 LLM、纯静态内容页两个备选） |
| 2 | 配对规则范围 | 年支生肖关系（六合/三合/冲/害）+ 日柱关系（日支六合三合冲害 + 日干五合）+ 双方五行分布；前端算好，确定性展示并随请求传入 |
| 3 | 解读结构 | 单段：一次 LLM 调用出整份报告（否决 bazi 式三段串行） |
| 4 | 命名 | 拼音 slug `hehun` / `mingli`；标题「八字合婚 / BaZi Marriage Compatibility」「命理工具 / Destiny Tools」 |
| 5 | 表单身份 | 传统「男方/女方」双栏，性别内隐（男方=男、女方=女），只支持一男一女；LLM 按男命财星为妻、女命官杀为夫做配偶星分析 |
| 6 | 分支策略 | 直接 main 分支提交，push 自动部署，生产浏览器验证（用户显式指令） |
| 7 | 总评分 | 不做确定性总评分；徽章只标单项关系吉凶，定性总评留给 LLM（YAGNI） |

## 3. 文件清单与架构

| 变更类型 | 文件 |
|---|---|
| 新增模块 | `src/hehun/{types,validate,prompt}.ts`（hehun 无独立 llm.ts，直接 `import { callLlm } from "../llm"`，bazi/llm.ts 的转出口模式无需复制） |
| 新增路由 | `src/routes/hehun.ts`（`registerHehunRoutes`，挂在 `routes/api.ts`） |
| 新增内容 | `src/content/hehun.{zh,en}.html`、`src/content/mingli.{zh,en}.html` |
| 新增前端 | `public/assets/hehun.js` |
| 注册 | `registry.ts` PAGES 加 hehun（排 ziwei 之后）、mingli（排 hehun 之后），均 `inNav: false`、带 `faq` 字段 |
| 配置 | `wrangler.jsonc` 加 `HEHUN_RATE_LIMITER`（namespace 1007，simple 10/60s） |
| 导航 | `layout/nav.ts`：`MINGLI_NAV_ITEMS` 扩为 `[bazi, ziwei, hehun]`；命理 renderDropdown 调用加 `overviewSlug: "mingli"`；同步更新注释 |
| 页脚 | `layout/footer.ts`：`toolLinks` 加 `"hehun"`（插 ziwei 后）；mingli 不进页脚（divination 先例） |
| 样式 | `public/assets/style.css`：hehun 前缀新增（双栏表单/对照表/徽章）；divination 布局类改分组选择器 `.divination-xxx, .mingli-xxx { … }`（约 6 处，零重复） |
| 文档 | AGENTS.md（目录/导航描述/API 清单）、候选清单勾选「八字合婚」 |

SEO 全自动派生：两页走 registry 两步约定，title/canonical/hreflang/og/twitter/sitemap/FAQ JSON-LD 均无需手写。

注意：`src/fortune/rules.ts` 是生成期专用（不接入 Worker 运行时），hehun.js 需自带地支关系查表——与 liuyao.js 自带六十四卦表同模式；两组关系表（六合/三合/冲/害）与 rules.ts 同源同值，靠人工保持一致（见 §11 边界）。

## 4. 合婚页前端（hehun.js）

页面流程：**男方/女方双栏表单 → 双人排盘对照 → 配对标签徽章 → AI 解读**。

**表单**：照抄 bazi 控件集，双方各一组——公历/农历切换（农历含闰月勾选）、年（1900-2100）/月/日、时辰下拉（早子时…晚子时 13 档）。男方=男、女方=女内隐，无性别单选钮。提交按钮「开始合婚」，表单校验失败提示同 bazi 模式。

**排盘**（lunar-javascript 1.7.7，cdnjs 主源 + staticfile 回退，与 bazi 同链）：计算双方四柱干支、藏干、纳音、日主、五行统计（各柱天干+地支藏干计数的口径与 bazi.js 现行实现对齐）。

**展示区**三块：

1. **双人四柱对照**：男方/女方两张紧凑表（四柱干支 + 纳音 + 日主 + 五行统计），双栏并排，移动端（≤720px）堆叠。
2. **配对标签徽章**（前端确定性计算）：
   - 年支关系：`branchRelation(男年支, 女年支)` → 六合(吉)/三合(吉)/相冲(凶)/相害(凶)/同支(中性)/无(中性)
   - 日支关系：同上，取双方日支
   - 日干五合：甲己/乙庚/丙辛/丁壬/戊癸 → 五合(吉)/无(中性)
   - 五行互补：从双方 wuxingCount 计算——缺（计数 0）与最旺（计数最大）元素，生成如「男方缺火 · 女方火旺 → 互补」要点；无互补点则不显示该徽章
   - 徽章配色：吉=accent 系、凶=警示色、中性=muted；每枚徽章附一句固定说明文案（中英随页面语言）
3. **解读区**：按钮「获取 AI 合婚解读」→ POST `/api/hehun/interpret` → marked + DOMPurify 渲染 Markdown（CDN 链与 bazi 相同）。加载态/失败态/重试同现有模式；解读前置免责一行。

## 5. API 契约

`POST /api/hehun/interpret`，请求体（8KB 上限）：

```jsonc
{
  "lang": "zh" | "en",
  "male": PersonChart,
  "female": PersonChart,
  "pairing": {
    "yearZhi": "liuhe" | "sanhe" | "chong" | "hai" | "same" | "none",
    "dayZhi":  "liuhe" | "sanhe" | "chong" | "hai" | "same" | "none",
    "dayGan":  "wuhe" | "none"
  }
}
// PersonChart（male/female 同构）：
{
  "solar": "YYYY-MM-DD",          // 正则校验
  "lunar": string,                 // ≤100 字
  "dayMaster": string,             // ≤100 字，如 "庚金"
  "pillars": {                     // year/month/day/hour 四键
    "year":  { "ganZhi": 干支, "hideGan": string, "naYin": string },
    "month": { … }, "day": { … }, "hour": { … }
  },
  "wuxingCount": { "金": 0-8, "木": 0-8, "水": 0-8, "火": 0-8, "土": 0-8 }
}
```

校验规则（`src/hehun/validate.ts`，哲学与 liuyao/meihua 一致——只验结构，不重算配对）：

- `ganZhi` 必须命中六十甲子集合（顺序生成排除非法组合，同 bazi/validate 手法）
- `pairing` 三字段枚举白名单；`wuxingCount` 键限金木水火土、值 0-8；各文本字段 ≤100 字
- 错误消息只描述字段名，不回显用户输入值

错误码沿用全套：`invalid_json`(400)、`payload_too_large`(413)、`invalid_request`(400)、`rate_limited`(429)、`not_configured`(500)、`upstream_error`(502)、`upstream_timeout`(504)。限流按 cf-connecting-ip，绑定缺失时跳过（本地 dev/测试可用）。

响应：`{ ok: true, data: { markdown } }`（无 part 字段）。API 调用埋点 `recordApiCall` 记 `/api/hehun/interpret`（对齐 bazi）。

## 6. Prompt 设计

**System prompt**（中英两版，风格对齐 bazi/prompt.ts）：合婚资深命理师角色 + 五条规则——只基于提供数据不重排盘不质疑、Markdown 输出（二三级标题/列表/粗体、无代码块）、语气客观温和避免绝对断言、不提供医疗法律投资建议、语言约束（en 版要求汉字术语附英文短注）。另注明传统框架：男命以财星为妻、女命以官杀为夫。

**User prompt** 四块：

1. 男方命盘文本（出生公历/农历、四柱「干支（藏干 X；纳音 Y）」、日主、五行统计）
2. 女方命盘文本（同构）
3. 配对关系文本：枚举转自然语言并落具体干支（地支直接从双方 ganZhi 切取，不引入新计算），如「年支关系：六合（子丑）」「日干关系：五合（甲己）」
4. 任务指令：输出结构固定六段——①合婚总评 ②年支生肖配对 ③日柱配对（日支关系 + 日干五合）④五行互补 ⑤配偶星互见简析 ⑥相处建议；中文约 700 字 / 英文约 550 词

## 7. 命理总览页（mingli）

镜像 divination 页结构，四段 + 尾注：

1. h1「命理工具 / Destiny Tools」+ 导语（三个工具同出传统命理，看盘视角各有侧重）
2. 工具卡 ×3：八字排盘（四柱五行格局与岁运）、紫微斗数（十二宫逐宫细看）、八字合婚（双人配对）——复用通用 `.tool-card/.tool-icon/.tool-features/.tool-cta` 类，图标用汉字字符（占卜页用卦象字符 ䷜ 的同思路），CTA 文案「立即排盘 / 立即合婚」等
3. 「三者的区别」对比表（列：工具 / 看什么 / 适合的问题 / 特点）+ 一句选型建议
4. FAQ 四问（中英一一对应）：八字与紫微的区别 / 合婚看什么、结果怎么用 / 需要准备哪些信息 / AI 解读权威吗——registry `faq` 字段自动注入 FAQPage JSON-LD，正文用 `<h2>/<h3>` 语义结构与 faq 字段保持一致
5. 免责尾注（divination-note 同款）

双语内容成对编写，en 版为对应转写而非机翻腔。

## 8. 导航与页脚

- `nav.ts`：`MINGLI_NAV_ITEMS = ["bazi", "ziwei", "hehun"]`（标签自动取 registry 标题）；`renderDropdown(lang, currentSlug, MINGLI_NAV_LABEL, MINGLI_NAV_ITEMS, "mingli")`——标题从 `<button>` 变 `<a href="/:lang/mingli/">`，active 态复用 overviewSlug 现成机制；更新「纯按钮无链接」相关注释与 AGENTS.md 描述
- 下拉仍为纯 CSS（hover / :focus-within），无 JS、无动态 aria-expanded
- `footer.ts`：toolLinks 加 `"hehun"`

## 9. 测试策略（TDD 先行）

新增三个模块级测试文件（对齐现有命名与粒度）：

- `test/hehun-validate.test.ts`：合法载荷通过；lang 非法、male/female 缺失或字段逐项非法（solar 格式、ganZhi 非六十甲子、hideGan/naYin 超长、wuxingCount 键值越界、pillars 缺柱）、pairing 枚举外值——逐一失败断言
- `test/hehun-prompt.test.ts`：system prompt 中英分支要点；user prompt 含双方命盘数据、配对关系文本（六合/五合等具体样例）、六段任务指令与篇幅约束
- `test/hehun-api.test.ts`（对齐 bazi-api 模式）：限流触发 429、体积 413、非法 JSON 400、校验失败 400、LLM 未配置 500、上游错误/超时透传 502/504、成功路径响应壳形状 `{ ok: true, data: { markdown } }`

集成与既有测试更新：

- `integration.test.ts`：`/zh/hehun/`、`/en/hehun/`、`/zh/mingli/`、`/en/mingli/` 200 且含关键标记（表单/卡片/h1）；无尾斜杠 301；导航 HTML 含「命理」总览链接（`href="/zh/mingli/"` 的 `<a>`）与「八字合婚」下拉项；两页 head 含 FAQPage JSON-LD
- `sitemap.test.ts`：新 URL 双语 alternates 断言
- `registry.test.ts` / `render.test.ts` / 导航相关现有断言同步修正（命理下拉从 button 变 a 是行为变化，先改测试再改实现）

门禁：`npm test` + `npm run typecheck` 全绿后提交（Windows 下 miniflare EBUSY 警告属无害噪音）。

## 10. 文档更新与部署

- AGENTS.md：目录结构补 `hehun/` 模块与 hehun/mingli 内容文件、routes/hehun.ts；导航描述改「命理」标题链接总览页；API 形状清单加第七个路由
- `docs/2026-08-17-tool-candidates-design.md`：实施跟踪勾选「八字合婚」
- 提交节奏（main 分支，TDD）：预期 2-3 个 commit（①测试 + 后端模块与路由 ②前端 + 内容 + 导航页脚样式 ③文档），完成后一次 `git push` 触发自动部署
- 生产验证清单（浏览器打开 https://suanming-zhanbu.com/）：两新页中英 200；导航「命理」hover 展开、标题可点、含八字合婚子项；完整表单流程走通（真实 LLM 调用中英各一次，验证报告六段结构与配对引用正确）；徽章关系抽查（选一对已知六合/相冲的生日验证标签正确）；语言切换、页脚链接、404 不受影响；上线后建议 Google Rich Results Test 抽查两页 FAQ 结构

## 11. 已知边界与取舍

- 只支持一男一女传统合婚（决策 #5）；同性伴侣场景明确不支持，不做「甲方/乙方」中性模式
- 合婚只看双方原局，不排大运流年（决策 #3 单段的范围界定）
- 两支三合按「三合」标签展示（严格说是半合局），解读深度与半合语境由 LLM 把握
- 前端关系查表与 `fortune/rules.ts` 数据同源但代码独立（运行时哲学约束），两处靠人工同步，无自动一致性校验
- 不做确定性总评分与「上等婚/下等婚」断言（决策 #7）
- mingli 不进页脚工具列（与 divination 总览页先例一致）
- marked 渲染紧邻中文引号的 `**加粗**` 不生效是五工具共用渲染器的已知瑕疵，非本次回归
