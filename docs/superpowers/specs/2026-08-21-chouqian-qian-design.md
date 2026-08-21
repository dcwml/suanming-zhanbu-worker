# 灵签抽签栏目 设计文档

- 日期：2026-08-21
- 状态：已实施（2026-08-21）
- 需求来源：[未来工具候选清单](../../2026-08-17-tool-candidates-design.md) 第 2.3 节「抽签民俗类」（第一批快赢第 1 项）
- 交付范围：4 个页面（抽签总览 + 黄大仙灵签/观音灵签/月老灵签）+ 顶部导航「抽签」下拉 + 三套签文数据 + 共享抽取交互

---

## 1. 需求概述

新增「灵签」栏目：一个总览页（chouqian）+ 三个工具页（黄大仙灵签/观音灵签/月老灵签）。与命理/占卜栏目同构：总览页讲清三种签怎么选，工具页提供在线抽签。

架构定位（沿用候选清单结论）：**纯静态、零 LLM 成本**。签文数据是传统民俗文本，烘焙进 `public/assets/qian/` 下的 JS 数据文件，抽取与解签展示全部在前端完成，不新增任何 API 路由。先搭通用结构（签文数据 + 抽取交互 + 解签展示），再横向复制签种——未来加关帝灵签等品类 = 数据文件 + 正文片段 + registry 三步。

## 2. URL 与注册

| slug | 页面 | zh 标题 | en 标题 | inNav |
|---|---|---|---|---|
| `chouqian` | 总览页 | 灵签抽签 | Fortune Sticks Guide | false |
| `huangdaxian` | 工具页 | 黄大仙灵签 | Wong Tai Sin Oracle Sticks | false |
| `guanyin` | 工具页 | 观音灵签 | Guanyin Oracle Sticks | false |
| `yuelao` | 工具页 | 月老灵签 | Yue Lao Oracle Sticks | false |

四个页面均走固定页面两步流程：`src/content/<slug>.{zh,en}.html` → `registry.ts` 加 `PageEntry`（均带双语 FAQ，head 自动注入 FAQPage JSON-LD；SEO/sitemap/canonical/hreflang 全部自动派生）。总览页 h1「灵签抽签」，工具页 h1 即签种名。

## 3. 导航改造（nav.ts / footer.ts）

- 新增 `CHOUQIAN_NAV_LABEL`（zh「抽签」/ en「Fortune Sticks」）与 `CHOUQIAN_NAV_ITEMS`（huangdaxian、guanyin、yuelao，标签取 registry title 单一来源），下拉标题链接 chouqian 总览页（同「命理」「占卜」下拉）。
- 导航顺序变为：首页 · [命理 ▾] · [占卜 ▾] · 择吉日 · **[抽签 ▾]** · [运势 ▾]（「抽签」下拉插在择吉日之后、运势之前）。
- footer「工具」列追加三个工具页 slug（`["bazi","ziwei","hehun","liuyao","meihua","xiaoliuren","huangdaxian","guanyin","yuelao"]`）；总览页不进 footer（同 mingli/divination 现状）。

## 4. 签文数据（public/assets/qian/）

每签种两份语言文件 + 一份共享交互脚本：

```
public/assets/qian/
  huangdaxian.zh.js / huangdaxian.en.js
  guanyin.zh.js     / guanyin.en.js
  yuelao.zh.js      / yuelao.en.js
  chouqian.js       ← 共享交互（三签种同一份）
```

数据文件为普通 JS（非模块），挂 `window.QIAN_DATA`，页面按语言只加载对应文件。zh 文件结构：

```js
window.QIAN_DATA = {
  id: "huangdaxian",
  total: 100,
  name: "黄大仙灵签",
  grades: ["上上", "上吉", "中吉", "中平", "下"],   // 由好到差排序
  aspects: ["姻缘", "事业", "求财", "健康"],        // 固定断语类目
  signs: [
    {
      no: 1,                      // 1..100
      grade: "上上",
      title: "签题典故名",
      poem: "七言四句，\n以换行分隔四行",
      meaning: "解签白话散文（2-4 句，首句点出典故题旨，末句落到现实建议）",
      aspects: ["verdict", "verdict", "verdict", "verdict"],  // 与 aspects 类目一一对齐
    },
    // …共 total 条
  ],
};
```

en 文件在 zh 结构上增加：`nameZh`（原签种名）、`gradeLabels`（等级英文对照）、每签 `titleZh`/`poemZh`（保留中文原文与英文并列展示）。

内容来源与红线：

