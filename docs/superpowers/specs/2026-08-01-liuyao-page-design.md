# 六爻起卦页面设计（2026-08-01）

来源需求：`将要做的三个页面.md` 之「六爻起卦」。页面分三步：准备 → 投掷录入 → 结果与解读。

路线选择：**仅周易卦辞深度**——排本卦/变卦/动爻，按 64 卦卦辞、动爻爻辞与变卦趋势解读，不做六亲纳甲体系。

## 总体架构

- **前端算卦、后端解读**：与八字页同构。前端原生 JS 单文件 `public/assets/liuyao.js` 负责投掷录入、即时排卦展示、查表组装解读素材；后端 `POST /api/liuyao/interpret` 只校验 + 组 prompt 调 LLM，**零算法、零查表**。
- **卦辞与排盘数据全部在前端**：前端内置完整权威表（64 卦名 / Unicode 卦符 / 上下经卦名 / 卦辞 + 384 爻辞，zh/en），既做即时展示，又负责查表后随请求提交给后端解读。消除前后端两份表的同步负担，前端为单一来源。
- **后端只校验与转发 LLM**：与八字页"只校验干支字符串格式、不校验语义来源、服务端不自行取时间"原则一致——用户篡改卦辞只影响自己的解读，无安全后果；限流照常保护 LLM 成本。
- **复用基础设施**：LLM 客户端复用（见下节小重构）；响应壳、限流、marked + DOMPurify 渲染照搬八字页。
- **单段解读**（非八字三段）：周易卦辞占是一段完整叙事——本卦总断 → 动爻爻辞 → 变卦趋势，一次 API 出。
- **无外部六爻库 / 无构建**：64 卦全靠手写表，契合项目"CDN 全局脚本、无 ESM、无构建链"。
- **不引入 lunar-javascript**：周易卦辞占不强依赖精确历法（不像八字的流月流年）。六爻页只展示公历起卦时间并喂给 prompt 作时节上下文，让本页更轻、更独立。

## 关键决策（已与用户确认）

1. **单段解读**：一次请求返回一段 Markdown，不分多段串行。
2. **起卦日期**：自动取"今天"，仅作 LLM 上下文与展示，不让用户选日期。
3. **所求之事**：必填文本框，≤ 200 字符，进入 prompt 聚焦解读；服务端校验长度，错误信息不回显原文。
4. **仅手动录入起卦**：严格按需求文档三步仪式，不加自动起卦。
5. **请求载荷以前端查表结果为准**：前端发 `{ lines, question, lang, now, primary, changed, moving }`。`lines`（6 个爻值）作为"这确实是合法投掷结果"的结构性佐证保留；后端**不据 lines 重算卦象**，直接用前端提交的文本进 prompt。
6. **正/反规定**：第 2 步开头一个选择器，默认"有字/图案面 = 字(阴)，另一面 = 背(阳)"，可切换；4 选项用「字/背计数」表达（三字 / 两字一背 / 一字两背 / 三背），括注 6/7/8/9 与老阴/少阳/少阴/老阳。
7. **动爻处理流派**：`0 动爻 → 只读本卦卦辞`；`有动爻 → 本卦各动爻爻辞 + 变卦卦辞` 一起喂给 LLM，由 LLM 按周易占法综合断（不硬绑某一具体流派）。

## 共享 LLM 客户端（小重构）

八字页的 `callLlm` 实现通用，但类型 `BaziEnv` 耦合在 bazi 模块。做一次服务于本目标的小重构（AGENTS.md 鼓励"改进工作中的代码"），零行为变化（八字测试全绿即证）：

- 新建 `src/llm.ts`：定义 `LlmEnv` 接口（仅 `LLM_BASE_URL/MODEL/API_KEY`），从 `bazi/llm.ts` 搬入 `callLlm` 及其 `LlmResult` 类型。
- `bazi/types.ts`：改 `BaziEnv extends LlmEnv`，只保留自己的 `BAZI_RATE_LIMITER`。
- `bazi/llm.ts`：改为从 `../llm` 转出 `callLlm` 与 `LlmResult`（保持现有 import 路径不变，八字代码与测试零改动）。
- `RateLimiter` 接口（现位于 `bazi/types.ts`）随同移至 `src/llm.ts`——它是所有 interpret 接口共用的 Cloudflare 绑定形状，与 LLM 客户端同属共享 API 基础设施；`bazi/types.ts` 与 `liuyao/types.ts` 各自从 `../llm` 导入。
- 新增 `liuyao/types.ts`：`LiuyaoEnv extends LlmEnv`（加 `LIUYAO_RATE_LIMITER`）。
- `routes/api.ts`：现有 app 类型 `Hono<{ Bindings: BaziEnv }>` 只含 `BAZI_RATE_LIMITER`，注册六爻路由后需同时覆盖两个限流器。改为 `Hono<{ Bindings: BaziEnv & LiuyaoEnv }>`；若 Hono 泛型协变导致 `registerXxxRoutes` 参数类型不兼容，则把注册函数改为泛型签名 `<E extends XxxEnv>(api: Hono<{ Bindings: E }>)`。

