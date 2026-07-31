# 八字排盘页面设计（2026-07-31）

来源需求：`将要做的三个页面.md` 之「八字」。页面分上（输入区）、中（排盘结果区）、下（解读区）三段。

## 总体架构

- **排盘全部在前端计算**：页面用 CDN 引入 `lunar-javascript@1.7.5`（主源 cdnjs：`https://cdnjs.cloudflare.com/ajax/libs/lunar-javascript/1.7.5/lunar.min.js`，`onerror` 回退 staticfile：`https://cdn.staticfile.org/lunar-javascript/1.7.5/lunar.min.js`）。Worker 不引入历法库。
- **解读走后端接口**：前端把算好的排盘数据 POST 给 Worker，Worker 组提示词调用 LLM（OpenAI 兼容接口），非流式，返回 Markdown 文本。
- **页面接入零框架改动**：按现有「两步加页面」约定——正文片段 + `registry.ts` 注册，脚本标签直接写在正文片段尾部（正文片段是仓库内受信任的原始 HTML）。
- **交互 JS 为单文件原生 JS**：`public/assets/bazi.js`，无构建步骤，由 Workers assets 直接服务。

## 页面接入

- slug：`bazi`，URL `/zh/bazi/` 与 `/en/bazi/`，`inNav: true`，JSON-LD 用默认 `WebPage`。
- 新增 `src/content/bazi.zh.html` 与 `bazi.en.html`：两者 DOM 结构完全相同，仅静态文案（label、按钮、说明）不同；包含输入区、排盘结果区、解读区骨架 + 页尾 `<script>`：CDN 的 lunar.min.js（带回退）、marked、DOMPurify，以及 `/assets/bazi.js`。
- `registry.ts` 的 `PAGES` 加一条，zh/en 各配 title/description，SEO/sitemap/导航/语言切换全部自动派生。
- 样式加在现有 `public/assets/style.css`。

## 上：输入区（固定悬浮）

`position: sticky; top: 0` 吸顶。字段：

1. **历法**：单选 公历/农历，默认公历。
2. **年**：数字输入，1900–2100。
3. **月**：下拉 1–12。**日**：下拉，公历按年月动态调整天数；农历统一列到 30，无效日期靠库校验兜底报错。
4. **闰月**：复选框，仅农历模式显示；勾选表示所输月份为闰月，该年无此闰月则报错。
5. **时辰**：下拉 13 项——早子时 (00:00–00:59)、丑时 (01–03)、寅时 (03–05)……亥时 (21–23)、晚子时 (23:00–23:59)，显示「时辰名 + 时间段」；映射为小时数传给库，晚子时日柱归属采用库默认流派（算当天）。
6. **性别**：单选 男/女（大运顺逆排所必需）。
7. **排盘按钮**：前端校验 → lunar-javascript 排盘 → 渲染结果区，并清空旧解读内容。

输入非法（农历该月无 30 日、闰月不存在等）时表单下方红字提示，不排盘。CDN 加载失败（`Lunar` 未定义）时点击排盘提示「排盘组件加载失败，请刷新重试」。

## 中：排盘结果区

**基本信息行**：公历日期时间、农历日期时辰、生肖、性别、日主（日干及五行）。

**四柱表格**（4 列 = 年/月/日/时柱）：

| 行 | 内容 |
|---|---|
| 主星 | 天干十神（日柱位置显示「日主」） |
| 天干 | 干字 + 五行角标，按五行着色（CSS class：金/木/水/火/土） |
| 地支 | 支字 + 五行角标，同上 |
| 藏干 | 每支藏干（本气/中气/余气），各带五行色 |
| 副星 | 藏干对应十神，与藏干一一对应 |
| 星运 | 日干对各柱地支的十二长生 |
| 自坐 | 各柱天干对自身坐支的十二长生（库不直接提供，`bazi.js` 内置 10 干 × 12 支长生映射表推导） |
| 空亡 | 各柱旬空 |
| 纳音 | 各柱纳音 |

**附加信息区**：胎元、命宫、身宫；五行统计（4 干 + 4 支中金木水火土各几个，缺者标出）；起运信息（出生后几年几个月起运、起运公历年份）。

**大运列表**：排 10 步，横向卡片/表格，每步显示干支、起始年龄、起止年份；当前日期所在步高亮标「当前大运」。该数据同时是解读接口的数据源。

**范围边界**：传统八字神煞（天乙贵人、桃花等）lunar-javascript 不提供，**不做**。约定：库有的展示，库没有且无法用库能力简单推导的不展示。

**英文版术语**：干支显示「汉字 + 拼音」（如 甲 Jiǎ），十神/十二长生/纳音等用「汉字 + 英文意译」（如 正官 Direct Officer），文案字典在 `bazi.js`。

## 下：解读区与 API

### 前端流程

- 排盘完成后解读区出现「开始解读」按钮（不自动调用，由用户主动触发）。
- 点击后串行三次请求：① 八字解读 → ② 大运解读 → ③ 流年逐月解读。每部分一个卡片：「生成中…」→ `marked` 解析 + `DOMPurify` 净化后插入（LLM 输出不可信，禁止直接 `innerHTML`）。
- 某部分失败：该卡片显示错误 + 「重试」按钮，串行链中断；重试成功后自动继续后续部分。

### 接口：`POST /api/bazi/interpret`

新增于 `routes/api.ts`（兜底 404 之前），沿用 `{ ok, data | error }` 响应壳。

请求体：

