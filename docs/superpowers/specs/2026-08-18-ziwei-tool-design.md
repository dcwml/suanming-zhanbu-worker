# 紫微斗数工具 设计文档

- 日期：2026-08-18
- 状态：待实施
- 需求来源：[未来工具候选清单](../../2026-08-17-tool-candidates-design.md) 第三批第 7 项（站点第二个旗舰工具，热度与八字并列的头部命理术数）
- 用户确认：解读结构 = 三段式（命盘/大限/流年）；iztro 加载 = unpkg 主源 + jsdelivr 备源 + 本地兜底；盘面 = 固定 4×4 盘格 + 小屏横向滚动；范围含页面 FAQ 与大限提示条，不含流年自选与杂曜全展示

---

## 1. 需求概述

新增「紫微斗数」工具页：前端用 iztro 库排盘，后端 `POST /api/ziwei/interpret` 走既有 LLM 管线做三段式解读（命盘总览 / 大限 / 流年）。同时把顶部导航的「八字排盘」平铺链接改为「命理」下拉菜单（无链接），子项为「八字排盘」与「紫微斗数」。

与八字的分工：八字以四柱干支论命局起伏，紫微以十二宫星曜论人生各领域，两者同为命理类旗舰工具、互补不冲突。架构上沿用「validate 校验 + prompt 提示词 + types 共享类型 + 路由 + 前端 JS」模块模式（八字/六爻/梅花/小六壬/择吉已验证）。

排盘算法不自研：紫微安星规则（十四主星、辅星、四化、大限顺逆）复杂且流派细节多，iztro（MIT）已覆盖且实测可用；自研无必要。解读走既有 `callLlm` + RateLimiter + 统一错误码管线。

### 1.1 iztro 实测结论（2026-08-18，v2.6.0，本地验证）

- npm 可装，MIT，带 UMD 浏览器构建 `dist/iztro.min.js`（约 787KB，未 gzip），全局导出 `{ astro, data, star, util }`。
- `astro.bySolar(solarDate, timeIndex, gender, fixLeap?, language?)` / `astro.byLunar(lunarDate, timeIndex, gender, isLeapMonth?, fixLeap?, language?)`。
- `timeIndex` 0=早子时、1=丑…11=亥、12=晚子时，与八字页 13 个时辰选项一一对应；实测早晚子时命宫落宫一致、日期归属由库内处理。
- 农历输入实测含闰月参数（如 2023 闰二月）生效。
- `chart.horoscope(date, timeIndex)` 可推大限（decadal）/流年（yearly）/流月等，含各层四化（mutagen）与流曜。
- 全盘 `toJSON()` 约 8.4KB；按第 5 节精简后约 1.5KB，可装入现有 8KB 请求体上限。
- 自带 i18n（zh-CN/zh-TW/en-US/ja-JP/ko-KR/vi-VN）；`language` 参数实测可输出英文宫位/星名（en-US：soul/career/wealth、judge/wolf 等）。

## 2. URL 与注册

- slug：`ziwei` → `/zh/ziwei/`、`/en/ziwei/`。
- 走固定页面两步流程：`src/content/ziwei.zh.html` + `ziwei.en.html` → `registry.ts` 加 `PageEntry`（`inNav: false`，见下节菜单改造）。SEO/sitemap/canonical/hreflang 全部自动派生。
- 页面标题：zh「紫微斗数」/ en「Zi Wei Dou Shu」。标题取短名是为让「命理」下拉标签直接复用 registry title（单一来源，同六爻/梅花先例）；Purple Star Astrology 的说明放进 description。
- `PageEntry.faq` 配 4 组中英一一对应问答，自动注入 FAQPage JSON-LD（择吉页、占卜总览页先例）。拟题：
  1. 什么是紫微斗数？它与八字有什么区别？
  2. 排盘为什么要填性别和出生时辰？
  3. 三段解读（命盘/大限/流年）分别看什么？
  4. AI 解读权威吗？（口径：排盘遵传统规则、解读为传统推演仅供参考，同全站免责口径）

## 3. 菜单改造（nav.ts / footer.ts）

现状导航顺序（单一来源在 `renderNav`）：首页 · 八字排盘 · [占卜 ▾] · 择吉日 · [运势 ▾]。