## 页面接入（标准两步）

- slug `liuyao`，URL `/zh/liuyao/` 与 `/en/liuyao/`，`inNav: true`，JSON-LD 默认 `WebPage`。
- 新增 `src/content/liuyao.zh.html` + `liuyao.en.html`：DOM 结构完全相同，仅静态文案（label、按钮、说明）不同；页尾 `<script>`：marked、DOMPurify（沿用八字页 CDN 版本），以及 `/assets/liuyao.js`。
- `registry.ts` 的 `PAGES` 加一条，zh/en 各配 title/description，SEO/sitemap/导航/语言切换全部自动派生。
- 样式加在现有 `public/assets/style.css`。

## 三步交互

### 第一步 · 准备

- 引导文案：备好三枚铜钱/硬币、静心凝神；附投掷规则说明（立起作废、三枚同投、记录每次、共 6 次）。
- 必填输入框：所求之事（前端限 ≤ 200 字符）。

### 第二步 · 投掷录入

- 顶部"规定正反"选择器（默认有字面 = 字）。
- 6 条录入项（初爻→上爻，从下往上排），每条 4 个单选：三字 / 两字一背 / 一字两背 / 三背（括注 6/7/8/9 与老阴/少阳/少阴/老阳）。
- 实时预览：已录的爻即时画成卦（阴阳爻线条 + 动爻标记）。

### 第三步 · 结果与解读

- 投掷结果区：本卦、变卦的 Unicode 卦符 + 卦名 + 上下经卦名 + 一句话卦意（来自前端表）。
- "开始解读"按钮（用户主动触发，不自动调）→ 调 `/api/liuyao/interpret` → marked 解析 + DOMPurify 净化后渲染一段 Markdown；失败显示错误 + 重试。

## 卦象算法与爻值约定

原始爻值 `{6,7,8,9}` 是唯一真值源（铜钱法）：

| 爻值 | 三枚 | 阴阳 | 动静 |
|---|---|---|---|
| 6 | 三字 | 阴 ⚋ | 动（变阳） |
| 7 | 两字一背 | 阳 ⚊ | 静 |
| 8 | 一字两背 | 阴 ⚋ | 静 |
| 9 | 三背 | 阳 ⚊ | 动（变阴） |

前端纯函数（`liuyao.js` 内）：由 6 个爻值算下/上经卦索引 → 本卦序号；`movingPositions`（动爻位号，1=初爻…6=上爻）；`transform`（变卦爻值，6→7、9→8）→ 变卦序号。0 动爻时无变卦，`changed`/`moving` 为空。

## 前端文本表（`liuyao.js`）

完整权威表，64 卦每条含：序号、Unicode 卦符、卦名（zh/en）、上下经卦名（zh/en）、一句话卦意（zh/en）、卦辞（zh/en）；以及 384 爻辞（每卦 6 爻，zh/en）。纯文本大块，gzip 后很小，源码内受控、无幻觉风险。查表函数 `resolveReading(lines)` → `{ 本卦序号/卦名/卦辞, 动爻位号与爻辞[], 变卦序号/卦名/卦辞 }`。

## 后端 `POST /api/liuyao/interpret`

新增 `src/routes/liuyao.ts`（api 兜底 404 之前注册），沿用 `{ ok, data | error }` 响应壳。

### 请求体

```json
{
  "lang": "zh",
  "question": "近期事业是否有转机",
  "lines": [7, 9, 8, 6, 7, 8],
  "now": { "solar": "2026-08-01" },
  "primary": {
    "name": "雷水解",
    "statement": "解：利西南；无所往，其来复吉……"
  },
  "changed": {
    "name": "雷风恒",
    "statement": "恒：亨，无咎，利贞……"
  },
  "moving": [
    { "position": 2, "text": "九二：田获三狐……" }
  ]
}
```

