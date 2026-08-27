# LLM 生成端点实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增类型驱动的 `POST /api/llm/generate` 端点（`{ type, data }` 进、`{ type, lang, markdown }` 出），并把自用端点鉴权统一为 `SITE_API_KEY`。

**Architecture:** 鉴权从 `src/routes/almanac.ts` 提取到共享的 `src/auth.ts`（读 `SITE_API_KEY`，almanac 3 端点同步迁移）；9 个生成类型以注册表组织在 `src/llmgen/`（每条目 = validate + system(lang) + user(data)，system 内嵌文案红线防线句），路由层查表组装后复用 `callLlm`。现有 7 个 interpret 端点一字不动。

**Tech Stack:** Cloudflare Workers + Hono + TypeScript；vitest（@cloudflare/vitest-pool-workers 真实 workerd 运行时；LLM stub 用 `cloudflare:test` 的 fetchMock）。

**Spec:** `docs/superpowers/specs/2026-08-28-llm-generate-api-design.md`

## Global Constraints

- 现有 7 个 interpret 端点（bazi/liuyao/meihua/xiaoliuren/zeji/ziwei/hehun）**一字不动**。
- 响应壳统一 `{ ok: true, data }` / `{ ok: false, error: { code, message } }`；错误消息不回显未截断的用户输入（回显一律 `slice` 截断）。
- 错误码与 HTTP：`unauthorized`(401) / `not_configured`(503, SITE_API_KEY 未配，鉴权优先判定) / `invalid_json`(400) / `payload_too_large`(413, body > 64KB) / `invalid_request`(400) / `not_configured`(500, LLM 未配，callLlm 返回) / `upstream_error`(502) / `upstream_timeout`(504)。
- 鉴权 secret 全名 `SITE_API_KEY`（生产 `wrangler secret put SITE_API_KEY`，本地 `.dev.vars`）；**不做旧名 `ALMANAC_API_KEY` 兼容读取**（一次性切换）。
- **部署顺序红线**：push 代码前必须先在生产配好 `SITE_API_KEY` secret，否则 almanac 3 端点 + generate 端点全部 503（Task 5 收尾必须向用户重申）。
- 文案红线防线句嵌入**每个** system 模板（zh 版含「人工智能」字样规则、en 版含 "artificial intelligence"），并全部有测试断言。
- system prompt 按 lang 出中/英两版；输出 Markdown、不让 LLM 直出 HTML。
- data 浅校验：`lang` ∈ `"zh" | "en"`、`date`/`monday` 为 `YYYY-MM-DD`、`month` 为 `YYYY-MM` 字符串、`almanac`/`week`/`skeleton` 为对象；**不做深递归校验**。
- 测试锚点（来自已验证输出）：2026-08-17 = 癸亥日、生肖猪、农历二〇二六年七月初五、宜含「祭祀」忌含「嫁娶」；`buildWeek("2026-08-17")` 特吉=鸡鼠牛、次吉=猴狗猪、忠告=马；`buildMonth("2026-08")` 月柱丙申、节气含立秋、六合蛇、三合鼠、相冲虎、相害猪、值月猴。写测试前先跑 CLI 复核（见各任务 Step）。
- 提交前必须 `npm test` + `npm run typecheck` 全绿；Windows 上测试尾部 miniflare EBUSY 警告是无害噪音。全量测试若遇 workerd 模块 RPC 环境性失败（No such module 但磁盘上存在 / ConnectEx 拒绝连接），先单文件复跑判别，勿当代码回归。
- PowerShell 5.1：命令分隔用 `;` 不用 `&&`；curl 用 `curl.exe`。

---

### Task 1: 提取 src/auth.ts，secret 改名 SITE_API_KEY

**Files:**
- Create: `src/auth.ts`
- Modify: `src/routes/almanac.ts`（删私有 AlmanacEnv/authProblem，改 import）
- Modify: `src/routes/api.ts`（AlmanacEnv → SiteAuthEnv）
- Modify: `test/almanac-api.test.ts`（env 注入名与 import 改 SITE_API_KEY/src/auth）
- Modify: `.dev.vars`（行名改名，值不变）

**Interfaces:**
- Consumes: 现有 `authProblem`（almanac.ts 私有，行为保持：503 优先于 401）。
- Produces: `src/auth.ts` 导出 `interface SiteAuthEnv { SITE_API_KEY?: string }` 与 `authProblem(env: SiteAuthEnv | undefined, apiKeyHeader: string | undefined): { code: string; message: string; status: 503 | 401 } | null`。Task 4 的路由直接 import 使用。

- [ ] **Step 1: 改测试（RED）**

`test/almanac-api.test.ts` 三处修改（其余 16 个用例的断言全部不动）：

```ts
// 1) import 行替换：
import type { SiteAuthEnv } from "../src/auth";
// （删除原 import type { AlmanacEnv } from "../src/routes/almanac";）

// 2) baseEnv 替换：
const baseEnv: SiteAuthEnv = { SITE_API_KEY: "test-key" };

// 3) 用例名里的 secret 名同步（仅描述文本，断言不变）：
//    "returns 503 not_configured when ALMANAC_API_KEY is not set"
// → "returns 503 not_configured when SITE_API_KEY is not set"
```

- [ ] **Step 2: 跑测试确认 RED**

Run: `npx vitest run test/almanac-api.test.ts`
Expected: FAIL —— `Cannot find module '../src/auth'`（模块尚不存在，测试文件加载失败）。

- [ ] **Step 3: 实现**

创建 `src/auth.ts`：

```ts
/** 自用数据/生成端点的共享鉴权（生产 wrangler secret put SITE_API_KEY / 本地 .dev.vars） */
export interface SiteAuthEnv {
  SITE_API_KEY?: string;
}

/** 鉴权：未配置 secret → 503（防忘配裸奔）；key 缺失/不匹配 → 401 */
export function authProblem(
  env: SiteAuthEnv | undefined,
  apiKeyHeader: string | undefined,
): { code: string; message: string; status: 503 | 401 } | null {
  const expected = env?.SITE_API_KEY;
  if (!expected) return { code: "not_configured", message: "Site API is not configured.", status: 503 };
  if (apiKeyHeader !== expected) return { code: "unauthorized", message: "Invalid or missing x-api-key header.", status: 401 };
  return null;
}
```

（message 由 "Almanac API is not configured." 通用化为 "Site API is not configured."——测试只断言 code，安全。）

`src/routes/almanac.ts` 修改：删除 L7-10 的 `AlmanacEnv` 接口与 L19-28 的 `authProblem` 函数，文件头加 import，注册函数签名换类型：

```ts
import { authProblem, type SiteAuthEnv } from "../auth";
// …
export function registerAlmanacRoutes(api: Hono<{ Bindings: SiteAuthEnv & StatsEnv }>): void {
```

`src/routes/api.ts` 修改：

```ts
// import 区：删除 import type { AlmanacEnv } from "./almanac"; 换成：
import type { SiteAuthEnv } from "../auth";
// L25 Bindings 联合：… & AlmanacEnv & StatsEnv → … & SiteAuthEnv & StatsEnv
```

`.dev.vars` 修改（L4-L6，值不变）：

```
SITE_API_KEY=dev-local-key

# 线上 SITE_API_KEY: ACAKA3DSC7g34pOkc9UyJVynVp9Xy84
# curl.exe -s -H "x-api-key: ACAKA3DSC7g34pOkc9UyJVynVp9Xy84" "https://suanming-zhanbu.com/api/almanac?date=2026-09-01"
```

