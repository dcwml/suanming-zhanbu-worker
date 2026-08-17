# 梅花易数工具 设计文档

- 日期：2026-08-17
- 状态：已实施（2026-08-17）
- 需求来源：[未来工具候选清单](../../2026-08-17-tool-candidates-design.md) 第二批第 4 项（LLM 管线复制最顺的一个）
- 用户确认：起卦方式 = 时间 + 数字两种；解读 = LLM 管线（同六爻）

---

## 1. 需求概述

新增「梅花易数」工具页：前端起卦排盘（本卦 / 互卦 / 变卦 / 体用五行），后端 `POST /api/meihua/interpret` 送 LLM 解读。同时把顶部导航的「六爻起卦」平铺链接改为「占卜」下拉菜单（无链接），子项为「六爻起卦」与「梅花易数」。

与六爻的分工：六爻是铜钱摇卦的「重卦」流程，梅花是按时间/数字的快卦，互补不冲突。

## 2. URL 与注册

- slug：`meihua` → `/zh/meihua/`、`/en/meihua/`
- 走固定页面两步流程：`src/content/meihua.zh.html` + `meihua.en.html` → `registry.ts` 加 `PageEntry`（`inNav: false`，见下节菜单改造）。SEO/sitemap/canonical/hreflang 全部自动派生。
- 页面标题：zh「梅花易数」/ en「Plum Blossom Numerology」。

## 3. 菜单改造（nav.ts）

现状：`navPages()` 平铺渲染（首页/八字/六爻/择吉）+ 单个「运势」下拉。

改造：

1. 把「运势」下拉的渲染抽成通用的下拉构建逻辑（同一份 CSS：`.nav-dropdown`），支持多个下拉并存。
2. 新增 `DIVINATION_NAV_LABEL`（zh「占卜」/ en「Divination」）与 `DIVINATION_NAV_ITEMS`（liuyao、meihua，标签直接取 registry 页面 title，单一来源）。
3. liuyao 的 `inNav` 改为 `false`（只出现在「占卜」下拉里），meihua 同样 `inNav: false`。
4. active 态逻辑与运势下拉一致：当前 slug 命中子项 → 子项链接加 `active aria-current="page"`，toggle 按钮加 `active`。
5. footer「工具」列追加 meihua（`["bazi", "liuyao", "meihua"]`）；zeji 不在工具列是现状，不顺手改。

## 4. 起卦算法（前端 meihua.js，纯客户端）

### 4.1 基础数据

- 先天八卦数：乾1 兑2 离3 震4 巽5 坎6 艮7 坤8。
- 八卦五行：乾兑金、震巽木、坎水、离火、坤艮土。
- 八卦爻象（自下而上）：乾111、兑110、离101、震100、巽011、坎010、艮001、坤000。
- 地支序数：子1 丑2 寅3 卯4 辰5 巳6 午7 未8 申9 酉10 戌11 亥12。
- 64 卦名 + 卦辞表：按 King Wen 序号索引（与 liuyao.js 的 `KING_WEN` 二进制矩阵同源，只保留 name/statement，不带爻辞——梅花断卦不用爻辞）。

### 4.2 时间起卦（邵雍法）

用 lunar-javascript（CDN 加载，与 bazi/zeji 同款主源+备源）取当前时刻的农历年支、月、日、时支：

- 上卦 = (年支序 + 农历月 + 农历日) mod 8，余 0 取 8
- 下卦 = (年支序 + 农历月 + 农历日 + 时支序) mod 8，余 0 取 8
- 动爻 = (年支序 + 农历月 + 农历日 + 时支序) mod 6，余 0 取 6

闰月按 `Math.abs(getMonth())` 取月数（梅花取数不闰）。年支用 lunar-javascript 的 `getYearZhi()`（农历正月初一起年，传统梅花口径一致）。

### 4.3 数字起卦

用户报两个正整数 a、b（1..100000）：

- 上卦 = a mod 8（余 0 取 8），下卦 = b mod 8（余 0 取 8），动爻 = (a+b) mod 6（余 0 取 6）。

### 4.4 排盘推导

- 本卦六爻 = 下卦三爻 + 上卦三爻（自下而上）。
- 互卦：2/3/4 爻为下卦、3/4/5 爻为上卦。
- 变卦：本卦动爻阴阳互变。
- 体用：动爻在下卦（1-3 爻）则下卦为用、上卦为体；动爻在上卦（4-6 爻）则上卦为用、下卦为体。
- 体用生克展示（仅前端提示语，深度解读交给 LLM）：用生体→吉；比和→吉；体克用→小吉；体生用→泄气；用克体→凶。