0 动爻时：`changed` 省略（不存在），`moving` 省略或为空数组 `[]`（校验视二者等价）。

### 校验（`src/liuyao/validate.ts`，不重算只校验）

- `lines`：长度 6 且每项 ∈ {6,7,8,9}。
- `question`：非空字符串 ≤ 200 字符。
- `lang`：枚举 zh/en。
- `now.solar`：`YYYY-MM-DD` 正则。
- `primary`：必填对象，`name`/`statement` 为非空字符串 ≤ 300 字符。
- `changed`：可选对象（0 动爻时省略）；若存在则 `name`/`statement` 为非空字符串 ≤ 300 字符。
- `moving`：可选数组（0 动爻时省略）；若存在则每项 `position` ∈ {1..6}、`text` 非空 ≤ 300 字符，长度 ≤ 6。
- 不校验卦辞内容真伪（与八字"只校验格式不校验语义来源"同构）；错误信息不回显原文。
- 体积上限 8 KB（路由层读 text 阶段把关）。

### 限流

新增 `LIUYAO_RATE_LIMITER`（namespace 1002，10 次/60 秒），与八字独立隔离（绑定缺失则跳过，本地 dev / 测试可用）。按客户端 IP。

### 提示词（`src/liuyao/prompt.ts` 纯函数）

- `buildSystemPrompt(lang)`：设定「周易占法大家，输出 Markdown，按 lang 作答」；规则同八字（客观温和、不绝对断言、不给专业建议、保留中文术语配英文意译）。
- `buildUserPrompt(req)`：给「所求之事 + 本卦名与卦辞 + 各动爻爻辞（含位号）+ 变卦名与卦辞 + 起卦公历日期」。0 动爻时只给本卦卦辞。要求：先点明卦象总体吉凶与所问之事的关联，再据动爻爻辞论变化趋势，最后以变卦（若有）指示走向；约 500 字（中文）/ 400 词（英文）。

### LLM 调用与响应

复用 `callLlm`（OpenAI 兼容，非流式，60 秒超时）。上游非 2xx → 502 `{ code: "upstream_error" }`；超时 → 504 `{ code: "upstream_timeout" }`；缺 KEY → 500 `{ code: "not_configured" }`；不透传上游原始报文。响应 `{ ok: true, data: { markdown } }`。

## 测试计划

- `test/integration.test.ts` 补充：`/zh/liuyao/` 与 `/en/liuyao/` 返回 200，含三步骨架与脚本标签；导航与 sitemap 由现有断言体系自动覆盖。
- 新增 `test/liuyao-api.test.ts`：校验分支（非法 lines / question 超长 / 超大 body → 400；缺 `LLM_API_KEY` → 500）；LLM 上游用 vitest `fetchMock` 拦截：成功返回 markdown、上游 5xx → 502、超时 → 504；限流覆盖「超限返回 429」分支（本地绑定行为有限，单元级即可）。
- 新增提示词纯函数单测 `test/liuyao-prompt.test.ts`：断言关键要素（所求之事、卦辞、动爻爻辞、变卦、起卦日期、语言指令）；覆盖 0 动爻与有动爻两分支。
- `liuyao.js` 无自动化测试（无构建链）：`npm run dev` 手工验证，卦象与知名排盘工具对照。

## 配置

- `wrangler.jsonc`：`ratelimits` 新增 `LIUYAO_RATE_LIMITER`（namespace_id `1002`，`simple: { limit: 10, period: 60 }`）；LLM 的 `vars` 全复用现有。
- 密钥 `LLM_API_KEY` 全复用（线上已 `wrangler secret put`，本地已在 `.dev.vars`）。

## 已知取舍

- **不做六亲纳甲体系**：路线选定为仅周易卦辞深度，六亲/世应/六神/旺衰月破日破等不做（符合"库没有且无需引入就不做"的既定取舍）。
- **不引入 lunar-javascript**：本页只需公历起卦时间作 LLM 时节上下文，无需精确农历/节气；让页面更轻、更独立。
- **后端不重算卦象**：以前端查表结果为准，后端只校验 lines 格式合法性 + 各文本字段长度/基本字符；与八字页同构的"信任前端确定性数据"哲学。
- **起卦日期不让用户选**：自动取今天，作上下文而非占断变量；简化交互。
- **0 动爻只读本卦卦辞**：动爻为 0 时省略 `changed`/`moving`，prompt 只给本卦卦辞。
- **前端 JS 不引入 TypeScript/构建链**：项目无此设施，成本不成比例。