- [ ] **Step 4: 跑测试确认 GREEN**

Run: `npx vitest run test/almanac-api.test.ts`
Expected: PASS（16 用例全绿）。

再跑 `npm run typecheck`（Expected: 零错误）与 `npx vitest run test/bazi-api.test.ts`（确认 api.ts Bindings 改动无副作用，PASS）。

- [ ] **Step 5: Commit**

```bash
git add src/auth.ts src/routes/almanac.ts src/routes/api.ts test/almanac-api.test.ts
git commit -m "refactor: extract site auth to src/auth.ts, rename secret to SITE_API_KEY"
```

（`.dev.vars` 不入库，不 add。）

---

### Task 2: llmgen 基础设施 + daily 三个生成条目

**Files:**
- Create: `src/llmgen/types.ts`
- Create: `src/llmgen/prompt-common.ts`
- Create: `src/llmgen/daily.ts`
- Create: `src/llmgen/registry.ts`
- Test: `test/llmgen-prompt.test.ts`

**Interfaces:**
- Consumes: `compute`（`src/almanac/compute.ts`，`compute(dateStr: string)`）、`Lang`（`src/config/site.ts`，`"zh" | "en"`）。
- Produces（Task 3/4 依赖，签名以此为准）:
  - `types.ts`：`type AlmanacData = ReturnType<typeof compute>`；`type WeekData = ReturnType<typeof buildWeek>`；`type MonthData = ReturnType<typeof buildMonth>`（后两者 Task 3 才用到，类型定义本任务一次写全）；`interface DailyGenerateData { lang: Lang; date: string; almanac: AlmanacData }`；`type GenType`（本任务只含 `"daily-reading" | "daily-zodiac" | "daily-story"`，Task 3 扩展）；`type ValidateResult<D> = { ok: true; value: D } | { ok: false; message: string }`；`interface GeneratorDef<D> { validate(data: unknown): ValidateResult<D>; system(lang: Lang): string; user(data: D): string }`；`interface AnyGenerator { validate(data: unknown): ValidateResult<unknown>; system(lang: Lang): string; user(data: unknown): string }`；`function makeGenerator<D>(def: GeneratorDef<D>): AnyGenerator`。
  - `daily.ts`：`export const dailyGenerators: { "daily-reading": AnyGenerator; "daily-zodiac": AnyGenerator; "daily-story": AnyGenerator }`。
  - `registry.ts`：`export const GENERATORS: Record<GenType, AnyGenerator>`。

- [ ] **Step 0: 复核锚点**

Run: `npx tsx scripts/almanac.ts 2026-08-17`
Expected: 输出含 `dayGanZhi: 癸亥`、`zodiac: 猪`、宜数组含「祭祀」、忌数组含「嫁娶」。若与计划不符，以 CLI 实际输出修正下方测试断言值。

- [ ] **Step 1: 写失败测试**

创建 `test/llmgen-prompt.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { compute } from "../src/almanac/compute";
import { dailyGenerators } from "../src/llmgen/daily";
import type { DailyGenerateData } from "../src/llmgen/types";

// 锚点：2026-08-17 癸亥日、生肖猪、宜含祭祀（Step 0 已复核）
const data: DailyGenerateData = { lang: "zh", date: "2026-08-17", almanac: compute("2026-08-17") };

describe("llmgen daily system prompts", () => {
  for (const type of ["daily-reading", "daily-zodiac", "daily-story"] as const) {
    it(`${type}: zh system embeds guard rule`, () => {
      expect(dailyGenerators[type].system("zh")).toContain("人工智能");
    });
    it(`${type}: en system embeds guard rule`, () => {
      expect(dailyGenerators[type].system("en")).toContain("artificial intelligence");
    });
  }
});

describe("llmgen daily user prompts", () => {
  it("daily-reading embeds date and key almanac fields", () => {
    const u = dailyGenerators["daily-reading"].user(data);
    expect(u).toContain("2026-08-17");
    expect(u).toContain("癸亥");
    expect(u).toContain("祭祀");
  });
  it("daily-zodiac names the day's zodiac protagonist and clash animal", () => {
    const u = dailyGenerators["daily-zodiac"].user(data);
    expect(u).toContain("猪");
    expect(u).toContain("蛇"); // 2026-08-17 冲蛇（亥冲巳）
  });
  it("daily-story embeds the full almanac JSON", () => {
    const u = dailyGenerators["daily-story"].user(data);
    expect(u).toContain("勾陈"); // 当日天神
  });
});

describe("llmgen daily validate", () => {
  it("accepts a well-formed payload", () => {
    const v = dailyGenerators["daily-reading"].validate(data);
    expect(v.ok).toBe(true);
  });
  it("rejects bad lang / bad date / missing almanac", () => {
    expect(dailyGenerators["daily-reading"].validate({ ...data, lang: "fr" }).ok).toBe(false);
    expect(dailyGenerators["daily-reading"].validate({ ...data, date: "2026/08/17" }).ok).toBe(false);
    expect(dailyGenerators["daily-reading"].validate({ lang: "zh", date: "2026-08-17" }).ok).toBe(false);
  });
});
```

注意：`daily-zodiac` 断言冲煞生肖「蛇」——2026-08-17 冲蛇（亥冲巳），若 Step 0 输出的 `chongZodiac` 不同则以实际值替换。

- [ ] **Step 2: 跑测试确认 RED**

Run: `npx vitest run test/llmgen-prompt.test.ts`
Expected: FAIL —— `Cannot find module '../src/llmgen/daily'`。

- [ ] **Step 3: 实现**

创建 `src/llmgen/types.ts`：

```ts
import type { Lang } from "../config/site";
import type { compute } from "../almanac/compute";
import type { buildWeek, buildMonth } from "../fortune/skeleton";

/** GET /api/almanac 的 data 形状（与 compute() 输出同构） */
export type AlmanacData = ReturnType<typeof compute>;
/** GET /api/fortune/week 的 data 形状 */
export type WeekData = ReturnType<typeof buildWeek>;
/** GET /api/fortune/month 的 data 形状 */
export type MonthData = ReturnType<typeof buildMonth>;

export interface DailyGenerateData {
  lang: Lang;
  date: string; // YYYY-MM-DD
  almanac: AlmanacData;
}
export interface WeeklyGenerateData {
  lang: Lang;
  monday: string; // YYYY-MM-DD
  week: WeekData;
}
export interface MonthlyGenerateData {
  lang: Lang;
  month: string; // YYYY-MM
  skeleton: MonthData;
}

/** 已注册的生成类型（Task 3 扩展 weekly/monthly 六个） */
export type GenType = "daily-reading" | "daily-zodiac" | "daily-story";

export type ValidateResult<D> = { ok: true; value: D } | { ok: false; message: string };

/** 单个生成条目的强类型定义（栏目文件内部使用） */
export interface GeneratorDef<D> {
  validate(data: unknown): ValidateResult<D>;
  system(lang: Lang): string;
  user(data: D): string;
}

/** 注册表条目的统一形状（路由层使用；user 只在 validate 通过后调用） */
export interface AnyGenerator {
  validate(data: unknown): ValidateResult<unknown>;
  system(lang: Lang): string;
  user(data: unknown): string;
}

/** 把强类型条目适配为注册表条目 */
export function makeGenerator<D>(def: GeneratorDef<D>): AnyGenerator {
  return {
    validate: def.validate,
    system: def.system,
    user: (data) => def.user(data as D), // 仅在 validate 通过后调用，断言安全
  };
}
```