```json
{
  "part": "bazi" | "dayun" | "liunian",
  "lang": "zh" | "en",
  "chart": {
    "gender": "male" | "female",
    "solar": "1990-05-20 14:00",
    "lunar": "一九九〇年四月廿六 未时",
    "pillars": {
      "year|month|day|hour": {
        "ganZhi", "shiShenGan", "hideGan", "shiShenZhi", "naYin", "xunKong"
      }
    },
    "dayMaster": "庚金",
    "wuxingCount": { "金": 2, "木": 1, "水": 2, "火": 1, "土": 2 },
    "qiYun": "出生后8年3个月起运，1998年起运",
    "daYun": [ { "ganZhi", "startAge", "startYear", "endYear", "isCurrent" } ],
    "now": {
      "solar": "2026-07-31",
      "lunar": "丙午年六月十八",
      "ganZhi": { "year": "丙午", "month": "乙未", "day": "……" },
      "liuNian": [ { "year": 2026, "ganZhi": "丙午", "age": 37 } ],
      "liuYue": [ { "month": 1, "ganZhi": "……" } ]
    }
  }
}
```

`now` 相关字段全部由前端用 lunar-javascript 计算（对所有人是纯日历量）：

- `now.ganZhi`：当前日期年/月/日三柱，年柱月柱按节气分界取精确值；**不传时柱**（页面打开时刻的时柱无解读意义）；
- `now.liuNian`：今年起 10 年流年干支 + 命主虚岁（供大运解读）；
- `now.liuYue`：今年 12 个流月干支，按节气分界（供流年逐月解读）。

「今年」「当前月份」以 `now` 为准，服务端不自行取时间（服务端无历法库，且改日期只影响请求者自己的解读内容，无安全后果）。

### 服务端处理

1. **限流**：Cloudflare Rate Limiting 绑定，按客户端 IP 10 次/60 秒，超限 429 `{ code: "rate_limited" }`。
2. **校验**（手写，不引入 zod）：`part`/`lang` 枚举；`chart` 白名单字段；干支字段过 60 甲子正则；`liuNian` 长度 ≤ 10、`liuYue` 长度 ≤ 12；各字符串字段长度 ≤ 100 字符；请求体总大小 ≤ 8 KB。不合法返回 400，错误信息不回显未截断的用户输入。
3. **提示词**：system prompt 设定「资深命理师，输出 Markdown，按 lang 用中文/英文回答」。user prompt 按 part 分支：
   - `bazi`：全盘分析——日主强弱、五行喜忌、性格、事业财运婚姻健康概述；
   - `dayun`：当前大运详解 + 今年起十年逐年运势（用 `now.liuNian` 干支对照命局，含跨大运交接）；
   - `liunian`：今年 12 个月逐月解读（用 `now.liuYue` 干支），当前月份加倍详细，可结合 `now.ganZhi.day` 日柱点一下近日状态。
   - 提示词构建拆为纯函数导出，便于单测。
4. **LLM 调用**：`fetch` `${LLM_BASE_URL}/v1/chat/completions`，模型 `LLM_MODEL`，非流式，AbortController 60 秒超时。上游非 2xx → 502 `{ code: "llm_error" }`；超时 → 504 `{ code: "llm_timeout" }`；不透传上游原始报文。
5. **响应**：`{ ok: true, data: { markdown: "..." } }`。

### 配置

- `wrangler.jsonc`：`vars` 加 `LLM_BASE_URL = https://apihub.agnes-ai.com`、`LLM_MODEL = agnes-2.0-flash`（非机密）；加 Rate Limiting 绑定。
- 密钥 `LLM_API_KEY`：线上 `wrangler secret put`，本地加入 `.dev.vars`（已 gitignore），由使用者自行配置，仓库不含密钥。

## 前端 JS：`public/assets/bazi.js`

原生 JS 单文件，四块结构：

1. **i18n 文案字典**：按 `document.documentElement.lang` 选 zh/en；
2. **排盘计算**：调 lunar-javascript；内置自坐长生映射表、五行归属/着色映射；同时生成 `now.ganZhi`/`liuNian`/`liuYue`；
3. **结果渲染**：拼 DOM，动态文本一律 `textContent`；
4. **解读请求链**：串行 fetch、加载态、错误重试、marked + DOMPurify 渲染。

## 测试计划

- `test/integration.test.ts` 补充：`/zh/bazi/` 与 `/en/bazi/` 返回 200，含表单骨架与脚本标签；导航与 sitemap 由现有断言体系自动覆盖。
- 新增 `test/bazi-api.test.ts`：
  - 校验分支：非法 part / lang / 干支格式 / 超大 body → 400；缺 `LLM_API_KEY` → 500；
  - LLM 上游用 vitest `fetchMock` 拦截：成功返回 markdown、上游 5xx → 502、超时 → 504；
  - 限流：覆盖「超限返回 429」分支（本地绑定行为有限，单元级即可）。
- 提示词纯函数单测：断言三种 part 的关键要素（当前日期干支、大运/流年/流月数据、语言指令）。
- `bazi.js` 无自动化测试（无构建链）：`npm run dev` 手工验证，排盘结果与知名排盘工具对照。

## 已知取舍

- 八字神煞不做（库不提供，按约定舍弃）。
- 真太阳时校正不做（需经度输入，超出需求范围）。
- 解读不做流式输出（用户明确选择普通 HTTP）。
- 前端 JS 不引入 TypeScript/构建链（项目无此设施，成本不成比例）。
- 「当日运势」不单独成接口 part，仅在流年解读的当前月部分顺带提及。