## 5. API 设计

`POST /api/meihua/interpret`，响应壳与错误码同 liuyao（invalid_request / payload_too_large / invalid_json / rate_limited / not_configured / upstream_error / upstream_timeout），限流绑定 `MEIHUA_RATE_LIMITER`（10 req/60s，namespace_id 1004），body 上限 8KB，`recordApiCall` 照常记录。

请求体（字段形状校验，不回显用户输入值；落地时用平铺可选字段 + validate.ts 跨字段校验，替代最初设计的判别联合 `input`——校验逻辑等价，结构对前端构建 payload 更直接）：

```ts
interface InterpretRequest {
  lang: "zh" | "en";
  question: string;               // 1..200
  method: "time" | "number";
  solar?: string;                 // time 必填：YYYY-MM-DD HH:mm
  lunar?: string;                 // time 必填：农历表述，≤60 字
  numbers?: [number, number];     // number 必填：整数 1..100000
  primary: HexInfo;               // 本卦
  mutual: HexInfo;                // 互卦
  changed: HexInfo;               // 变卦
  movingLine: number;             // 1..6
  body: TrigramInfo;              // 体卦
  application: TrigramInfo;       // 用卦
}
interface HexInfo { name: string; statement: string; upper: TrigramName; lower: TrigramName }
interface TrigramInfo { trigram: TrigramName; element: ElementName }
```

跨字段规则：`method: "time"` 要求 solar+lunar 同时出现且不得带 numbers；`method: "number"` 要求恰有两个整数且不得带 solar/lunar。

校验要点：八卦名限定 `{乾,兑,离,震,巽,坎,艮,坤}`、五行限定 `{金,木,水,火,土}`（payload 一律传中文规范名，英文场景由 prompt 内附对照表，避免双语两套校验）。

## 6. Prompt（src/meihua/prompt.ts）

- system：梅花易数大师（邵雍先天易学），规则同六爻（只基于给定卦象、Markdown 输出、温和不绝对、无专业建议、语言一致）。
- user：所求之事 → 起卦方式与输入（时间法给公历+农历，数字法给两数）→ 本卦/互卦/变卦（卦名+上下卦+卦辞）→ 动爻 → 体用卦及五行 → 任务指令：以体用生克定吉凶基调，互卦论过程，变卦论结局，结合卦辞给出建议；zh 约 500 字 / en 约 400 词。en 版 system 内附八卦名与五行的英文对照。

## 7. 页面结构（content 片段）

三步式，类 liuyao：

1. 第一步 · 凝神：说明 + 所求之事输入。
2. 第二步 · 起卦：方式切换（时间起卦：展示当前时刻说明；数字起卦：两个数字输入）+ 起卦按钮。
3. 第三步 · 排盘与解读：卦象卡（本/互/变，含卦符、卦名、上下卦）+ 动爻爻象图（复用 `.yaoline`）+ 体用五行提示 + 「开始解读」→ LLM 卡片（marked + DOMPurify）。

CDN 脚本：lunar-javascript 1.7.7（主 cdnjs + 备 staticfile）+ marked + dompurify + `/assets/meihua.js`。

## 8. 测试（TDD）

新增：`test/meihua-validate.test.ts`、`test/meihua-prompt.test.ts`、`test/meihua-api.test.ts`、`test/fixtures/meihua-request.ts`；integration.test.ts 增「meihua page」与「divination nav dropdown」断言（含 liuyao 平铺链接消失、active 态、footer 工具列）。

不改：stats（api_stats 按路径通用）；recordPageView 的 PageType 白名单不动（zeji 先例）。

## 9. 文档更新

agents.md（目录树/核心约定 API 实例/导航描述）、README.md（API 段）、候选清单勾选梅花易数、本设计文档。

## 10. 已知取舍

- 文字笔画起卦不做（需笔画字典，体量不值）。
- 时间起卦只取「当下时刻」，不提供自选时间输入（梅花讲究念头发动之时，后续有需求再加）。
- 前端起卦算法不做单测（与 liuyao.js/zeji.js 现状一致，Workers vitest 池不跑浏览器 JS）。