创建 `src/llmgen/prompt-common.ts`：

```ts
import type { Lang } from "../config/site";

/** 各生成条目 system prompt 的公共规则（数据纪律 / Markdown / 防线 / 语言） */
export function commonRules(lang: Lang): string[] {
  if (lang === "zh") {
    return [
      "只依据用户提供的历法数据推演，不要另行推算或质疑数据。",
      "用 Markdown 输出（可用三级标题与列表），不要输出代码块。",
      "不要自称或提及人工智能、语言模型、算法、程序，不谈自身的性质与局限，始终以传统命理作者口吻专注于内容本身。",
      "全文使用中文。",
    ];
  }
  return [
    "Base your writing only on the calendar data provided; never recalculate or question it.",
    "Output Markdown (h3 headings and lists are fine), no code blocks.",
    "Never refer to yourself as an artificial intelligence, language model, algorithm or program, and do not discuss your own nature or limitations; stay in character as a traditional Chinese-astrology author and focus solely on the writing.",
    "Respond entirely in English. Keep Chinese terms such as GanZhi, JieQi and zodiac branches, each followed by a short English gloss on first use.",
  ];
}
```

创建 `src/llmgen/daily.ts`：

```ts
import type { Lang } from "../config/site";
import { commonRules } from "./prompt-common";
import { makeGenerator, type DailyGenerateData, type GeneratorDef, type ValidateResult } from "./types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** daily 条目共用 data 校验（浅校验，不深递归：数据来自自家 /api/almanac） */
export function validateDailyData(data: unknown): ValidateResult<DailyGenerateData> {
  if (typeof data !== "object" || data === null) return { ok: false, message: "data must be an object." };
  const d = data as Record<string, unknown>;
  if (d.lang !== "zh" && d.lang !== "en") return { ok: false, message: 'data.lang must be "zh" or "en".' };
  if (typeof d.date !== "string" || !DATE_RE.test(d.date)) {
    return { ok: false, message: "data.date must be a YYYY-MM-DD string." };
  }
  if (typeof d.almanac !== "object" || d.almanac === null) {
    return { ok: false, message: "data.almanac must be the data object of GET /api/almanac." };
  }
  return { ok: true, value: d as unknown as DailyGenerateData };
}

const ROLE: Record<Lang, string> = {
  zh: "你是一位精通传统黄历与宜忌文化的资深作者，为每日黄历栏目撰稿。",
  en: "You are a seasoned author of traditional Chinese almanac (Tong Shu) culture, writing for a daily almanac column.",
};

function dataBlock(d: DailyGenerateData): string {
  return [`日期：${d.date}（农历 ${d.almanac.lunar}）`, "当日历法数据（JSON）：", JSON.stringify(d.almanac, null, 2)].join("\n");
}

/** 任务指令按 lang 出双语版；主角/冲煞等动态字段在函数体内拼接 */
function readingTask(d: DailyGenerateData): string {
  if (d.lang === "zh") {
    return "请为这天的黄历宜忌写一段导引解读（2-4 句，约 100-150 字）：点出宜、忌中最值得注意的事项与当日冲煞生肖，结合喜神/财神/福神方位给读者一句当日行动建议。语气传统温和，不作绝对化断言。";
  }
  return "Write a 2-4 sentence introduction (about 80-120 words) for this day's do's and don'ts: highlight the most notable Yi/Ji items and the clash animal, and close with one practical suggestion drawing on the favourable directions (Xi/Cai/Fu). Keep a gentle, traditional tone without absolute claims.";
}

function zodiacTask(d: DailyGenerateData): string {
  if (d.lang === "zh") {
    return `请以当日地支对应的生肖「${d.almanac.zodiac}」为主角，写一段当日运势短文（约 150-250 字）：先 1-2 句总运（结合当日干支五行与${d.almanac.zodiac}当值之日），再从财运、感情、事业、健康中择要写 2-3 句，最后给一句行事建议；顺带提醒避开与被冲生肖「${d.almanac.chongZodiac}」相关的冲煞事项。`;
  }
  return `Write a daily fortune piece (about 120-200 words) starring the day's zodiac "${d.almanac.zodiac}" (write it as the English zodiac name, e.g. Pig, Rat): open with 1-2 sentences of overall luck (the day pillar and its element), cover 2-3 of wealth, love, career and health, and close with one piece of advice; briefly remind readers to avoid clash-related matters with "${d.almanac.chongZodiac}", the clash animal of the day.`;
}

function storyTask(d: DailyGenerateData): string {
  if (d.lang === "zh") {
    return "请围绕当日主题写一段玄学科普或民俗典故（约 200-300 字）：取材优先级为当日节气 > 天神黄黑道 > 纳音 > 冲煞；讲清一个知识点，行文传统平实，民俗说法可用「传统认为／旧俗云」引出，不要编造具体文献出处。";
  }
  return "Write a piece of folklore or cultural background (about 150-250 words) around this day's theme: priority order is the day's solar term (JieQi) > day god (TianShen, yellow/black path) > NaYin > clash. Explain one knowledge point clearly in a plain, traditional voice; attribute folk sayings to tradition rather than inventing specific textual sources.";
}

function def(task: (d: DailyGenerateData) => string): GeneratorDef<DailyGenerateData> {
  return {
    validate: validateDailyData,
    system: (lang) => [ROLE[lang], ...commonRules(lang)].join("\n"),
    user: (d) => [dataBlock(d), task(d)].join("\n\n"),
  };
}

export const dailyGenerators = {
  "daily-reading": makeGenerator(def(readingTask)),
  "daily-zodiac": makeGenerator(def(zodiacTask)),
  "daily-story": makeGenerator(def(storyTask)),
};
```

创建 `src/llmgen/registry.ts`：

```ts
import { dailyGenerators } from "./daily";
import type { AnyGenerator, GenType } from "./types";