改造后：首页 · [命理 ▾] · [占卜 ▾] · 择吉日 · [运势 ▾]。

1. bazi 的 `inNav` 改为 `false`（只出现在「命理」下拉里），ziwei 同样 `inNav: false`。
2. 新增 `MINGLI_NAV_LABEL`（zh「命理」/ en「Destiny」）与 `MINGLI_NAV_ITEMS`（bazi、ziwei，标签直接取 registry 页面 title，单一来源），导出方式同 `DIVINATION_NAV_*`。
3. 「命理」下拉渲染成 `renderDropdown(...)` 不传 `overviewSlug` 的形态——即纯 `<button>` 展开按钮、无链接（与「运势」下拉同款），插入位置在首页链接之后、「占卜」下拉之前。
4. active 态逻辑与现有下拉一致：当前 slug 命中子项 → 子项链接加 `active aria-current="page"`，toggle 加 `active`。
5. footer「工具」列 `["bazi", "liuyao", "meihua", "xiaoliuren"]` 追加 `"ziwei"`。

## 4. 排盘与前端（public/assets/ziwei.js）

### 4.1 iztro 加载链

unpkg 主源（`https://unpkg.com/iztro@2.6.0/dist/iztro.min.js`）→ jsdelivr 备源（`https://cdn.jsdelivr.net/npm/iztro@2.6.0/dist/iztro.min.js`）→ 本地兜底 `/assets/vendor/iztro.min.js`（随仓库提交，Workers assets 分发，版本号锁死与 CDN 一致）。

现有 lunar-javascript 的单跳 `onerror` 写法承载不了三级链，改用一个小的 loader 函数：加载后检测 `window.iztro` 是否存在，缺失则顺序尝试下一源，三源皆败时展示错误提示。此写法仅用于本工具，不回头重构现有回退逻辑。

### 4.2 表单

与八字页一致的输入形态：

- 历法切换（公历/农历 radio）+ 农历时的闰月勾选。
- 年（1900–2100，同八字）/月/日 + 时辰 select（13 项，value 0–12 直接作为 iztro timeIndex；0=早子时、12=晚子时）。
- 性别（男/女）——影响大限顺逆，紫微必填。

### 4.3 盘面渲染

传统 4×4 盘格：十二宫按地支固定方位排布（子居下、午居上、卯居左、酉居右，同常见紫微盘），实现上用「地支 → 格子位置」固定映射表定位，不写旋转/方向逻辑；中宫放命主/身主、五行局、生肖、阳历/农历生日。宫格内显示宫名（命宫/夫妻/…）、主星 + 亮度 + 四化标记、六吉六煞与禄存天马等关键辅星；命宫与身宫宫格高亮。

容器设 `min-width`（约 640px），小屏时盘面容器横向滚动（`overflow-x: auto`），不做手机版卡片列表双渲染。

界面词条随页面语言：中文页用中文星名宫名，英文页用 iztro 的 en-US 词条（`bySolar(..., 'en-US')`）。

### 4.4 大限提示条

盘面下方一行「当前大限：X–Y 岁 · 干支」（数据取自 iztro 命宫对应大限区间），让用户明白三段解读中「大限」指哪十年。英文页对应文案。

### 4.5 解读区

三张卡片（命盘总览 / 大限 / 流年），复用八字页 `.bazi-card` 的卡片样式思路（class 前缀改 `ziwei-`）；「开始解读」后串行请求三个 part（同八字页机制），marked + DOMPurify 渲染。

## 5. API 设计

`POST /api/ziwei/interpret`，响应壳与错误码完全沿用八字/六爻一套：`invalid_request / payload_too_large / invalid_json / rate_limited / not_configured / upstream_error / upstream_timeout`。body 上限 8KB，`recordApiCall` 照旧记录。

限流绑定新增 `ZIWEI_RATE_LIMITER`（namespace_id `1006`，10 req/60s），加进 `wrangler.jsonc` 的 `ratelimits`。

请求体（前端排盘后把精简盘传入；三段共用同一份 `chart`，串行三次请求）：