- 签诗、等级、签题为传统民俗文本的**逐字转写**（多源交叉核对，来源清单存 `docs/qian-data-sources/`）；`meaning`/`aspects` 为基于传统解曰撰写的原创白话，**不得逐字照抄任何网站的解签文案**。
- 三个签种的断语类目：黄大仙/观音 = 姻缘·事业·求财·健康；月老 = 恋情·婚姻·复合。
- 等级集以来源为准（黄大仙/月老预计 上上/上吉/中吉/中平/下，观音预计 上签/中签/下签），en 文件的 `gradeLabels` 必须覆盖实际出现的全部等级。
- 文案红线：数据文本不得出现「AI/人工智能」等字样。

数据校验：`scripts/validate-qian.mjs`（`npm run qian:validate`）校验六份数据文件——签数齐全、编号 1..N 连续唯一、字段非空、poem 四行、等级合法、aspects 与类目对齐、zh/en 签号等级一致、无 AI 字样。横向扩品类时新增数据文件后跑同一校验器。

## 5. 抽取交互（chouqian.js，三签种共用）

工具页 HTML 骨架（三页同构，仅 `data-qian` 与文案不同）：

```
<div class="chouqian-app" id="chouqian-app" data-lang="zh" data-qian="huangdaxian">
  第一步 · 虔心默祷   —— 所求之事输入框（可留空，心中默念亦可）
  第二步 · 摇筒求签   —— CSS 签筒 + 「诚心摇签」按钮；旁边「已有签号」查签输入
  第三步 · 签文与解签 —— 结果渲染区（默认 hidden）
</div>
<script src="/assets/qian/huangdaxian.zh.js" defer></script>
<script src="/assets/qian/chouqian.js" defer></script>
```

- 摇签：点击后签筒 CSS 动画摇动约 1.4 秒 → 以 `crypto.getRandomValues` 拒绝采样取均匀随机签号（无 crypto 回退 Math.random）→ 展示签号，滚动到结果区。
- 查签：输入 1..100 签号直接查阅该签（服务「在庙里抽了签回来查解」的场景），与摇签共用渲染器，仅来源标签不同。
- 结果区：签号 + 等级徽章（data-grade 配色：吉系绿、平系灰、下签红，同小六壬 grade 模式）、签题（en 页并列中文原题）、签诗（en 页中文原诗在上、英译在下）、解签散文、断语网格（类目: verdict）、「再摇一签」按钮（文案提示一事一签）。
- 解签全部来自静态数据，无网络请求、无 API、无 LLM；查签/摇签都不产生任何后端调用。

## 6. 页面内容结构

- **总览页 chouqian**：lead + 三张工具卡（复用 .tool-card）+「三签怎么选」对比表（复用 mingli-compare 布局组）+ 求签仪轨说明（凝神默祷、一事一签、签文只作参考）+ FAQ（4 问）+ 页尾注。
- **工具页 ×3**：lead（签种来历两三句 + 全签一百支/等级说明）+ 抽签 app 三步 + 签制小节（等级含义速览表）+ FAQ（4 问，含「解签可信吗」红线问答）+ 页尾注。
- 双语一一对应；正文可见文本不出现「AI」字样（FAQ 中「解读基于传统签文文献整理生成」口径与其余工具页一致）。

## 7. 样式（style.css）

新增「灵签抽签」区块：`.chouqian-app`（800px 居中）、`.chouqian-step` 卡片、纯 CSS 签筒（圆筒 + 数支签枝，摇动 keyframes）、结果区（徽章/签诗 pre-line 居中/断语网格/查签行）、响应式。总览页复用 mingli-* 布局组的类名约定（.chouqian-faq 并入共享 FAQ 样式组）。

## 8. 测试

- `registry.test.ts`：四个页面存在、inNav=false、双语 FAQ 等长。
- `integration.test.ts`：四页 zh/en 200 + 骨架/脚本断言；「抽签」下拉顺序（择吉日 → 抽签 → 运势）与三工具链接；工具页 active 态；总览页 FAQPage JSON-LD + canonical；无尾斜杠 301；footer 工具列含新链接。
- `npm run qian:validate`：数据文件结构校验（开发期工具，不进 vitest）。

## 9. 已知边界（不要"顺手修复"）

- 观音灵签的宫位（子宫…亥宫）不入数据结构——统一 schema 优先，宫位是签种特有信息，展示价值低于复杂度。
- 不做逐签独立 URL 页面（如 /zh/guanyin/28/）——300×2 个页面属另一个量级的立项；查签功能已覆盖「查某一签」需求。
- 不做掷筊确认环节——线下仪轨在线上做减法，摇签即出。
- 签文以主流通行版本为准（各庙宇版本存在异文），来源与异文记录在 docs/qian-data-sources/，不做版本考据。