/** 生成条目注册表：加新 type = 在栏目文件加条目并在此聚合 */
export const GENERATORS: Record<GenType, AnyGenerator> = {
  ...dailyGenerators,
};
```

- [ ] **Step 4: 跑测试确认 GREEN**

Run: `npx vitest run test/llmgen-prompt.test.ts`
Expected: PASS（11 用例：6 system + 3 user + 2 validate）。

再跑 `npm run typecheck`（Expected: 零错误）。

- [ ] **Step 5: Commit**

```bash
git add src/llmgen/types.ts src/llmgen/prompt-common.ts src/llmgen/daily.ts src/llmgen/registry.ts test/llmgen-prompt.test.ts
git commit -m "feat(llmgen): add type registry and daily generators with guard-tested prompts"
```

---

### Task 3: weekly + monthly 六个生成条目

**Files:**
- Create: `src/llmgen/weekly.ts`
- Create: `src/llmgen/monthly.ts`
- Modify: `src/llmgen/types.ts`（GenType 扩展为 9 个）
- Modify: `src/llmgen/registry.ts`（聚合 weekly/monthly）
- Test: `test/llmgen-prompt.test.ts`（追加用例）

**Interfaces:**
- Consumes: Task 2 的 `makeGenerator`/`AnyGenerator`/`GeneratorDef`/`ValidateResult`（签名见 Task 2 Produces）；`buildWeek`/`buildMonth`（`src/fortune/skeleton.ts`）。
- Produces: `weekly.ts` 导出 `weeklyGenerators`（键 `"weekly-summary" | "weekly-zodiac" | "weekly-days"`）；`monthly.ts` 导出 `monthlyGenerators`（键 `"monthly-summary" | "monthly-zodiac" | "monthly-lucky"`）；`types.ts` 的 `GenType` 扩展为 9 值联合；`registry.ts` 的 `GENERATORS` 覆盖全部 9 键（Task 4 路由依赖）。

- [ ] **Step 0: 复核锚点**

Run: `npx tsx scripts/fortune.ts week 2026-08-17`
Expected: 特吉=鸡、鼠、牛；次吉=猴、狗、猪；忠告=马。

Run: `npx tsx scripts/fortune.ts month 2026-08`
Expected: 月柱丙申（含分段）、节气含立秋、六合蛇、三合鼠、相冲虎、相害猪、值月猴。

若与计划不符，以 CLI 实际输出修正下方测试断言值。

- [ ] **Step 1: 追加失败测试**

在 `test/llmgen-prompt.test.ts` 头部 import 区追加：

```ts
import { buildWeek, buildMonth } from "../src/fortune/skeleton";
import { weeklyGenerators } from "../src/llmgen/weekly";
import { monthlyGenerators } from "../src/llmgen/monthly";
import { GENERATORS } from "../src/llmgen/registry";
import type { WeeklyGenerateData, MonthlyGenerateData } from "../src/llmgen/types";
```

文件末尾追加：

```ts
const weekData: WeeklyGenerateData = { lang: "zh", monday: "2026-08-17", week: buildWeek("2026-08-17") };
const monthData: MonthlyGenerateData = { lang: "zh", month: "2026-08", skeleton: buildMonth("2026-08") };

describe("llmgen weekly/monthly system prompts", () => {
  const types = ["weekly-summary", "weekly-zodiac", "weekly-days", "monthly-summary", "monthly-zodiac", "monthly-lucky"] as const;
  for (const type of types) {
    it(`${type}: zh system embeds guard rule`, () => {
      expect(GENERATORS[type].system("zh")).toContain("人工智能");
    });
    it(`${type}: en system embeds guard rule`, () => {
      expect(GENERATORS[type].system("en")).toContain("artificial intelligence");
    });
  }
});

describe("llmgen weekly/monthly user prompts", () => {
  it("weekly-summary user embeds rank summary", () => {
    const u = weeklyGenerators["weekly-summary"].user(weekData);
    expect(u).toContain("特吉");
    expect(u).toContain("鸡"); // 锚点：特吉之首
    expect(u).toContain("2026-08-17");
  });
  it("weekly-days user embeds the full week span", () => {
    const u = weeklyGenerators["weekly-days"].user(weekData);
    expect(u).toContain("2026-08-23"); // 周日
  });
  it("monthly-summary user embeds month pillar and solar term", () => {
    const u = monthlyGenerators["monthly-summary"].user(monthData);
    expect(u).toContain("丙申");
    expect(u).toContain("立秋");
  });
  it("monthly-lucky user embeds luckyDays data", () => {
    const u = monthlyGenerators["monthly-lucky"].user(monthData);
    expect(u).toContain("luckyDays");
  });
});

describe("llmgen weekly/monthly validate", () => {
  it("weekly rejects malformed monday and missing week", () => {
    expect(weeklyGenerators["weekly-summary"].validate({ ...weekData, monday: "2026/08/17" }).ok).toBe(false);
    expect(weeklyGenerators["weekly-summary"].validate({ lang: "zh", monday: "2026-08-17" }).ok).toBe(false);
  });
  it("monthly rejects malformed month and missing skeleton", () => {
    expect(monthlyGenerators["monthly-summary"].validate({ ...monthData, month: "2026-8" }).ok).toBe(false);
    expect(monthlyGenerators["monthly-summary"].validate({ lang: "zh", month: "2026-08" }).ok).toBe(false);
  });
  it("GENERATORS covers all 9 types", () => {
    expect(Object.keys(GENERATORS).sort()).toEqual(
      [
        "daily-reading", "daily-story", "daily-zodiac",
        "monthly-lucky", "monthly-summary", "monthly-zodiac",
        "weekly-days", "weekly-summary", "weekly-zodiac",
      ].sort(),
    );
  });
});
```

- [ ] **Step 2: 跑测试确认 RED**

Run: `npx vitest run test/llmgen-prompt.test.ts`
Expected: FAIL —— `Cannot find module '../src/llmgen/weekly'`（新增 import 加载失败；原 daily 用例仍绿）。

- [ ] **Step 3: 实现**

创建 `src/llmgen/weekly.ts`：

```ts
import type { Lang } from "../config/site";
import { commonRules } from "./prompt-common";
import { makeGenerator, type GeneratorDef, type ValidateResult, type WeeklyGenerateData } from "./types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** weekly 条目共用 data 校验（浅校验：monday 只查格式，不校验是否真为周一——数据来自自家 API） */
export function validateWeeklyData(data: unknown): ValidateResult<WeeklyGenerateData> {
  if (typeof data !== "object" || data === null) return { ok: false, message: "data must be an object." };
  const d = data as Record<string, unknown>;
  if (d.lang !== "zh" && d.lang !== "en") return { ok: false, message: 'data.lang must be "zh" or "en".' };
  if (typeof d.monday !== "string" || !DATE_RE.test(d.monday)) {
    return { ok: false, message: "data.monday must be a YYYY-MM-DD string (the Monday of the week)." };
  }
  if (typeof d.week !== "object" || d.week === null) {
    return { ok: false, message: "data.week must be the data object of GET /api/fortune/week." };
  }
  return { ok: true, value: d as unknown as WeeklyGenerateData };
}

const ROLE: Record<Lang, string> = {
  zh: "你是一位资深生肖运势专栏作者，为每周运势栏目撰稿。",
  en: "You are an experienced Chinese-zodiac fortune columnist writing a weekly column.",
};

function dataBlock(d: WeeklyGenerateData): string {
  const r = d.week.ranks;
  return [
    `本周：${d.week.week.monday} 至 ${d.week.week.sunday}`,
    `特吉生肖：${r.teJi.map((z) => z.zodiac).join("、")}；次吉生肖：${r.ciJi.map((z) => z.zodiac).join("、")}；忠告生肖：${r.zhonggao.zodiac}`,
    "本周数据（JSON）：",
    JSON.stringify(d.week, null, 2),
  ].join("\n");
}

function summaryTask(d: WeeklyGenerateData): string {
  if (d.lang === "zh") {
    return "请为本周写运势导语与排名解读（约 250-350 字）：先 2-3 句总述本周干支背景（年柱、月柱与本周跨度内的节气变化，依据数据），再分别解读特吉三名生肖（本周与其六合、三合的日子较多）、次吉三名、忠告一名（冲、害日较多，宜守不宜攻），语气喜庆但不过度承诺。";
  }
  return "Write the weekly introduction and ranking commentary (about 200-300 words): open with 2-3 sentences on the week's GanZhi backdrop (year/month pillars and any solar-term shift within the week, from the data), then explain the three top-luck signs (more LiuHe/SanHe days ahead), the three runner-ups, and the one caution sign (more clash/harm days — steady and conservative). Celebratory, never over-promising.";
}