```ts
type Part = "mingpan" | "daxian" | "liunian";

interface InterpretRequest {
  part: Part;
  lang: Lang;              // "zh" | "en"
  chart: ZiweiChart;
}

interface ZiweiChart {
  gender: "male" | "female";
  solar: string;           // YYYY-MM-DD
  lunar: string;           // 农历表述，≤60 字
  time: string;            // 如 "午时"
  zodiac: string;          // 生肖，如 "马"
  soul: string;            // 命主，如 "巨门"
  body: string;            // 身主，如 "火星"
  fiveElementsClass: string; // 五行局，如 "火六局"
  palaces: PalaceInfo[];   // 固定 12 项
  decadal: ScopeInfo;      // 当前大限
  yearly: ScopeInfo & { year: number }; // 当前流年
}

interface PalaceInfo {
  name: string;            // 宫名：命宫/夫妻/…
  branch: string;          // 地支
  isBody: boolean;         // 是否身宫
  majors: { name: string; brightness: string; mutagen: string }[];
  minors: { name: string; kind: "吉" | "煞" | "禄" | "马"; mutagen: string }[];
}

interface ScopeInfo {
  ganZhi: string;          // 干支
  ageRange?: string;       // 大限年龄区间，如 "34-43"
  palaceNames: string[];   // 该限/年十二宫名
  mutagen: string[];       // 四化对应星名 [禄,权,科,忌]
}
```

payload 一律中文规范名（梅花先例）；英文场景由 prompt 内附对照表，避免双语两套校验。校验只查形状与枚举（宫名/亮度/四化/五行局等），不回显用户输入值。

## 6. Prompt（src/ziwei/prompt.ts）

- **system**：紫微斗数大师人设，规则同现有各模块——只基于给定盘面、Markdown 输出、温和不绝对、无专业建议、语言一致。en 版 system 内附十四主星与关键辅星的中英对照表。
- **user**：出生信息（公历/农历/时辰/性别）→ 命主/身主/五行局/生肖 → 十二宫星曜（主星亮度 + 四化 + 关键辅星）→ 大限/流年数据 → 按 `part` 分派任务：
  - `mingpan`：以命宫三方四正定格局，逐宫要点，论整体命局。
  - `daxian`：论当前大限重心与大限四化引动。
  - `liunian`：论当年流年四化与落宫。
- 篇幅：zh 各约 500 字 / en 各约 400 词，与八字/梅花同量级。

## 7. 测试（TDD，先写测试）

新增：

- `test/ziwei-validate.test.ts`
- `test/ziwei-prompt.test.ts`
- `test/ziwei-api.test.ts`
- `test/fixtures/ziwei-request.ts`

`integration.test.ts` 增「ziwei page」与「命理 nav dropdown」断言：八字平铺链接消失、命理下拉为 button 无 href、两个子项（八字排盘/紫微斗数）及 active 态、footer 工具列含紫微斗数。

不改：stats（api_stats 按路径通用）；`recordPageView` 的 PageType 白名单不动（zeji 先例）。前端排盘逻辑不做单测（与 liuyao/meihua 现状一致，Workers vitest 池不跑浏览器 JS）。

## 8. 文档与部署

- agents.md：目录树（ziwei 模块 + ziwei.js + vendor）、核心约定 API 实例清单加 ziwei、导航描述更新为「命理」下拉。
- README.md：API 段加 `POST /api/ziwei/interpret`。
- 候选清单 `docs/2026-08-17-tool-candidates-design.md` 勾选紫微斗数。
- 本设计文档状态改「已实施」。
- 部署侧仅 wrangler.jsonc 新增 `ZIWEI_RATE_LIMITER` 限流绑定；无新 secret（LLM_API_KEY 已在）。

## 9. 已知取舍

- 流年只取当前年份，不做年份自选（用户已确认不做）。
- 杂曜（长生十二神、博士十二、岁前十二等）不入盘面与 payload，专业向需求后续再说。
- 盘格固定最小宽度 + 横向滚动，不做手机版卡片列表双渲染（保留三方四正空间关系）。
- iztro 三级加载链是本工具特有写法，不回头重构 lunar-javascript 现有回退。
- 前端排盘算法不做单测（与 liuyao/meihua 现状一致）。