function zodiacTask(d: WeeklyGenerateData): string {
  if (d.lang === "zh") {
    return "请为 12 生肖各写六行周运：严格按数据 zodiacs 数组的顺序输出，每生肖一个「### 生肖名」小节，其下六行列表——- **整体**：…、- **财运**：…、- **爱情**：…、- **事业**：…、- **健康**：…、- **建议**：…（每项 1 句）。语气与排名呼应：特吉生肖写得明朗，忠告生肖温和提醒；只依据各生肖在数据中的 relations（六合/三合/相冲/相害的日子）与 score 推演，不要虚构日期。";
  }
  return "Write a six-line weekly entry for each of the 12 zodiac signs: follow the exact order of the zodiacs array in the data, one \"### <Sign>\" section per sign with a list of six bolded rows — **Overall**, **Wealth**, **Love**, **Career**, **Health**, **Advice** — one sentence each. Match the tone to the ranking (bright for top-luck signs, gently cautionary for the caution sign); derive everything from each sign's relations (LiuHe/SanHe/clash/harm days) and score in the data, never invent dates.";
}

function daysTask(d: WeeklyGenerateData): string {
  if (d.lang === "zh") {
    return "请为本周 7 天各写要点点评：严格按数据 days 数组顺序，每天先一行加粗要点头（格式统一，如「**周一 2026-08-17 癸亥日 · 冲蛇 · 煞西**」——以数据实际值为准），随后 1-2 句点评：当日宜什么、忌什么、天神黄黑道如何、适合安排什么。简短实用，不要展开成段落。";
  }
  return "Write a short note for each of the 7 days: follow the exact order of the days array, one bolded headline per day (consistent format, e.g. \"**Mon 2026-08-17 Gui-Hai day · clash Snake · evil direction West**\" — use the actual values in the data), then 1-2 sentences on what the day favours, what to avoid, and the day god (yellow/black path). Brief and practical, no long paragraphs.";
}

function def(task: (d: WeeklyGenerateData) => string): GeneratorDef<WeeklyGenerateData> {
  return {
    validate: validateWeeklyData,
    system: (lang) => [ROLE[lang], ...commonRules(lang)].join("\n"),
    user: (d) => [dataBlock(d), task(d)].join("\n\n"),
  };
}

export const weeklyGenerators = {
  "weekly-summary": makeGenerator(def(summaryTask)),
  "weekly-zodiac": makeGenerator(def(zodiacTask)),
  "weekly-days": makeGenerator(def(daysTask)),
};
```

创建 `src/llmgen/monthly.ts`：

```ts
import type { Lang } from "../config/site";
import { commonRules } from "./prompt-common";
import { makeGenerator, type GeneratorDef, type ValidateResult, type MonthlyGenerateData } from "./types";

const MONTH_RE = /^\d{4}-\d{2}$/;

/** monthly 条目共用 data 校验（浅校验，不深递归：数据来自自家 /api/fortune/month） */
export function validateMonthlyData(data: unknown): ValidateResult<MonthlyGenerateData> {
  if (typeof data !== "object" || data === null) return { ok: false, message: "data must be an object." };
  const d = data as Record<string, unknown>;
  if (d.lang !== "zh" && d.lang !== "en") return { ok: false, message: 'data.lang must be "zh" or "en".' };
  if (typeof d.month !== "string" || !MONTH_RE.test(d.month)) {
    return { ok: false, message: "data.month must be a YYYY-MM string." };
  }
  if (typeof d.skeleton !== "object" || d.skeleton === null) {
    return { ok: false, message: "data.skeleton must be the data object of GET /api/fortune/month." };
  }
  return { ok: true, value: d as unknown as MonthlyGenerateData };
}

const ROLE: Record<Lang, string> = {
  zh: "你是一位资深生肖运势专栏作者，为每月运势栏目撰稿。",
  en: "You are an experienced Chinese-zodiac fortune columnist writing a monthly column.",
};

function dataBlock(d: MonthlyGenerateData): string {
  const s = d.skeleton;
  const jieQi = s.jieQiInMonth.map((j) => `${j.name} ${j.date}`).join("、");
  return [
    `月份：${s.month}`,
    `月柱：${s.monthGanZhi}（年柱 ${s.yearGanZhi}）`,
    `本月节气：${jieQi}`,
    "本月数据（JSON）：",
    JSON.stringify(s, null, 2),
  ].join("\n");
}

function summaryTask(d: MonthlyGenerateData): string {
  if (d.lang === "zh") {
    return "请为本月写运势总览（约 300-400 字）：先讲月柱分段（数据 monthPillarSegments，何日起换柱）与本月节气（jieQiInMonth）；再总说本月月支与十二生肖的关系格局——六合、三合、相冲、相害、值月各是哪些生肖（依据 monthBranchHelpers 与 zodiacs）；结尾一句本月基调提醒。";
  }
  return "Write the monthly overview (about 250-350 words): start with the month-pillar segments (monthPillarSegments in the data — when the pillar changes) and this month's solar terms (jieQiInMonth); then summarise the month branch's relations with the twelve signs — which signs are LiuHe, SanHe, clash, harm and on-duty (from monthBranchHelpers and zodiacs); close with one line on the month's overall tone.";
}

function zodiacTask(d: MonthlyGenerateData): string {
  if (d.lang === "zh") {
    return "请为 12 生肖各写六维月运深化：严格按数据 zodiacs 数组顺序，每生肖一个「### 生肖名」小节，六行列表——- **整体**：…、- **财运**：…、- **爱情**：…、- **事业**：…、- **健康**：…、- **建议**：…（每维 1-2 句）。以各生肖的 monthRelation 定基调：六合最吉、三合次吉、值月平稳有助力、相害防口舌是非、相冲多变动；monthRelation 为空的生肖按本月月支五行气势平和带过，不强行拔高或贬低。";
  }
  return "Write a six-dimension monthly deep-dive for each of the 12 zodiac signs: follow the exact order of the zodiacs array, one \"### <Sign>\" section per sign with six bolded rows — **Overall**, **Wealth**, **Love**, **Career**, **Health**, **Advice** — 1-2 sentences each. Set the tone by each sign's monthRelation: LiuHe most fortunate, SanHe next, on-duty steady with support, harm guards against gossip and disputes, clash signals change; for signs with an empty monthRelation, write a balanced note based on the month branch's element — no forced highs or lows.";
}

function luckyTask(d: MonthlyGenerateData): string {
  if (d.lang === "zh") {
    return "请为吉日速查写解读：按数据 luckyDays 数组（每类含命中日期与当日冲煞）逐类点评，每类 1-2 句——点出该类最值得选的日期，并按各日 chongZodiac 给一句冲煞提醒；结尾一句本月择吉总则（优先天神吉日，避开冲自己生肖的日子）。";
  }
  return "Write commentary for the auspicious-day quick reference: go through the luckyDays array in the data (each category lists matching dates with their clash details), 1-2 sentences per category — name the single best pick and add a clash reminder based on each day's chongZodiac; close with one general rule for choosing days this month (favour days with auspicious day gods, avoid days clashing your own sign).";
}

function def(task: (d: MonthlyGenerateData) => string): GeneratorDef<MonthlyGenerateData> {
  return {
    validate: validateMonthlyData,
    system: (lang) => [ROLE[lang], ...commonRules(lang)].join("\n"),
    user: (d) => [dataBlock(d), task(d)].join("\n\n"),
  };
}

export const monthlyGenerators = {
  "monthly-summary": makeGenerator(def(summaryTask)),
  "monthly-zodiac": makeGenerator(def(zodiacTask)),
  "monthly-lucky": makeGenerator(def(luckyTask)),
};
```

修改 `src/llmgen/types.ts` 的 GenType（其余不动）：

```ts
/** 已注册的生成类型 */
export type GenType =
  | "daily-reading"
  | "daily-zodiac"
  | "daily-story"
  | "weekly-summary"
  | "weekly-zodiac"
  | "weekly-days"
  | "monthly-summary"
  | "monthly-zodiac"
  | "monthly-lucky";
```

修改 `src/llmgen/registry.ts`：

```ts
import { dailyGenerators } from "./daily";
import { weeklyGenerators } from "./weekly";
import { monthlyGenerators } from "./monthly";
import type { AnyGenerator, GenType } from "./types";

/** 生成条目注册表：加新 type = 在栏目文件加条目并在此聚合 */
export const GENERATORS: Record<GenType, AnyGenerator> = {
  ...dailyGenerators,
  ...weeklyGenerators,
  ...monthlyGenerators,
};
```

- [ ] **Step 4: 跑测试确认 GREEN**

Run: `npx vitest run test/llmgen-prompt.test.ts`
Expected: PASS（Task 2 的 11 用例 + 本任务 20 用例 = 31 用例全绿）。

再跑 `npm run typecheck`（Expected: 零错误）。

- [ ] **Step 5: Commit**

```bash
git add src/llmgen/weekly.ts src/llmgen/monthly.ts src/llmgen/types.ts src/llmgen/registry.ts test/llmgen-prompt.test.ts
git commit -m "feat(llmgen): add weekly and monthly generators, complete 9-type registry"
```

---

### Task 4: POST /api/llm/generate 路由

**Files:**
- Create: `src/routes/llmgen.ts`
- Modify: `src/routes/api.ts`（import / Bindings / 挂载，四处小改）
- Test: `test/llmgen-api.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `authProblem`/`SiteAuthEnv`（`src/auth.ts`）；Task 2/3 的 `GENERATORS`（`src/llmgen/registry.ts`，键覆盖全部 9 个 GenType）；`callLlm`/`LlmEnv`（`src/llm.ts`——LLM 三键不全时返回 `{ ok: false, code: "not_configured", status: 500 }` 不发请求）；`recordApiCall`/`StatsEnv`（`src/stats.ts`）。
- Produces: `src/routes/llmgen.ts` 导出 `registerLlmgenRoutes(api: Hono<{ Bindings: SiteAuthEnv & LlmEnv & StatsEnv }>): void`，注册 `POST /llm/generate`（api 子应用内，实际路径 `/api/llm/generate`）。Task 5 的冒烟走本地 dev 服务器 HTTP，不直接调此函数。

- [ ] **Step 1: 写失败测试**

创建 `test/llmgen-api.test.ts`：

```ts
import { fetchMock } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { api } from "../src/routes/api";
import { compute } from "../src/almanac/compute";
import type { SiteAuthEnv } from "../src/auth";
import type { LlmEnv } from "../src/llm";
import type { StatsEnv } from "../src/stats";

type TestEnv = SiteAuthEnv & LlmEnv & StatsEnv;

// LLM_BASE_URL 不含 /v1：callLlm 内部拼 `${LLM_BASE_URL}/v1/chat/completions`（与 bazi-api.test.ts 同源 stub）
const baseEnv: TestEnv = {
  SITE_API_KEY: "test-key",
  LLM_BASE_URL: "https://apihub.agnes-ai.com",
  LLM_MODEL: "test-model",
  LLM_API_KEY: "test-llm-key",
};

// 锚点：2026-08-17 癸亥日、生肖猪（Task 2 Step 0 已复核）
const goodData = { lang: "zh", date: "2026-08-17", almanac: compute("2026-08-17") };

function req(body: string, key?: string): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (key !== undefined) headers["x-api-key"] = key;
  return new Request("http://localhost/api/llm/generate", { method: "POST", headers, body });
}

const jsonBody = (type: unknown, data: unknown) => JSON.stringify({ type, data });

type ApiJson = {
  ok: boolean;
  data?: { type?: string; lang?: string; markdown?: string };
  error?: { code: string; message?: string };
};

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});

afterEach(() => {
  fetchMock.assertNoPendingInterceptors();
});

function stubLlm(content: string, status = 200): void {
  fetchMock
    .get("https://apihub.agnes-ai.com")
    .intercept({ path: "/v1/chat/completions", method: "POST" })
    .reply(status, { choices: [{ message: { content } }] });
}

describe("POST /api/llm/generate", () => {
  it("returns 503 not_configured when SITE_API_KEY is not set", async () => {
    const res = await api.fetch(req(jsonBody("daily-reading", goodData), "any"), {});
    expect(res.status).toBe(503);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("not_configured");
  });

  it("returns 401 unauthorized without x-api-key", async () => {
    const res = await api.fetch(req(jsonBody("daily-reading", goodData)), baseEnv);
    expect(res.status).toBe(401);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("unauthorized");
  });

  it("returns 401 unauthorized with wrong key", async () => {
    const res = await api.fetch(req(jsonBody("daily-reading", goodData), "wrong"), baseEnv);
    expect(res.status).toBe(401);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("unauthorized");
  });

  it("returns 400 invalid_json on malformed body", async () => {
    const res = await api.fetch(req("{not json", "test-key"), baseEnv);
    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("invalid_json");
  });

  it("returns 413 payload_too_large over 64KB", async () => {
    // 体积检查在 JSON.parse 之前，body 无效也没关系
    const big = '{"type":"daily-reading","data":"' + " ".repeat(66_000) + '"}';
    const res = await api.fetch(req(big, "test-key"), baseEnv);
    expect(res.status).toBe(413);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("payload_too_large");
  });

  it("returns 400 invalid_request on unknown type", async () => {
    const res = await api.fetch(req(jsonBody("yearly-summary", goodData), "test-key"), baseEnv);
    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("invalid_request");
    expect(json.error?.message).toContain("Unknown type");
  });

  it("returns 400 invalid_request when data fails validation", async () => {
    const res = await api.fetch(
      req(jsonBody("daily-reading", { lang: "zh", date: "2026-08-17" }), "test-key"),
      baseEnv,
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("invalid_request");
  });

  it("returns generated markdown echoing type and lang", async () => {
    stubLlm("### 今日导引\n\n癸亥日宜祭祀。");
    const res = await api.fetch(req(jsonBody("daily-reading", goodData), "test-key"), baseEnv);
    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiJson;
    expect(json.ok).toBe(true);
    expect(json.data?.type).toBe("daily-reading");
    expect(json.data?.lang).toBe("zh");
    expect(json.data?.markdown).toContain("癸亥日宜祭祀");
  });

  it("returns 500 not_configured when LLM env is missing", async () => {
    const env: TestEnv = { SITE_API_KEY: "test-key" };
    const res = await api.fetch(req(jsonBody("daily-reading", goodData), "test-key"), env);
    expect(res.status).toBe(500);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("not_configured");
  });

  it("returns 502 upstream_error when LLM replies 500", async () => {
    stubLlm("unused", 500);
    const res = await api.fetch(req(jsonBody("daily-reading", goodData), "test-key"), baseEnv);
    expect(res.status).toBe(502);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("upstream_error");
  });
});
```

- [ ] **Step 2: 跑测试确认 RED**

Run: `npx vitest run test/llmgen-api.test.ts`
Expected: FAIL —— 全部 10 用例失败：路由未注册，请求落 `api.all("*")` 兜底，收到 404 `{ code: "not_found" }` 而非各用例预期的状态码（LLM stub 用例还会因 interceptor 未被消费而报 pending）。

- [ ] **Step 3: 实现**

创建 `src/routes/llmgen.ts`：

```ts
import type { Hono } from "hono";
import { authProblem, type SiteAuthEnv } from "../auth";
import { callLlm, type LlmEnv } from "../llm";
import type { Lang } from "../config/site";
import { GENERATORS } from "../llmgen/registry";
import { recordApiCall, type StatsEnv } from "../stats";

const MAX_BODY_BYTES = 64 * 1024;

function err(code: string, message: string) {
  return { ok: false as const, error: { code, message } };
}

/** 注册自用内容生成路由（在 api 子应用内，basePath 已是 /api） */
export function registerLlmgenRoutes(api: Hono<{ Bindings: SiteAuthEnv & LlmEnv & StatsEnv }>): void {
  api.post("/llm/generate", async (c) => {
    // 0. 记录 API 调用（异步，不阻塞主流程）
    const db = c.env?.STATS_DB;
    if (db) {
      recordApiCall(db, "/api/llm/generate").catch(() => {});
    }

    // 1. 鉴权（自用端点：SITE_API_KEY + x-api-key；未配置 → 503 优先于 401）
    const denied = authProblem(c.env, c.req.header("x-api-key"));
    if (denied) return c.json(err(denied.code, denied.message), denied.status);

    // 2. 体积上限（先读 text 再 parse，避免超大 body 进 JSON 解析）
    const raw = await c.req.text();
    if (raw.length > MAX_BODY_BYTES) return c.json(err("payload_too_large", "Request body too large."), 413);

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return c.json(err("invalid_json", "Request body must be valid JSON."), 400);
    }

    // 3. type 查表（回显 type 一律截断）
    const b = (body ?? {}) as { type?: unknown; data?: unknown };
    if (typeof b.type !== "string" || !(b.type in GENERATORS)) {
      return c.json(
        err(
          "invalid_request",
          `Unknown type: ${String(b.type).slice(0, 64)}. Must be one of: ${Object.keys(GENERATORS).join(", ")}.`,
        ),
        400,
      );
    }
    const gen = GENERATORS[b.type as keyof typeof GENERATORS];

    // 4. data 浅校验（错误消息是字段名描述，不回显用户输入值）
    const v = gen.validate(b.data);
    if (!v.ok) return c.json(err("invalid_request", v.message), 400);

    // 5. 组提示词 → 调 LLM（user 只在 validate 通过后调用，断言安全）
    const lang = (v.value as { lang: Lang }).lang;
    const r = await callLlm(c.env ?? {}, gen.system(lang), gen.user(v.value));
    if (!r.ok) {
      const messages: Record<typeof r.code, string> = {
        not_configured: "Service is not configured.",
        upstream_error: "Service returned an error, please retry.",
        upstream_timeout: "Service timed out, please retry.",
      };
      return c.json(err(r.code, messages[r.code]), r.status);
    }
    return c.json({ ok: true, data: { type: b.type, lang, markdown: r.content } });
  });
}
```

`src/routes/api.ts` 四处小改（注意 Task 1 已把 `AlmanacEnv` 换成 `SiteAuthEnv`，在此基础上）：

```ts
// 1) register import 区（registerHehunRoutes 之后加）：
import { registerLlmgenRoutes } from "./llmgen";

// 2) type import 区（import type { StatsEnv } 之前加）：
import type { LlmEnv } from "../llm";

// 3) Bindings 联合（SiteAuthEnv 之后插 LlmEnv）：
export const api = new Hono<{ Bindings: BaziEnv & LiuyaoEnv & MeihuaEnv & XiaoliurenEnv & ZejiEnv & ZiweiEnv & HehunEnv & SiteAuthEnv & LlmEnv & StatsEnv }>().basePath("/api");

// 4) 挂载（registerAlmanacRoutes(api); 之后、api.all("*") 兜底之前）：
registerLlmgenRoutes(api);
```

- [ ] **Step 4: 跑测试确认 GREEN**

Run: `npx vitest run test/llmgen-api.test.ts`
Expected: PASS（10 用例全绿）。

再跑 `npm run typecheck`（Expected: 零错误）与 `npx vitest run test/almanac-api.test.ts test/bazi-api.test.ts`（Expected: PASS——确认 api.ts Bindings 改动对既有端点无副作用）。

- [ ] **Step 5: Commit**

```bash
git add src/routes/llmgen.ts src/routes/api.ts test/llmgen-api.test.ts
git commit -m "feat: add POST /api/llm/generate type-driven content endpoint"
```

---

### Task 5: 端到端冒烟、文档同步、部署清单

**Files:**
- Create: `tmp/smoke-llmgen.mjs`（`tmp/` 已被 .gitignore 忽略，不入库，仅供本任务验证）
- Modify: `AGENTS.md`（三处：鉴权段 / 目录结构 src 树 / 目录结构 routes 树）
- Modify: `README.md`（两处：鉴权段 / API 段）

**Interfaces:**
- Consumes: 前序全部任务的成品——本地 dev 服务器（`npm run dev` → http://localhost:8787，`.dev.vars` 已有 `SITE_API_KEY=dev-local-key` 与真实 `LLM_API_KEY`）、`GET /api/almanac|fortune/week|fortune/month`（query 参数名：`date` / `monday` / `month`）、`POST /api/llm/generate`。
- Produces: 无代码接口；产出为冒烟验证记录、文档更新、以及 Step 5 转达给用户的部署清单（照抄原文，不改顺序）。

- [ ] **Step 1: 全量回归**

Run: `npm run typecheck`
Expected: 零错误。

Run: `npm test`
Expected: 全绿（miniflare EBUSY 警告为无害噪音；若遇 workerd 模块 RPC 环境性失败，单文件复跑判别）。

- [ ] **Step 2: 本地真实 LLM 冒烟**

后台启动 dev 服务器：`npm run dev`（is_background，等 http://localhost:8787 就绪）。

创建 `tmp/smoke-llmgen.mjs`：

```js
// 冒烟：鉴权/校验错误路径 + 三个栏目真实生成（data 先取自历法 API，模拟未来 crontab shell 脚本的用法）
const BASE = "http://localhost:8787";
const KEY = "dev-local-key";

async function call(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "x-api-key": KEY, "content-type": "application/json", ...(init.headers ?? {}) },
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

function check(name, cond, detail) {
  if (!cond) {
    console.error(`FAIL ${name}: ${detail}`);
    process.exit(1);
  }
  console.log(`PASS ${name}`);
}

// 1) 鉴权：无 key → 401
{
  const res = await fetch(`${BASE}/api/llm/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: '{"type":"daily-reading"}',
  });
  const json = await res.json();
  check("401 without key", res.status === 401 && json.error?.code === "unauthorized", `status=${res.status}`);
}

// 2) 未知 type → 400
{
  const r = await call("/api/llm/generate", { method: "POST", body: JSON.stringify({ type: "yearly-summary", data: {} }) });
  check("400 unknown type", r.status === 400 && r.json?.error?.code === "invalid_request", JSON.stringify(r.json));
}

// 3) data 校验失败 → 400
{
  const r = await call("/api/llm/generate", {
    method: "POST",
    body: JSON.stringify({ type: "daily-zodiac", data: { lang: "zh", date: "bad" } }),
  });
  check("400 invalid data", r.status === 400 && r.json?.error?.code === "invalid_request", JSON.stringify(r.json));
}

// 4) 真实生成三段：data 先取自历法 API（模拟 shell 脚本：先 GET 数据、再 POST 生成）
const almanac = (await call("/api/almanac?date=2026-08-17")).json?.data;
const week = (await call("/api/fortune/week?monday=2026-08-17")).json?.data;
const month = (await call("/api/fortune/month?month=2026-08")).json?.data;
check("almanac data fetched", almanac?.dayGanZhi === "癸亥", JSON.stringify(almanac)?.slice(0, 120));

const jobs = [
  { type: "daily-zodiac", data: { lang: "zh", date: "2026-08-17", almanac } },
  { type: "weekly-summary", data: { lang: "zh", monday: "2026-08-17", week } },
  { type: "monthly-lucky", data: { lang: "en", month: "2026-08", skeleton: month } },
];
for (const j of jobs) {
  const r = await call("/api/llm/generate", { method: "POST", body: JSON.stringify(j) });
  check(
    `200 ${j.type}`,
    r.status === 200 && r.json?.ok === true && r.json?.data?.type === j.type && typeof r.json?.data?.markdown === "string" && r.json.data.markdown.length > 100,
    JSON.stringify(r.json).slice(0, 300),
  );
  const md = r.json.data.markdown;
  check(
    `${j.type} no AI wording`,
    !/人工智能|artificial intelligence|language model|语言模型/i.test(md),
    md.slice(0, 160),
  );
  console.log(`--- ${j.type} (${j.data.lang}) 前 160 字 ---\n${md.slice(0, 160)}\n`);
}

console.log("SMOKE OK");
```

Run: `node tmp/smoke-llmgen.mjs`
Expected: 全部 PASS + `SMOKE OK`。共 3 次真实 LLM 调用，总耗时可能 1–2 分钟；若 LLM 网络超时属环境问题，重跑一次，连续失败才排查。

冒烟结束后停掉 dev 服务器，再补跑 `npx vitest run test/llmgen-api.test.ts`（Expected: PASS——确认无残留影响）。

- [ ] **Step 3: 文档同步**

`AGENTS.md` 三处：

```markdown
<!-- 1) 「常用命令」下方的鉴权段，整行替换： -->
旧：历法数据 API（/api/almanac 等）用 x-api-key 鉴权：本地 .dev.vars 配 ALMANAC_API_KEY，生产 wrangler secret put ALMANAC_API_KEY（未配置时端点 503）。
新：自用 API（历法数据 GET /api/almanac、/api/fortune/week、/api/fortune/month 与内容生成 POST /api/llm/generate）统一用 x-api-key 鉴权：本地 .dev.vars 配 SITE_API_KEY，生产 wrangler secret put SITE_API_KEY（未配置时端点 503）。

<!-- 2) 目录结构 src/ 树：llm.ts 行后插入两行： -->
  auth.ts             自用 API 共享鉴权：authProblem（SITE_API_KEY 未配置 503 / 不匹配 401）
  llmgen/             自用内容生成模块：types（GenType/GeneratorDef/AnyGenerator/makeGenerator）、prompt-common（公共规则+文案红线防线句）、registry（GENERATORS 9 类型注册表）、daily/weekly/monthly（各 3 条目：validate + system(lang) + user(data)，零算法零重算）

<!-- 3) 目录结构 routes/ 树：routes/almanac.ts 行后插入一行： -->
  routes/llmgen.ts   POST /api/llm/generate：鉴权（SITE_API_KEY）→ 64KB 上限 → type 查表（GENERATORS）→ 浅校验 → callLlm → Markdown 返回（自用，无限流；type 清单见 src/llmgen/registry.ts）
```

`README.md` 两处：

```markdown
<!-- 1) 「快速开始」鉴权段，整行替换： -->
旧：历法数据 API（`/api/almanac` 等）使用 `x-api-key` 鉴权：本地 `.dev.vars` 配 `ALMANAC_API_KEY`，生产 `wrangler secret put ALMANAC_API_KEY`（未配置时返回 503）。
新：自用 API（历法数据 `GET /api/almanac` 等 3 条与内容生成 `POST /api/llm/generate`）统一使用 `x-api-key` 鉴权：本地 `.dev.vars` 配 `SITE_API_KEY`，生产 `wrangler secret put SITE_API_KEY`（未配置时返回 503）。

<!-- 2) 「## API」段句尾追加（“后续 LLM 接口按同模式新增。”之后）： -->
自用生成端点：`POST /api/llm/generate`（`{ type, data }` 进、`{ type, lang, markdown }` 出；9 个类型：daily-reading / daily-zodiac / daily-story / weekly-summary / weekly-zodiac / weekly-days / monthly-summary / monthly-zodiac / monthly-lucky，见 `src/llmgen/registry.ts`；`x-api-key` 鉴权 + `SITE_API_KEY` secret，无限流；供未来 crontab 脚本生成运势内容）。
```

同时检查两份文档中不再有 `ALMANAC_API_KEY` 残留（Grep 确认，命中 0 处）。

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md README.md
git commit -m "docs: document SITE_API_KEY and /api/llm/generate"
```

（`tmp/smoke-llmgen.mjs` 在 .gitignore 的 `tmp/` 下，不 add。）

- [ ] **Step 5: 向用户转达部署清单（照抄原文，顺序不可换）**

> **部署清单（Global Constraints 红线：必须按顺序）：**
>
> 1. **先配 secret**：`npx wrangler secret put SITE_API_KEY`（值可用线上现有 key `ACAKA3DSC7g34pOkc9UyJVynVp9Xy84`；此时新旧两个 secret 并存，almanac 端点仍读旧名不受影响）。
> 2. **再 push 代码**：push 到 GitHub `main` → Cloudflare Workers Builds 自动部署。若先 push 后配 secret，almanac 3 端点 + generate 端点将全部 503。
> 3. **线上冒烟**：
>    `curl.exe -s -X POST -H "x-api-key: <SITE_API_KEY>" -H "content-type: application/json" -d "{\"type\":\"daily-reading\",\"data\":{\"lang\":\"zh\",\"date\":\"2026-08-17\",\"almanac\":<almanac-data>}}" https://suanming-zhanbu.com/api/llm/generate`（`<almanac-data>` 先从 `GET /api/almanac?date=2026-08-17` 取）。
> 4. **验证通过后可选清理**：`npx wrangler secret delete ALMANAC_API_KEY`（旧名已无代码引用）。

---

## 完成定义

- `npm test` + `npm run typecheck` 全绿；新增 3 个测试文件（llmgen-prompt / llmgen-api / almanac-api 回归）全过。
- `POST /api/llm/generate` 9 类型可用，本地真实 LLM 冒烟通过（含文案红线检查）。
- 自用端点鉴权统一为 `SITE_API_KEY`，`ALMANAC_API_KEY` 在代码与文档中零残留。
- AGENTS.md / README.md 已同步；部署清单已转达用户。

---
