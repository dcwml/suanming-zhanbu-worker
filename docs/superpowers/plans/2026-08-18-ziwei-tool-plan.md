# 紫微斗数工具 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增紫微斗数工具页（前端 iztro 排盘 + 三段式 AI 解读），并把导航「八字排盘」平铺链接改为「命理」下拉（纯按钮无链接，子项：八字排盘 / 紫微斗数）。

**Architecture:** 完全复用既有工具模块模式：`src/ziwei/`（types/validate/prompt/llm）+ `src/routes/ziwei.ts` + 前端 `public/assets/ziwei.js`。排盘由前端 iztro v2.6.0 完成（unpkg → jsdelivr → 本地 vendor 三级加载链），精简盘（约 2.8KB）作为 payload 走 `POST /api/ziwei/interpret`，经既有 `callLlm` + RateLimiter + 统一错误码管线做三段串行解读（命盘/大限/流年）。页面注册走固定页面两步流程，SEO 自动派生。

**Tech Stack:** Cloudflare Workers + Hono + TypeScript（SSR）、vitest-pool-workers、iztro 2.6.0（UMD，锁版本）、原生 JS 前端（marked + DOMPurify 渲染 Markdown）。

## Global Constraints

- 设计依据：`docs/superpowers/specs/2026-08-18-ziwei-tool-design.md`（已获批）。iztro 字段名均已实测（探针见该文档 1.1 节），不要凭文档猜测改字段名。
- 双语对称：任何页面/文案改动必须同时覆盖 zh 与 en。
- API 形状：`{ ok: true, data }` / `{ ok: false, error: { code, message } }`；错误码固定为 `invalid_request / payload_too_large / invalid_json / rate_limited / not_configured / upstream_error / upstream_timeout`；错误消息不回显用户输入值；body 上限 8KB。
- payload 一律中文规范名（星名/宫名/亮度/四化）；校验只查形状与枚举。
- 转义纪律：HTML 属性/文本过 `escapeHtml`；前端拼 HTML 过 `esc()`。
- iztro 版本锁死 2.6.0，三个加载源版本号一致；本地兜底文件 `public/assets/vendor/iztro.min.js` 随仓库提交。
- 前端排盘逻辑不做单测（与 liuyao/meihua/xiaoliuren 现状一致，Workers vitest 池不跑浏览器 JS）。
- 每个任务提交前必须通过 `npm test` + `npm run typecheck`。Windows 环境：Bash 工具实际是 bash（非 cmd），但 PowerShell 用 `;` 不用 `&&`；测试结束时 miniflare EBUSY 警告是无害噪音。
- 提交信息风格沿用现有 `feat:` / `docs:` 前缀（看 `git log --oneline -5` 对齐）。

---

## File Structure

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/ziwei/types.ts` | 新建 | Part / ZiweiChart / PalaceInfo / ScopeInfo / InterpretRequest / ZiweiEnv |
| `src/ziwei/validate.ts` | 新建 | 请求体形状与枚举校验 |
| `src/ziwei/prompt.ts` | 新建 | system/user 提示词构建（en 内附中英星名对照） |
| `src/ziwei/llm.ts` | 新建 | 从 `../llm` 再导出 callLlm（同 bazi/llm.ts） |
| `src/routes/ziwei.ts` | 新建 | POST /api/ziwei/interpret |
| `src/routes/api.ts` | 修改 | Bindings 并入 ZiweiEnv + 注册路由 |
| `wrangler.jsonc` | 修改 | ratelimits 追加 ZIWEI_RATE_LIMITER（namespace 1006） |
| `test/fixtures/ziwei-request.ts` | 新建 | iztro 实测产物夹具（1990-08-15 午时女） |
| `test/ziwei-validate.test.ts` | 新建 | 校验单测 |
| `test/ziwei-prompt.test.ts` | 新建 | 提示词单测 |
| `test/ziwei-api.test.ts` | 新建 | 路由单测（fetchMock） |
| `test/registry.test.ts` | 修改 | ziwei faq 对称 + bazi/ziwei inNav=false |
| `test/integration.test.ts` | 修改 | 「mingli nav dropdown」+「ziwei page」断言 |
| `src/content/ziwei.zh.html` / `.en.html` | 新建 | 页面正文片段（表单/结果区/解读区/FAQ/script 标签） |
| `src/pages/registry.ts` | 修改 | bazi inNav:false；ziwei PageEntry（含 faq） |
| `src/layout/nav.ts` | 修改 | MINGLI_NAV_LABEL/ITEMS + renderNav 插入按钮式下拉 |
| `src/layout/footer.ts` | 修改 | 工具列追加 ziwei |
| `public/assets/vendor/iztro.min.js` | 新建（复制） | iztro UMD 本地兜底 |
| `public/assets/ziwei.js` | 新建 | 三级加载 + 排盘 + 4×4 盘渲染 + 三段串行解读 |
| `public/assets/style.css` | 修改 | 紫微盘格/卡片样式 |
| `agents.md` / `README.md` / `docs/2026-08-17-tool-candidates-design.md` / 本 spec | 修改 | 文档同步 |

---

### Task 1: 共享类型 + 校验 + 夹具

**Files:**
- Create: `src/ziwei/types.ts`
- Create: `test/fixtures/ziwei-request.ts`
- Create: `test/ziwei-validate.test.ts`
- Create: `src/ziwei/validate.ts`

**Interfaces:**
- Consumes: `LANGS` from `src/config/site`
- Produces: `validateInterpretRequest(body: unknown): { ok: true; value: InterpretRequest } | { ok: false; message: string }`；类型 `Part = "mingpan" | "daxian" | "liunian"`、`ZiweiChart`、`ZiweiEnv`（Task 2/3 使用）；夹具 `validChart()` / `validBody(part?, lang?)`（所有后续测试使用）

- [ ] **Step 1: 写夹具 `test/fixtures/ziwei-request.ts`**

此数据是 iztro 2.6.0 对 1990-08-15 午时（timeIndex 6）女命的真实排盘产物（探针生成，勿手改数值）：

```ts
import type { ZiweiChart } from "../../src/ziwei/types";

/** 合法的紫微排盘夹具（1990-08-15 午时 女，iztro 2.6.0 实测产物）。每次调用返回全新对象，测试可安全修改。 */
export function validChart(): ZiweiChart {
  return {
    gender: "female",
    solar: "1990-08-15",
    lunar: "一九九〇年六月廿五",
    time: "午时",
    zodiac: "马",
    soul: "巨门",
    body: "火星",
    fiveElementsClass: "火六局",
    palaces: [
      { name: "父母", branch: "寅", isBody: false, majors: [], minors: [] },
      { name: "福德", branch: "卯", isBody: false, majors: [{ name: "天府", brightness: "得", mutagen: "" }], minors: [] },
      { name: "田宅", branch: "辰", isBody: false, majors: [{ name: "太阴", brightness: "陷", mutagen: "科" }], minors: [{ name: "文昌", kind: "吉", mutagen: "" }] },
      { name: "官禄", branch: "巳", isBody: false, majors: [{ name: "廉贞", brightness: "陷", mutagen: "" }, { name: "贪狼", brightness: "陷", mutagen: "" }], minors: [{ name: "右弼", kind: "吉", mutagen: "" }, { name: "地空", kind: "煞", mutagen: "" }, { name: "地劫", kind: "煞", mutagen: "" }] },
      { name: "仆役", branch: "午", isBody: false, majors: [{ name: "巨门", brightness: "旺", mutagen: "" }], minors: [] },
      { name: "迁移", branch: "未", isBody: false, majors: [{ name: "天相", brightness: "得", mutagen: "" }], minors: [{ name: "天钺", kind: "吉", mutagen: "" }, { name: "火星", kind: "煞", mutagen: "" }, { name: "陀罗", kind: "煞", mutagen: "" }] },
      { name: "疾厄", branch: "申", isBody: false, majors: [{ name: "天同", brightness: "旺", mutagen: "忌" }, { name: "天梁", brightness: "陷", mutagen: "" }], minors: [{ name: "禄存", kind: "禄", mutagen: "" }, { name: "天马", kind: "马", mutagen: "" }] },
      { name: "财帛", branch: "酉", isBody: false, majors: [{ name: "武曲", brightness: "利", mutagen: "权" }, { name: "七杀", brightness: "庙", mutagen: "" }], minors: [{ name: "左辅", kind: "吉", mutagen: "" }, { name: "铃星", kind: "煞", mutagen: "" }, { name: "擎羊", kind: "煞", mutagen: "" }] },
      { name: "子女", branch: "戌", isBody: false, majors: [{ name: "太阳", brightness: "不", mutagen: "禄" }], minors: [{ name: "文曲", kind: "吉", mutagen: "" }] },
      { name: "夫妻", branch: "亥", isBody: false, majors: [], minors: [] },
      { name: "兄弟", branch: "子", isBody: false, majors: [{ name: "天机", brightness: "庙", mutagen: "" }], minors: [] },
      { name: "命宫", branch: "丑", isBody: true, majors: [{ name: "紫微", brightness: "庙", mutagen: "" }, { name: "破军", brightness: "旺", mutagen: "" }], minors: [{ name: "天魁", kind: "吉", mutagen: "" }] },
    ],
    decadal: {
      ganZhi: "丙戌",
      ageRange: "36-45",
      palaceNames: ["官禄", "仆役", "迁移", "疾厄", "财帛", "子女", "夫妻", "兄弟", "命宫", "父母", "福德", "田宅"],
      mutagen: ["天同", "天机", "文昌", "廉贞"],
    },
    yearly: {
      year: 2026,
      ganZhi: "丙午",
      palaceNames: ["财帛", "子女", "夫妻", "兄弟", "命宫", "父母", "福德", "田宅", "官禄", "仆役", "迁移", "疾厄"],
      mutagen: ["天同", "天机", "文昌", "廉贞"],
    },
  };
}

/** 组装完整请求体 */
export function validBody(part = "mingpan", lang = "zh"): { part: string; lang: string; chart: ZiweiChart } {
  return { part, lang, chart: validChart() };
}
```

- [ ] **Step 2: 写失败测试 `test/ziwei-validate.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { validateInterpretRequest } from "../src/ziwei/validate";
import { validBody } from "./fixtures/ziwei-request";

describe("validateInterpretRequest", () => {
  it("accepts a valid request", () => {
    expect(validateInterpretRequest(validBody()).ok).toBe(true);
  });

  it("accepts all three parts", () => {
    for (const part of ["mingpan", "daxian", "liunian"]) {
      expect(validateInterpretRequest(validBody(part)).ok).toBe(true);
    }
  });

  it("rejects non-object body", () => {
    expect(validateInterpretRequest("nope").ok).toBe(false);
    expect(validateInterpretRequest(null).ok).toBe(false);
  });

  it("rejects unknown part", () => {
    expect(validateInterpretRequest(validBody("tarot")).ok).toBe(false);
  });

  it("rejects unknown lang", () => {
    expect(validateInterpretRequest(validBody("mingpan", "fr")).ok).toBe(false);
  });

  it("rejects invalid gender", () => {
    const body = validBody();
    (body.chart as { gender: string }).gender = "other";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects malformed solar", () => {
    const body = validBody();
    body.chart.solar = "1990/08/15";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects palaces not of length 12", () => {
    const body = validBody();
    body.chart.palaces.pop();
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects unknown palace name", () => {
    const body = validBody();
    body.chart.palaces[5].name = "奴仆";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects invalid branch", () => {
    const body = validBody();
    body.chart.palaces[0].branch = "猫";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects invalid mutagen", () => {
    const body = validBody();
    body.chart.palaces[7].majors[0].mutagen = "喜";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects unknown minor kind", () => {
    const body = validBody();
    (body.chart.palaces[6].minors[0] as { kind: string }).kind = "凶";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects majors longer than 3", () => {
    const body = validBody();
    const m = { name: "紫微", brightness: "庙", mutagen: "" };
    body.chart.palaces[11].majors = [m, m, m, m];
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects missing decadal ageRange", () => {
    const body = validBody();
    delete body.chart.decadal.ageRange;
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects malformed decadal ageRange", () => {
    const body = validBody();
    body.chart.decadal.ageRange = "36~45";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects decadal palaceNames not 12", () => {
    const body = validBody();
    body.chart.decadal.palaceNames = body.chart.decadal.palaceNames.slice(0, 11);
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects scope mutagen not 4", () => {
    const body = validBody();
    body.chart.yearly.mutagen = ["天同", "天机", "文昌"];
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects yearly year out of range", () => {
    const body = validBody();
    body.chart.yearly.year = 1800;
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects overlong string field", () => {
    const body = validBody();
    body.chart.lunar = "月".repeat(61);
    expect(validateInterpretRequest(body).ok).toBe(false);
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npx vitest run ziwei-validate`
Expected: FAIL —— 无法解析 `../src/ziwei/validate` 与 `../src/ziwei/types`（模块不存在）。

- [ ] **Step 4: 实现 `src/ziwei/types.ts`**

```ts
import type { Lang } from "../config/site";
import type { LlmEnv, RateLimiter } from "../llm";

export type { RateLimiter } from "../llm";

export type Part = "mingpan" | "daxian" | "liunian";

export interface MajorStar {
  name: string;
  /** 亮度：庙/旺/得/利/平/不/陷 */
  brightness: string;
  /** 四化单字（禄/权/科/忌）或空串 */
  mutagen: string;
}

export interface MinorStar {
  name: string;
  /** 吉=六吉、煞=六煞、禄=禄存、马=天马 */
  kind: "吉" | "煞" | "禄" | "马";
  mutagen: string;
}

export interface PalaceInfo {
  /** 宫名：命宫/兄弟/夫妻/子女/财帛/疾厄/迁移/仆役/官禄/田宅/福德/父母 */
  name: string;
  /** 地支 */
  branch: string;
  /** 是否身宫 */
  isBody: boolean;
  majors: MajorStar[];
  minors: MinorStar[];
}

export interface ScopeInfo {
  /** 干支 */
  ganZhi: string;
  /** 大限年龄区间，如 "36-45"（仅 decadal 有） */
  ageRange?: string;
  /** 该限/年十二宫名 */
  palaceNames: string[];
  /** 四化对应星名 [禄, 权, 科, 忌] */
  mutagen: string[];
}

export interface YearlyInfo extends ScopeInfo {
  year: number;
}

export interface ZiweiChart {
  gender: "male" | "female";
  /** YYYY-MM-DD */
  solar: string;
  lunar: string;
  /** 时辰，如 "午时" */
  time: string;
  /** 生肖，如 "马" */
  zodiac: string;
  /** 命主 */
  soul: string;
  /** 身主 */
  body: string;
  /** 五行局，如 "火六局" */
  fiveElementsClass: string;
  /** 固定 12 项 */
  palaces: PalaceInfo[];
  /** 当前大限 */
  decadal: ScopeInfo;
  /** 当前流年 */
  yearly: YearlyInfo;
}

export interface InterpretRequest {
  part: Part;
  lang: Lang;
  chart: ZiweiChart;
}

export interface ZiweiEnv extends LlmEnv {
  ZIWEI_RATE_LIMITER?: RateLimiter;
}
```

- [ ] **Step 5: 实现 `src/ziwei/validate.ts`**

```ts
import { LANGS } from "../config/site";
import type { InterpretRequest, Part } from "./types";

const PARTS: readonly Part[] = ["mingpan", "daxian", "liunian"];
const GANS = "甲乙丙丁戊己庚辛壬癸";
const ZHIS = "子丑寅卯辰巳午未申酉戌亥";

/** 六十甲子集合（顺序生成，天然排除 甲丑 这类不合法组合） */
const JIAZI = new Set<string>();
for (let i = 0; i < 60; i++) JIAZI.add(GANS[i % 10] + ZHIS[i % 12]);

/** 十二宫规范名（iztro 默认用「仆役」而非「交友」，校验只认规范名） */
const PALACE_NAMES = new Set([
  "命宫", "兄弟", "夫妻", "子女", "财帛", "疾厄",
  "迁移", "仆役", "官禄", "田宅", "福德", "父母",
]);
const MUTAGENS = "禄权科忌";
const MINOR_KINDS = new Set(["吉", "煞", "禄", "马"]);
const MAX_STR = 60;

type Result = { ok: true; value: InterpretRequest } | { ok: false; message: string };

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isStr(v: unknown, max: number = MAX_STR): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= max;
}
function isGanZhi(v: unknown): v is string {
  return typeof v === "string" && JIAZI.has(v);
}
function isBranch(v: unknown): v is string {
  return typeof v === "string" && ZHIS.includes(v);
}
/** 四化：空串（未四化）或禄/权/科/忌单字 */
function isMutagen(v: unknown): v is string {
  return v === "" || (typeof v === "string" && v.length === 1 && MUTAGENS.includes(v));
}
function fail(message: string): Result {
  return { ok: false, message };
}

function checkPalace(v: unknown, i: number): string | null {
  if (!isObj(v)) return `palaces[${i}] must be an object`;
  if (typeof v.name !== "string" || !PALACE_NAMES.has(v.name)) return `palaces[${i}].name is unknown`;
  if (!isBranch(v.branch)) return `palaces[${i}].branch is invalid`;
  if (typeof v.isBody !== "boolean") return `palaces[${i}].isBody is invalid`;
  if (!Array.isArray(v.majors) || v.majors.length > 3) return `palaces[${i}].majors is invalid`;
  for (const m of v.majors as unknown[]) {
    if (!isObj(m) || !isStr(m.name) || !isStr(m.brightness, 4) || !isMutagen(m.mutagen))
      return `palaces[${i}].majors item is invalid`;
  }
  if (!Array.isArray(v.minors) || v.minors.length > 8) return `palaces[${i}].minors is invalid`;
  for (const m of v.minors as unknown[]) {
    if (!isObj(m) || !isStr(m.name) || typeof m.kind !== "string" || !MINOR_KINDS.has(m.kind) || !isMutagen(m.mutagen))
      return `palaces[${i}].minors item is invalid`;
  }
  return null;
}

function checkScope(v: unknown, name: string, withAgeRange: boolean): string | null {
  if (!isObj(v)) return `${name} must be an object`;
  if (!isGanZhi(v.ganZhi)) return `${name}.ganZhi is not a valid GanZhi`;
  if (withAgeRange) {
    if (typeof v.ageRange !== "string" || !/^\d{1,3}-\d{1,3}$/.test(v.ageRange))
      return `${name}.ageRange is invalid`;
  }
  if (!Array.isArray(v.palaceNames) || v.palaceNames.length !== 12)
    return `${name}.palaceNames must have 12 items`;
  for (const n of v.palaceNames as unknown[]) {
    if (typeof n !== "string" || !PALACE_NAMES.has(n)) return `${name}.palaceNames has unknown item`;
  }
  if (!Array.isArray(v.mutagen) || v.mutagen.length !== 4) return `${name}.mutagen must have 4 items`;
  for (const n of v.mutagen as unknown[]) {
    if (!isStr(n)) return `${name}.mutagen item is invalid`;
  }
  return null;
}

/** 校验请求体结构（8KB 体积上限由路由层在读 text 阶段把关，见 Task 3） */
export function validateInterpretRequest(body: unknown): Result {
  if (!isObj(body)) return fail("body must be a JSON object");
  if (typeof body.part !== "string" || !PARTS.includes(body.part as Part))
    return fail("part must be one of mingpan/daxian/liunian");
  if (typeof body.lang !== "string" || !(LANGS as readonly string[]).includes(body.lang))
    return fail("lang must be zh or en");

  const chart = body.chart;
  if (!isObj(chart)) return fail("chart must be an object");
  if (chart.gender !== "male" && chart.gender !== "female") return fail("chart.gender is invalid");
  if (typeof chart.solar !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(chart.solar))
    return fail("chart.solar must be YYYY-MM-DD");
  for (const key of ["lunar", "time", "zodiac", "soul", "body", "fiveElementsClass"] as const) {
    if (!isStr(chart[key])) return fail(`chart.${key} is invalid`);
  }

  if (!Array.isArray(chart.palaces) || chart.palaces.length !== 12)
    return fail("chart.palaces must be an array of 12 items");
  for (let i = 0; i < 12; i++) {
    const err = checkPalace(chart.palaces[i], i);
    if (err) return fail(err);
  }

  const decadalErr = checkScope(chart.decadal, "chart.decadal", true);
  if (decadalErr) return fail(decadalErr);

  const yearlyErr = checkScope(chart.yearly, "chart.yearly", false);
  if (yearlyErr) return fail(yearlyErr);
  const yearlyYear = (chart.yearly as Record<string, unknown>).year;
  if (typeof yearlyYear !== "number" || !Number.isFinite(yearlyYear) || yearlyYear < 1900 || yearlyYear > 2200)
    return fail("chart.yearly.year is invalid");

  return { ok: true, value: body as unknown as InterpretRequest };
}
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npx vitest run ziwei-validate`
Expected: PASS（19 个用例全绿）。

- [ ] **Step 7: typecheck**

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 8: Commit**

```bash
git add src/ziwei/types.ts src/ziwei/validate.ts test/fixtures/ziwei-request.ts test/ziwei-validate.test.ts
git commit -m "feat(ziwei): add request types and validation"
```

---

### Task 2: 提示词构建

**Files:**
- Create: `src/ziwei/llm.ts`
- Create: `src/ziwei/prompt.ts`
- Create: `test/ziwei-prompt.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `Part / ZiweiChart / ScopeInfo / YearlyInfo / PalaceInfo` 类型与 `validChart()` 夹具
- Produces: `buildSystemPrompt(lang: Lang): string`、`buildUserPrompt(part: Part, lang: Lang, chart: ZiweiChart): string`（Task 3 路由使用）；`src/ziwei/llm.ts` 再导出 `callLlm`（Task 3 使用）

- [ ] **Step 1: 写失败测试 `test/ziwei-prompt.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "../src/ziwei/prompt";
import { validChart } from "./fixtures/ziwei-request";

describe("buildSystemPrompt", () => {
  it("zh prompt asks for Markdown output in Chinese", () => {
    const s = buildSystemPrompt("zh");
    expect(s).toContain("Markdown");
    expect(s).toContain("中文");
  });

  it("en prompt asks for English output with star glossary", () => {
    const s = buildSystemPrompt("en");
    expect(s).toContain("Markdown");
    expect(s).toContain("English");
    expect(s).toContain("紫微 Zi Wei");
    expect(s).toContain("命宫");
  });
});

describe("buildUserPrompt", () => {
  const chart = validChart();

  it("mingpan part lists palaces with brightness and mutagen", () => {
    const p = buildUserPrompt("mingpan", "zh", chart);
    expect(p).toContain("命宫（丑·身宫）");
    expect(p).toContain("紫微(庙");
    expect(p).toContain("破军(旺");
    expect(p).toContain("太阴(陷·科)");
    expect(p).toContain("辅星 天魁");
    expect(p).toContain("无主星");
  });

  it("mingpan part does not include decadal or yearly blocks", () => {
    const p = buildUserPrompt("mingpan", "zh", chart);
    expect(p).not.toContain("当前大限");
    expect(p).not.toContain("今年流年");
  });

  it("daxian part includes decadal block but not yearly", () => {
    const p = buildUserPrompt("daxian", "zh", chart);
    expect(p).toContain("当前大限：丙戌（36-45 岁）");
    expect(p).toContain("天同禄");
    expect(p).toContain("廉贞忌");
    expect(p).not.toContain("今年流年");
  });

  it("liunian part includes decadal and yearly blocks", () => {
    const p = buildUserPrompt("liunian", "zh", chart);
    expect(p).toContain("当前大限：丙戌");
    expect(p).toContain("今年流年：2026 年 丙午");
  });

  it("en prompt keeps chinese star terms and word target", () => {
    const p = buildUserPrompt("mingpan", "en", chart);
    expect(p).toContain("紫微");
    expect(p).toContain("About 400 words");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run ziwei-prompt`
Expected: FAIL —— 无法解析 `../src/ziwei/prompt`。

- [ ] **Step 3: 实现 `src/ziwei/llm.ts`**

```ts
export { callLlm } from "../llm";
export type { LlmResult } from "../llm";
```

- [ ] **Step 4: 实现 `src/ziwei/prompt.ts`**

```ts
import type { Lang } from "../config/site";
import type { PalaceInfo, Part, ScopeInfo, YearlyInfo, ZiweiChart } from "./types";

/** 十四主星与关键辅星中英对照（仅 en system prompt 使用） */
const STAR_GLOSSARY = [
  "紫微 Zi Wei (Emperor)", "天机 Tian Ji (Advisor)", "太阳 Tai Yang (Sun)", "武曲 Wu Qu (Finance)",
  "天同 Tian Tong (Harmony)", "廉贞 Lian Zhen (Integrity)", "天府 Tian Fu (Treasury)", "太阴 Tai Yin (Moon)",
  "贪狼 Tan Lang (Desire)", "巨门 Ju Men (Gate)", "天相 Tian Xiang (Minister)", "天梁 Tian Liang (Sage)",
  "七杀 Qi Sha (General)", "破军 Po Jun (Pioneer)",
  "左辅 Zuo Fu", "右弼 You Bi", "文昌 Wen Chang", "文曲 Wen Qu", "天魁 Tian Kui", "天钺 Tian Yue",
  "禄存 Lu Cun", "天马 Tian Ma", "擎羊 Qing Yang", "陀罗 Tuo Luo", "火星 Huo Xing", "铃星 Ling Xing",
  "地空 Di Kong", "地劫 Di Jie",
].join(", ");

const PALACE_GLOSSARY =
  "命宫 Life, 兄弟 Siblings, 夫妻 Marriage, 子女 Children, 财帛 Wealth, 疾厄 Health, " +
  "迁移 Travel, 仆役 Friends, 官禄 Career, 田宅 Property, 福德 Spirit, 父母 Parents";

export function buildSystemPrompt(lang: Lang): string {
  if (lang === "zh") {
    return [
      "你是一位精通紫微斗数的资深命理师，熟悉十四主星安星、宫位三方四正、四化飞星与大限流年推演。",
      "规则：",
      "1. 只基于用户提供的命盘数据分析，不要重新排盘、不要质疑数据。",
      "2. 用 Markdown 输出（可用二三级标题、列表、粗体），不要输出代码块。",
      "3. 语气客观温和，多讲趋势与建议，避免绝对化断言。",
      "4. 不提供医疗、法律、投资等专业建议；涉及健康财务话题只做泛化提醒。",
      "5. 全文使用中文。",
    ].join("\n");
  }
  return [
    "You are a seasoned Zi Wei Dou Shu (Purple Star Astrology) master, fluent in star placement, palace trines, the four transformations and decade/yearly luck analysis.",
    "Rules:",
    "1. Analyse only the chart data provided by the user; never recalculate or question it.",
    "2. Output Markdown (h2/h3 headings, lists, bold), no code blocks.",
    "3. Keep an objective, gentle tone; describe tendencies and advice, avoid absolute claims.",
    "4. No medical, legal or investment advice; only general reminders on such topics.",
    "5. Respond entirely in English. Keep star and palace names in Chinese characters followed by a short English gloss on first mention.",
    `Star glossary: ${STAR_GLOSSARY}.`,
    `Palace glossary: ${PALACE_GLOSSARY}.`,
  ].join("\n");
}

/** 单宫一行：命宫（丑·身宫）：紫微(庙)、破军(旺)；辅星 天魁 */
function palaceLine(p: PalaceInfo): string {
  const bodyMark = p.isBody ? "·身宫" : "";
  const majors =
    p.majors
      .map((m) => `${m.name}(${m.brightness}${m.mutagen ? "·" + m.mutagen : ""})`)
      .join("、") || "无主星";
  const minors = p.minors.map((m) => m.name + (m.mutagen ? "·" + m.mutagen : "")).join("、");
  return `${p.name}（${p.branch}${bodyMark}）：${majors}${minors ? "；辅星 " + minors : ""}`;
}

/** 四化 [禄,权,科,忌] 星名数组 → "天同禄、天机权、文昌科、廉贞忌" */
function mutagenText(m: string[]): string {
  return `${m[0]}禄、${m[1]}权、${m[2]}科、${m[3]}忌`;
}

function chartText(chart: ZiweiChart): string {
  return [
    `性别：${chart.gender === "male" ? "男" : "女"}`,
    `出生公历：${chart.solar}`,
    `出生农历：${chart.lunar}`,
    `出生时辰：${chart.time}`,
    `生肖：${chart.zodiac}`,
    `命主：${chart.soul}；身主：${chart.body}`,
    `五行局：${chart.fiveElementsClass}`,
    "十二宫星曜：",
    ...chart.palaces.map(palaceLine),
  ].join("\n");
}

function decadalText(d: ScopeInfo): string {
  return [
    `当前大限：${d.ganZhi}（${d.ageRange} 岁）`,
    `大限十二宫：${d.palaceNames.join("、")}`,
    `大限四化：${mutagenText(d.mutagen)}`,
  ].join("\n");
}

function yearlyText(y: YearlyInfo): string {
  return [
    `今年流年：${y.year} 年 ${y.ganZhi}`,
    `流年十二宫：${y.palaceNames.join("、")}`,
    `流年四化：${mutagenText(y.mutagen)}`,
  ].join("\n");
}

const TASKS: Record<Part, Record<Lang, string>> = {
  mingpan: {
    zh: "请解读这张紫微命盘：先以命宫及其三方四正（财帛、官禄、迁移）定格局高低，再逐宫给出要点（性格、事业、财运、感情、健康），最后总结整体命局走势。500 字左右。",
    en: "Interpret this Zi Wei Dou Shu natal chart: first assess the structure from the Life Palace and its trine palaces (Wealth, Career, Travel), then give key points palace by palace (personality, career, wealth, relationships, health), and close with an overall life reading. About 400 words.",
  },
  daxian: {
    zh: "请结合命盘解读当前大限：这十年的重心落在哪些宫位，大限四化引动了哪些本命宫位，整体趋势与注意事项如何。500 字左右。",
    en: "Based on the natal chart, interpret the current decade luck: which life areas take centre stage in these ten years, which natal palaces are activated by the decade's four transformations, and what tendencies and cautions to watch. About 400 words.",
  },
  liunian: {
    zh: "请结合命盘与当前大限，解读今年流年：流年四化落入哪些宫位、引动什么，今年各领域的运势要点与建议。500 字左右。",
    en: "Based on the natal chart and current decade luck, interpret this year's annual luck: where the annual four transformations fall, what they activate, and the key tendencies and advice for each life area this year. About 400 words.",
  },
};

export function buildUserPrompt(part: Part, lang: Lang, chart: ZiweiChart): string {
  const blocks = [chartText(chart)];
  if (part === "daxian" || part === "liunian") {
    blocks.push(decadalText(chart.decadal));
  }
  if (part === "liunian") {
    blocks.push(yearlyText(chart.yearly));
  }
  blocks.push(TASKS[part][lang]);
  return blocks.join("\n\n");
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npx vitest run ziwei-prompt`
Expected: PASS（7 个用例全绿）。

- [ ] **Step 6: typecheck + Commit**

Run: `npm run typecheck`
Expected: 无错误。

```bash
git add src/ziwei/llm.ts src/ziwei/prompt.ts test/ziwei-prompt.test.ts
git commit -m "feat(ziwei): add system/user prompt builders"
```

---

### Task 3: API 路由 + 限流绑定

**Files:**
- Create: `src/routes/ziwei.ts`
- Create: `test/ziwei-api.test.ts`
- Modify: `src/routes/api.ts`
- Modify: `wrangler.jsonc`

**Interfaces:**
- Consumes: Task 1 `validateInterpretRequest / ZiweiEnv`、Task 2 `buildSystemPrompt / buildUserPrompt / callLlm`、`recordApiCall` from `src/stats`、夹具 `validBody()`
- Produces: `registerZiweiRoutes(api)`；`POST /api/ziwei/interpret` 全栈可用（集成测试 Task 4/5 会用到）

- [ ] **Step 1: 写失败测试 `test/ziwei-api.test.ts`**

```ts
import { fetchMock } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { api } from "../src/routes/api";
import type { ZiweiEnv } from "../src/ziwei/types";
import { validBody } from "./fixtures/ziwei-request";

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});
afterEach(() => {
  fetchMock.assertNoPendingInterceptors();
});

const baseEnv: ZiweiEnv = {
  LLM_BASE_URL: "https://apihub.agnes-ai.com",
  LLM_MODEL: "agnes-2.0-flash",
  LLM_API_KEY: "test-key",
};

function allowLimiter(success: boolean): ZiweiEnv["ZIWEI_RATE_LIMITER"] {
  return { limit: async () => ({ success }) };
}

function req(body: unknown): Request {
  return new Request("http://localhost/api/ziwei/interpret", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "1.2.3.4" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/ziwei/interpret", () => {
  it("returns markdown on success", async () => {
    fetchMock
      .get("https://apihub.agnes-ai.com")
      .intercept({ path: "/v1/chat/completions", method: "POST" })
      .reply(200, { choices: [{ message: { content: "## 命盘分析\n内容" } }] });
    const res = await api.fetch(req(validBody()), { ...baseEnv, ZIWEI_RATE_LIMITER: allowLimiter(true) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; data: { part: string; markdown: string } };
    expect(json.ok).toBe(true);
    expect(json.data.part).toBe("mingpan");
    expect(json.data.markdown).toContain("命盘分析");
  });

  it("works without rate limiter binding (local dev)", async () => {
    fetchMock
      .get("https://apihub.agnes-ai.com")
      .intercept({ path: "/v1/chat/completions", method: "POST" })
      .reply(200, { choices: [{ message: { content: "ok" } }] });
    const res = await api.fetch(req(validBody()), baseEnv);
    expect(res.status).toBe(200);
  });

  it("returns 429 when rate limited", async () => {
    const res = await api.fetch(req(validBody()), { ...baseEnv, ZIWEI_RATE_LIMITER: allowLimiter(false) });
    expect(res.status).toBe(429);
    const json = (await res.json()) as { ok: boolean; error: { code: string } };
    expect(json).toMatchObject({ ok: false, error: { code: "rate_limited" } });
  });

  it("returns 400 on invalid json", async () => {
    const res = await api.fetch(req("{oops"), baseEnv);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("invalid_json");
  });

  it("returns 400 on validation failure without echoing user input", async () => {
    const body = validBody("tarot");
    const res = await api.fetch(req(body), baseEnv);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string; message: string } };
    expect(json.error.code).toBe("invalid_request");
    expect(json.error.message).not.toContain("tarot");
  });

  it("returns 413 when body exceeds 8KB", async () => {
    const body = validBody();
    const res = await api.fetch(req(JSON.stringify(body) + " ".repeat(9000)), baseEnv);
    expect(res.status).toBe(413);
  });

  it("returns 500 not_configured when llm key missing", async () => {
    const res = await api.fetch(req(validBody()), {});
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("not_configured");
  });

  it("maps upstream failure to 502", async () => {
    fetchMock
      .get("https://apihub.agnes-ai.com")
      .intercept({ path: "/v1/chat/completions", method: "POST" })
      .reply(500, "boom");
    const res = await api.fetch(req(validBody()), baseEnv);
    expect(res.status).toBe(502);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("upstream_error");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run ziwei-api`
Expected: FAIL —— 404（路由未注册）或模块解析失败。

- [ ] **Step 3: 实现 `src/routes/ziwei.ts`**

```ts
import type { Hono } from "hono";
import { callLlm } from "../ziwei/llm";
import { buildSystemPrompt, buildUserPrompt } from "../ziwei/prompt";
import type { ZiweiEnv } from "../ziwei/types";
import { validateInterpretRequest } from "../ziwei/validate";
import { recordApiCall } from "../stats";
import type { StatsEnv } from "../stats";

const MAX_BODY_BYTES = 8 * 1024;

function err(code: string, message: string) {
  return { ok: false as const, error: { code, message } };
}

/** 注册紫微斗数解读路由（在 api 子应用内，basePath 已是 /api） */
export function registerZiweiRoutes(api: Hono<{ Bindings: ZiweiEnv & StatsEnv }>): void {
  api.post("/ziwei/interpret", async (c) => {
    // 0. 记录 API 调用（异步，不阻塞主流程）
    const db = c.env?.STATS_DB;
    if (db) {
      recordApiCall(db, "/api/ziwei/interpret").catch(() => {});
    }

    // 1. 限流（绑定缺失则跳过，本地 dev / 测试环境可用）
    const limiter = c.env?.ZIWEI_RATE_LIMITER;
    if (limiter) {
      const ip = c.req.header("cf-connecting-ip") ?? "unknown";
      const { success } = await limiter.limit({ key: ip });
      if (!success) return c.json(err("rate_limited", "Too many requests, please retry later."), 429);
    }

    // 2. 体积上限（先读 text 再 parse，避免超大 body 进 JSON 解析）
    const raw = await c.req.text();
    if (raw.length > MAX_BODY_BYTES) return c.json(err("payload_too_large", "Request body too large."), 413);

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return c.json(err("invalid_json", "Request body must be valid JSON."), 400);
    }

    // 3. 校验（错误消息是我们自己的字段名描述，不回显用户输入值）
    const v = validateInterpretRequest(body);
    if (!v.ok) return c.json(err("invalid_request", v.message), 400);

    // 4. 组提示词 → 调 LLM
    const { part, lang, chart } = v.value;
    const r = await callLlm(c.env ?? {}, buildSystemPrompt(lang), buildUserPrompt(part, lang, chart));
    if (!r.ok) {
      const messages: Record<typeof r.code, string> = {
        not_configured: "Service is not configured.",
        upstream_error: "Service returned an error, please retry.",
        upstream_timeout: "Service timed out, please retry.",
      };
      return c.json(err(r.code, messages[r.code]), r.status);
    }
    return c.json({ ok: true, data: { part, markdown: r.content } });
  });
}
```

- [ ] **Step 4: 注册路由 —— 修改 `src/routes/api.ts`**

4a. 顶部 import 区：在 `import { registerZejiRoutes } from "./zeji";` 后加一行：

```ts
import { registerZiweiRoutes } from "./ziwei";
```

在 `import type { ZejiEnv } from "../zeji/types";` 后加一行：

```ts
import type { ZiweiEnv } from "../ziwei/types";
```

4b. Hono 实例的 Bindings 联合类型加入 `ZiweiEnv`：

```ts
export const api = new Hono<{ Bindings: BaziEnv & LiuyaoEnv & MeihuaEnv & XiaoliurenEnv & ZejiEnv & ZiweiEnv & StatsEnv }>().basePath("/api");
```

4c. 在 `registerZejiRoutes(api);` 后加：

```ts
registerZiweiRoutes(api);
```

- [ ] **Step 5: 限流绑定 —— 修改 `wrangler.jsonc`**

在 `ratelimits` 数组 `XIAOLIUREN_RATE_LIMITER` 条目后追加（注意前一条目结尾补逗号）：

```jsonc
    {
      "name": "ZIWEI_RATE_LIMITER",
      "namespace_id": "1006",
      "simple": { "limit": 10, "period": 60 }
    }
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npx vitest run ziwei-api`
Expected: PASS（8 个用例全绿）。

Run: `npm test`
Expected: 全部通过（其余模块不受影响）。

- [ ] **Step 7: typecheck + Commit**

Run: `npm run typecheck`
Expected: 无错误。

```bash
git add src/routes/ziwei.ts src/routes/api.ts wrangler.jsonc test/ziwei-api.test.ts
git commit -m "feat(ziwei): add /api/ziwei/interpret route with rate limiter 1006"
```

---

### Task 4: 页面注册 + 「命理」下拉 + 页脚（原子任务）

本任务必须一次完成：registry 把 bazi 改 `inNav: false` 后，导航下拉必须同步就位，中间状态会让导航缺项。

**Files:**
- Modify: `test/registry.test.ts`
- Modify: `test/integration.test.ts`
- Create: `src/content/ziwei.zh.html`
- Create: `src/content/ziwei.en.html`
- Modify: `src/pages/registry.ts`
- Modify: `src/layout/nav.ts`
- Modify: `src/layout/footer.ts`

**Interfaces:**
- Consumes: 无（纯页面层，不依赖 ziwei 模块代码）
- Produces: `/zh/ziwei/` 与 `/en/ziwei/` 页面、`MINGLI_NAV_LABEL / MINGLI_NAV_ITEMS`（导出，风格同 DIVINATION_NAV_*）、页脚工具列含 ziwei

- [ ] **Step 1: 写失败测试 —— `test/registry.test.ts` 追加两个用例**

在 `describe("registry", ...)` 内、最后一个 `it` 之后追加：

```ts
  it("ziwei page exists with bilingual faq of equal length", () => {
    const ziwei = findPage("ziwei");
    expect(ziwei).toBeDefined();
    // 经「命理」下拉进入，不在平铺导航里
    expect(ziwei!.inNav).toBe(false);
    expect(ziwei!.faq!.zh.length).toBeGreaterThan(0);
    expect(ziwei!.faq!.zh.length).toBe(ziwei!.faq!.en.length);
  });

  it("bazi page no longer sits in the flat nav", () => {
    expect(findPage("bazi")!.inNav).toBe(false);
  });
```

- [ ] **Step 2: 写失败测试 —— `test/integration.test.ts` 文件末尾追加两个 describe**

```ts
describe("mingli nav dropdown", () => {
  const count = (html: string, needle: string): number => html.split(needle).length - 1;

  it("zh home renders the 命理 dropdown as a button with bazi and ziwei links", async () => {
    const res = await fetchNoFollow("/zh/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<button type="button" class="nav-dropdown-toggle" aria-haspopup="true" aria-expanded="false">命理<span');
    expect(html).toContain('href="/zh/bazi/"');
    expect(html).toContain('href="/zh/ziwei/"');
  });

  it("bazi appears only once in the nav region (inside the dropdown)", async () => {
    const res = await fetchNoFollow("/zh/");
    const html = await res.text();
    const navRegion = html.slice(html.indexOf('<div class="nav-links">'), html.indexOf('class="lang-switch"'));
    expect(count(navRegion, 'href="/zh/bazi/"')).toBe(1);
  });

  it("mingli dropdown sits between home and divination in nav order", async () => {
    const res = await fetchNoFollow("/zh/");
    const html = await res.text();
    const mingli = html.indexOf(">命理<span");
    const divination = html.indexOf(">占卜<span");
    expect(mingli).toBeGreaterThan(-1);
    expect(divination).toBeGreaterThan(mingli);
  });

  it("bazi page marks its dropdown link and toggle active", async () => {
    const res = await fetchNoFollow("/zh/bazi/");
    const html = await res.text();
    expect(html).toContain('nav-dropdown-toggle active');
    expect(html).toContain('href="/zh/bazi/" class="active" aria-current="page"');
  });

  it("ziwei page marks its dropdown link and toggle active", async () => {
    const res = await fetchNoFollow("/zh/ziwei/");
    const html = await res.text();
    expect(html).toContain('nav-dropdown-toggle active');
    expect(html).toContain('href="/zh/ziwei/" class="active" aria-current="page"');
  });

  it("en home renders the Destiny dropdown with bazi and ziwei links", async () => {
    const res = await fetchNoFollow("/en/");
    const html = await res.text();
    expect(html).toContain(">Destiny<span");
    expect(html).toContain('href="/en/bazi/"');
    expect(html).toContain('href="/en/ziwei/"');
  });

  it("footer tools column carries the ziwei link", async () => {
    const res = await fetchNoFollow("/zh/");
    const html = await res.text();
    expect(html).toContain('aria-label="工具"');
    expect(html).toContain('href="/zh/ziwei/"');
  });
});

describe("ziwei page", () => {
  it("serves /zh/ziwei/ with form skeleton, FAQPage JSON-LD and scripts", async () => {
    const res = await SELF.fetch("http://localhost/zh/ziwei/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('id="ziwei-app"');
    expect(html).toContain("/assets/ziwei.js");
    expect(html).toContain('"FAQPage"');
  });

  it("serves /en/ziwei/ in English", async () => {
    const res = await SELF.fetch("http://localhost/en/ziwei/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('data-lang="en"');
  });

  it("full-stack: invalid interpret request gets JSON 400", async () => {
    const res = await SELF.fetch("http://localhost/api/ziwei/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ part: "nope" }),
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(false);
  });
});
```

说明：`fetchNoFollow` 与 `SELF` 已在该文件顶部导入，无需新增 import。「divination dropdown sits between bazi and zeji」既有断言不受影响（bazi href 出现在命理下拉内，仍位于占卜之前）。

- [ ] **Step 3: 运行测试确认失败**

Run: `npm test`
Expected: FAIL —— 新增用例失败（ziwei 页 404、命理下拉不存在、registry 用例 undefined）；既有用例应全部保持通过。

- [ ] **Step 4: 创建 `src/content/ziwei.zh.html`**

```html
<div class="ziwei-app" id="ziwei-app" data-lang="zh">
  <h1>紫微斗数</h1>
  <p class="lead">输入出生时间，在线排出紫微斗数命盘，并获取命盘、大限与流年三段解读。</p>

  <form class="bazi-form" id="ziwei-form">
    <fieldset class="bazi-field">
      <legend>历法</legend>
      <label><input type="radio" name="calendar" value="solar" checked> 公历</label>
      <label><input type="radio" name="calendar" value="lunar"> 农历</label>
      <label id="ziwei-leap-wrap" hidden><input type="checkbox" id="ziwei-leap"> 闰月</label>
    </fieldset>
    <div class="bazi-field">
      <label>年 <input type="number" id="ziwei-year" min="1900" max="2100" value="1990" required></label>
      <label>月 <input type="number" id="ziwei-month" min="1" max="12" value="1" required></label>
      <label>日 <input type="number" id="ziwei-day" min="1" max="31" value="1" required></label>
      <label>时辰
        <select id="ziwei-hour">
          <option value="0">早子时 23:00-00:59</option>
          <option value="1">丑时 01:00-02:59</option>
          <option value="2">寅时 03:00-04:59</option>
          <option value="3">卯时 05:00-06:59</option>
          <option value="4">辰时 07:00-08:59</option>
          <option value="5">巳时 09:00-10:59</option>
          <option value="6" selected>午时 11:00-12:59</option>
          <option value="7">未时 13:00-14:59</option>
          <option value="8">申时 15:00-16:59</option>
          <option value="9">酉时 17:00-18:59</option>
          <option value="10">戌时 19:00-20:59</option>
          <option value="11">亥时 21:00-22:59</option>
          <option value="12">晚子时 23:00-23:59</option>
        </select>
      </label>
    </div>
    <fieldset class="bazi-field">
      <legend>性别</legend>
      <label><input type="radio" name="gender" value="male" checked> 男</label>
      <label><input type="radio" name="gender" value="female"> 女</label>
    </fieldset>
    <button type="submit" class="bazi-submit">排盘</button>
    <p class="bazi-form-error" id="ziwei-form-error" role="alert" hidden></p>
  </form>

  <section id="ziwei-result" class="ziwei-result" hidden aria-live="polite"></section>

  <section id="ziwei-interpret" class="ziwei-interpret" hidden>
    <h2>命理解读</h2>
    <p class="bazi-disclaimer">以下解读侧重传统紫微斗数推演，具体应用请结合自身情况。</p>
    <article class="ziwei-card" id="card-mingpan"><h3>命盘总览</h3><div class="ziwei-card-body"></div></article>
    <article class="ziwei-card" id="card-daxian"><h3>大限解读</h3><div class="ziwei-card-body"></div></article>
    <article class="ziwei-card" id="card-liunian"><h3>流年解读</h3><div class="ziwei-card-body"></div></article>
  </section>

  <section class="ziwei-faq">
    <h2>常见问题</h2>
    <h3>什么是紫微斗数？它与八字有什么区别？</h3>
    <p>紫微斗数是中国传统命理的一支，以出生时间排出十二宫星盘，用紫微、天机等十四主星与诸辅星的庙旺落陷和四化飞星来推演人生各领域。八字则以四柱干支的五行生克论命局。两者同出传统命理，视角不同：八字长于五行气势与岁运起伏，紫微长于逐宫细看人生领域。</p>
    <h3>排盘为什么要填性别和出生时辰？</h3>
    <p>紫微斗数的大限顺逆由性别与阴阳年决定，命宫与身宫的位置由出生时辰决定，时辰差一个盘就完全不同，所以这两项都是必填。</p>
    <h3>三段解读（命盘/大限/流年）分别看什么？</h3>
    <p>命盘总览看一生格局：命宫三方四正的高低与各宫要点；大限看当下十年：重心宫位与大限四化引动的变化；流年看今年：流年四化落宫引发的运势要点。三者由远及近、层层聚焦。</p>
    <h3>AI 解读权威吗？</h3>
    <p>排盘遵循传统紫微斗数安星规则，解读由 AI 基于传统斗数文献整理生成，侧重文化推演，仅供参考，重要决策请结合自身情况。</p>
  </section>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js" defer></script>
<script src="/assets/ziwei.js" defer></script>
```

注意：iztro 由 `ziwei.js` 内部三级加载链注入，不需要 script 标签；表单复用 bazi-form/bazi-field/bazi-submit/bazi-disclaimer 样式类。

- [ ] **Step 5: 创建 `src/content/ziwei.en.html`**

```html
<div class="ziwei-app" id="ziwei-app" data-lang="en">
  <h1>Zi Wei Dou Shu</h1>
  <p class="lead">Enter your birth time to cast a Zi Wei Dou Shu (Purple Star Astrology) chart and get readings of your natal chart, decade luck and this year.</p>

  <form class="bazi-form" id="ziwei-form">
    <fieldset class="bazi-field">
      <legend>Calendar</legend>
      <label><input type="radio" name="calendar" value="solar" checked> Solar</label>
      <label><input type="radio" name="calendar" value="lunar"> Lunar</label>
      <label id="ziwei-leap-wrap" hidden><input type="checkbox" id="ziwei-leap"> Leap month</label>
    </fieldset>
    <div class="bazi-field">
      <label>Year <input type="number" id="ziwei-year" min="1900" max="2100" value="1990" required></label>
      <label>Month <input type="number" id="ziwei-month" min="1" max="12" value="1" required></label>
      <label>Day <input type="number" id="ziwei-day" min="1" max="31" value="1" required></label>
      <label>Hour
        <select id="ziwei-hour">
          <option value="0">Early Zi 23:00-00:59</option>
          <option value="1">Chou 01:00-02:59</option>
          <option value="2">Yin 03:00-04:59</option>
          <option value="3">Mao 05:00-06:59</option>
          <option value="4">Chen 07:00-08:59</option>
          <option value="5">Si 09:00-10:59</option>
          <option value="6" selected>Wu 11:00-12:59</option>
          <option value="7">Wei 13:00-14:59</option>
          <option value="8">Shen 15:00-16:59</option>
          <option value="9">You 17:00-18:59</option>
          <option value="10">Xu 19:00-20:59</option>
          <option value="11">Hai 21:00-22:59</option>
          <option value="12">Late Zi 23:00-23:59</option>
        </select>
      </label>
    </div>
    <fieldset class="bazi-field">
      <legend>Gender</legend>
      <label><input type="radio" name="gender" value="male" checked> Male</label>
      <label><input type="radio" name="gender" value="female"> Female</label>
    </fieldset>
    <button type="submit" class="bazi-submit">Cast Chart</button>
    <p class="bazi-form-error" id="ziwei-form-error" role="alert" hidden></p>
  </form>

  <section id="ziwei-result" class="ziwei-result" hidden aria-live="polite"></section>

  <section id="ziwei-interpret" class="ziwei-interpret" hidden>
    <h2>Destiny Reading</h2>
    <p class="bazi-disclaimer">The readings below are grounded in traditional Zi Wei Dou Shu reasoning — please apply them in light of your own circumstances.</p>
    <article class="ziwei-card" id="card-mingpan"><h3>Natal Chart Overview</h3><div class="ziwei-card-body"></div></article>
    <article class="ziwei-card" id="card-daxian"><h3>Decade Luck Reading</h3><div class="ziwei-card-body"></div></article>
    <article class="ziwei-card" id="card-liunian"><h3>This Year's Reading</h3><div class="ziwei-card-body"></div></article>
  </section>

  <section class="ziwei-faq">
    <h2>FAQ</h2>
    <h3>What is Zi Wei Dou Shu, and how does it differ from BaZi?</h3>
    <p>Zi Wei Dou Shu (Purple Star Astrology) is a branch of traditional Chinese destiny study: it casts a twelve-palace star chart from the birth time and reasons through the brightness and four transformations of fourteen major stars such as Zi Wei and Tian Ji. BaZi, by contrast, reads destiny through the five-element interplay of the Four Pillars. Both come from the same tradition but look from different angles — BaZi excels at elemental momentum and luck cycles, while Zi Wei examines each life area palace by palace.</p>
    <h3>Why does the form ask for gender and birth hour?</h3>
    <p>The forward or backward flow of decade luck is fixed by gender combined with the yin/yang polarity of the birth year, and the positions of the Life and Body palaces are fixed by the birth hour — shift the hour by one and the whole chart changes. Both fields are therefore required.</p>
    <h3>What do the three readings (natal chart / decade / year) cover?</h3>
    <p>The natal overview reads the lifelong structure — the stature of the Life Palace and its trine palaces plus key points for each palace; the decade reading covers the current ten years — its focus palaces and what the decade's four transformations activate; the yearly reading covers this year — where the annual four transformations fall and what they stir. The three move from far to near, each zooming in.</p>
    <h3>Are the AI readings authoritative?</h3>
    <p>The chart casting follows traditional Zi Wei star-placement rules; the reading is generated by AI drawing on classical Zi Wei literature and is offered as cultural reasoning for reference only. Please weigh important decisions in light of your own circumstances.</p>
  </section>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js" defer></script>
<script src="/assets/ziwei.js" defer></script>
```

- [ ] **Step 6: 修改 `src/pages/registry.ts`**

6a. import 区：在 `import baziEn from "../content/bazi.en.html";` 后加：

```ts
import ziweiZh from "../content/ziwei.zh.html";
import ziweiEn from "../content/ziwei.en.html";
```

6b. bazi 条目：`inNav: true` 改为 `inNav: false` 并加注释（对齐 liuyao 条目风格）：

```ts
  {
    slug: "bazi",
    // 顶部导航改走「命理」下拉（见 layout/nav.ts），不再出现在平铺链接里
    inNav: false,
    meta: {
      zh: { title: "八字排盘", description: "在线八字排盘：四柱十神、大运流年，AI 智能解读命局走势。" },
      en: { title: "BaZi Chart", description: "Free BaZi Four-Pillars calculator with AI readings of your chart, luck cycles and yearly outlook." },
    },
    content: { zh: baziZh, en: baziEn },
  },
```

6c. 在 bazi 条目之后插入 ziwei 条目（faq 文案与正文 FAQ 逐字一致）：

```ts
  {
    slug: "ziwei",
    // 经「命理」下拉进入（见 layout/nav.ts），不在平铺导航里
    inNav: false,
    meta: {
      zh: { title: "紫微斗数", description: "在线紫微斗数排盘：十二宫星曜、四化飞星、大限流年，AI 智能解读命盘走势。" },
      en: { title: "Zi Wei Dou Shu", description: "Free Zi Wei Dou Shu (Purple Star Astrology) chart calculator with AI readings of your natal chart, decade luck and yearly outlook." },
    },
    content: { zh: ziweiZh, en: ziweiEn },
    faq: {
      zh: [
        {
          question: "什么是紫微斗数？它与八字有什么区别？",
          answer: "紫微斗数是中国传统命理的一支，以出生时间排出十二宫星盘，用紫微、天机等十四主星与诸辅星的庙旺落陷和四化飞星来推演人生各领域。八字则以四柱干支的五行生克论命局。两者同出传统命理，视角不同：八字长于五行气势与岁运起伏，紫微长于逐宫细看人生领域。",
        },
        {
          question: "排盘为什么要填性别和出生时辰？",
          answer: "紫微斗数的大限顺逆由性别与阴阳年决定，命宫与身宫的位置由出生时辰决定，时辰差一个盘就完全不同，所以这两项都是必填。",
        },
        {
          question: "三段解读（命盘/大限/流年）分别看什么？",
          answer: "命盘总览看一生格局：命宫三方四正的高低与各宫要点；大限看当下十年：重心宫位与大限四化引动的变化；流年看今年：流年四化落宫引发的运势要点。三者由远及近、层层聚焦。",
        },
        {
          question: "AI 解读权威吗？",
          answer: "排盘遵循传统紫微斗数安星规则，解读由 AI 基于传统斗数文献整理生成，侧重文化推演，仅供参考，重要决策请结合自身情况。",
        },
      ],
      en: [
        {
          question: "What is Zi Wei Dou Shu, and how does it differ from BaZi?",
          answer: "Zi Wei Dou Shu (Purple Star Astrology) is a branch of traditional Chinese destiny study: it casts a twelve-palace star chart from the birth time and reasons through the brightness and four transformations of fourteen major stars such as Zi Wei and Tian Ji. BaZi, by contrast, reads destiny through the five-element interplay of the Four Pillars. Both come from the same tradition but look from different angles — BaZi excels at elemental momentum and luck cycles, while Zi Wei examines each life area palace by palace.",
        },
        {
          question: "Why does the form ask for gender and birth hour?",
          answer: "The forward or backward flow of decade luck is fixed by gender combined with the yin/yang polarity of the birth year, and the positions of the Life and Body palaces are fixed by the birth hour — shift the hour by one and the whole chart changes. Both fields are therefore required.",
        },
        {
          question: "What do the three readings (natal chart / decade / year) cover?",
          answer: "The natal overview reads the lifelong structure — the stature of the Life Palace and its trine palaces plus key points for each palace; the decade reading covers the current ten years — its focus palaces and what the decade's four transformations activate; the yearly reading covers this year — where the annual four transformations fall and what they stir. The three move from far to near, each zooming in.",
        },
        {
          question: "Are the AI readings authoritative?",
          answer: "The chart casting follows traditional Zi Wei star-placement rules; the reading is generated by AI drawing on classical Zi Wei literature and is offered as cultural reasoning for reference only. Please weigh important decisions in light of your own circumstances.",
        },
      ],
    },
  },
```

- [ ] **Step 7: 修改 `src/layout/nav.ts`**

7a. 在 `DIVINATION_NAV_ITEMS` 定义之前（`/** 「占卜」下拉菜单…` 注释之前）插入：

```ts
/** 「命理」下拉菜单：标签直接取 registry 页面标题（单一来源）；纯按钮展开、无链接（同「运势」下拉） */
export const MINGLI_NAV_LABEL: Record<Lang, string> = { zh: "命理", en: "Destiny" };

export const MINGLI_NAV_ITEMS: readonly { slug: string; label: Record<Lang, string> }[] = [
  "bazi",
  "ziwei",
].map((slug) => ({ slug, label: { zh: findPage(slug)!.meta.zh.title, en: findPage(slug)!.meta.en.title } }));

```

7b. `renderNav` 内的循环与注释改为（替换 `const chunks: string[] = [];` 到 `chunks.push(renderDropdown(lang, currentSlug, FORTUNE_NAV_LABEL, FORTUNE_NAV_ITEMS));` 之间）：

```ts
  // 导航顺序（单一来源）：首页 · [命理 ▾] · [占卜 ▾] · 择吉日 · [运势 ▾]
  // 「命理」下拉占八字原平铺位置（首页之后），纯按钮无链接；八字/紫微均 inNav: false
  const chunks: string[] = [];
  for (const p of navPages()) {
    const active = p.slug === currentSlug ? ' class="active" aria-current="page"' : "";
    chunks.push(`<a href="${pagePath(lang, p.slug)}"${active}>${escapeHtml(p.meta[lang].title)}</a>`);
    if (p.slug === "") {
      chunks.push(renderDropdown(lang, currentSlug, MINGLI_NAV_LABEL, MINGLI_NAV_ITEMS));
      chunks.push(renderDropdown(lang, currentSlug, DIVINATION_NAV_LABEL, DIVINATION_NAV_ITEMS, "divination"));
    }
  }
  chunks.push(renderDropdown(lang, currentSlug, FORTUNE_NAV_LABEL, FORTUNE_NAV_ITEMS));
```

（删除原 `if (p.slug === "bazi") chunks.push(renderDropdown(...))` 分支；`renderDropdown` 不传 overviewSlug 即渲染纯 `<button>`。）

- [ ] **Step 8: 修改 `src/layout/footer.ts`**

`toolLinks` 一行改为：

```ts
  const toolLinks = ["bazi", "ziwei", "liuyao", "meihua", "xiaoliuren"]
```

- [ ] **Step 9: 运行全部测试**

Run: `npm test`
Expected: 全部通过（含新增 registry 2 例、mingli nav 7 例、ziwei page 3 例；既有 divination nav 断言保持通过）。

- [ ] **Step 10: typecheck + Commit**

Run: `npm run typecheck`
Expected: 无错误。

```bash
git add src/content/ziwei.zh.html src/content/ziwei.en.html src/pages/registry.ts src/layout/nav.ts src/layout/footer.ts test/registry.test.ts test/integration.test.ts
git commit -m "feat(ziwei): register ziwei page and restructure destiny nav dropdown"
```

---

### Task 5: iztro 本地兜底 + 前端排盘脚本 + 样式

**Files:**
- Create: `public/assets/vendor/iztro.min.js`（从 iztro@2.6.0 dist 复制）
- Modify: `test/integration.test.ts`（vendor 可服务断言）
- Create: `public/assets/ziwei.js`
- Modify: `public/assets/style.css`（文件末尾追加紫微样式块）

**Interfaces:**
- Consumes: Task 3 的 `POST /api/ziwei/interpret`、Task 4 的页面骨架（`#ziwei-app` / `#ziwei-form` / `#card-*`）
- Produces: 完整可用的紫微斗数页面（浏览器侧）

- [ ] **Step 1: 写失败测试 —— vendor 文件可服务**

在 `test/integration.test.ts` 的 `describe("ziwei page", ...)` 内追加：

```ts
  it("serves the local iztro vendor fallback file", async () => {
    const res = await SELF.fetch("http://localhost/assets/vendor/iztro.min.js");
    expect(res.status).toBe(200);
  });
```

Run: `npx vitest run integration`
Expected: 该用例 FAIL（404，文件尚不存在）；其余用例保持通过。

- [ ] **Step 2: 安装 iztro（不写入 package.json）并复制 UMD 产物**

```bash
npm install --no-save --no-package-lock iztro@2.6.0
mkdir -p public/assets/vendor
cp node_modules/iztro/dist/iztro.min.js public/assets/vendor/iztro.min.js
```

- [ ] **Step 3: 验证产物与仓库卫生**

```bash
ls -la public/assets/vendor/iztro.min.js   # 约 787KB（780000+ 字节）
head -c 200 public/assets/vendor/iztro.min.js   # 头部应含 iztro UMD 包装
git status --porcelain package.json package-lock.json   # 必须无输出（未被修改）
```

若 `git status` 显示 package.json/package-lock.json 被改动：`git checkout -- package.json package-lock.json` 恢复（本次安装只是临时取产物）。

- [ ] **Step 4: 创建 `public/assets/ziwei.js`**

iztro 字段名均已实测（`earthlyBranch` / `isBodyPalace` / `majorStars[].type==='major'` / minorStars type ∈ soft/tough/lucun/tianma / `palaces[i].decadal.range` 为 `[起,止]` 数组 / `horoscope(date, timeIndex)` / `lunarDate` / `time` / `soul` / `body` / `fiveElementsClass` / `zodiac`），勿改。

```js
/* 紫微斗数页脚本：iztro 三级加载排盘 → 4×4 盘格渲染 → 串行请求三段命理解读 */
(function () {
  "use strict";

  var app = document.getElementById("ziwei-app");
  if (!app) return;
  var LANG = app.dataset.lang === "en" ? "en" : "zh";

  /* ---------- iztro 三级加载：unpkg → jsdelivr → 本地 vendor ---------- */

  var IZTRO_SOURCES = [
    "https://unpkg.com/iztro@2.6.0/dist/iztro.min.js",
    "https://cdn.jsdelivr.net/npm/iztro@2.6.0/dist/iztro.min.js",
    "/assets/vendor/iztro.min.js",
  ];

  function loadIztro(idx) {
    if (idx >= IZTRO_SOURCES.length) return; // 三源皆败：提交时 !window.iztro 会提示 T.libLoading
    var s = document.createElement("script");
    s.src = IZTRO_SOURCES[idx];
    s.onload = function () {
      // CDN 错误页也返回 200 并触发 onload，须复核全局对象存在
      if (!window.iztro || !window.iztro.astro) loadIztro(idx + 1);
    };
    s.onerror = function () { loadIztro(idx + 1); };
    document.head.appendChild(s);
  }
  loadIztro(0);

  /* ---------- 文案 ---------- */

  var T = {
    zh: {
      chartTitle: "排盘结果", solar: "公历", lunar: "农历", time: "时辰",
      soul: "命主", bodyMaster: "身主", fiveElementsClass: "五行局", zodiac: "生肖",
      shenGong: "身宫", noMajor: "无主星",
      decadalBar: "当前大限：{gz}（{age} 岁）",
      loading: "正在解读…", waiting: "正在解读…",
      retry: "重试", failed: "解读失败：",
      invalidDate: "日期无效，请检查输入",
      libLoading: "星盘组件没能送达，请刷新页面或检查网络",
      mdLibLoading: "解读组件未完全加载，请稍后重试",
      errMap: {
        rate_limited: "问卦的人有点多，天师正在逐一回复，请稍等片刻再来",
        upstream_timeout: "天师凝神推演超时了，请再试一次",
        upstream_error: "天师暂时没空，稍后再来问问吧",
        not_configured: "天师暂时没空，稍后再来问问吧",
        invalid_request: "卦帖写得不太对，请核对后再递上来",
        payload_too_large: "卦帖太长了，请精简后再递上来",
        invalid_json: "卦帖写得不太对，请核对后再递上来",
      },
    },
    en: {
      chartTitle: "Chart Result", solar: "Solar", lunar: "Lunar", time: "Hour",
      soul: "Soul Star", bodyMaster: "Body Star", fiveElementsClass: "Five-Elements Class", zodiac: "Zodiac",
      shenGong: "Body Palace", noMajor: "No major star",
      decadalBar: "Current decade: {gz} (ages {age})",
      loading: "Interpreting…", waiting: "Interpreting…",
      retry: "Retry", failed: "Reading failed: ",
      invalidDate: "Invalid date, please check input",
      libLoading: "The chart library failed to load — please refresh or check your connection.",
      mdLibLoading: "Reading components not fully loaded, please retry later",
      errMap: {
        rate_limited: "The Master is attending to many visitors — please return in a few moments.",
        upstream_timeout: "The Master's reading ran long — please try again.",
        upstream_error: "The Master is unavailable right now — please check back later.",
        not_configured: "The Master is unavailable right now — please check back later.",
        invalid_request: "Something in your request looks off — please double-check and try again.",
        payload_too_large: "Your request is a bit too long — please trim it and try again.",
        invalid_json: "Something in your request looks off — please double-check and try again.",
      },
    },
  }[LANG];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  /* ---------- 排盘 ---------- */

  /* 4×4 盘格：十二地支固定方位（子居下、午居上、卯居左、酉居右），中宫 2×2 为信息格 */
  var BRANCH_POS = {
    巳: "1 / 1", 午: "1 / 2", 未: "1 / 3", 申: "1 / 4",
    辰: "2 / 1", 酉: "2 / 4",
    卯: "3 / 1", 戌: "3 / 4",
    寅: "4 / 1", 丑: "4 / 2", 子: "4 / 3", 亥: "4 / 4",
  };

  /* iztro minorStars.type → payload kind（其余类型不入盘面与 payload） */
  var KIND_MAP = { soft: "吉", tough: "煞", lucun: "禄", tianma: "马" };

  function two(n) { return (n < 10 ? "0" : "") + n; }

  /** 数据盘恒用 zh-CN（英文盘亮度是数值，无法展示与传输）；英文页另排一盘仅取本地化名 */
  function castPair(input, dateStr, genderZh) {
    var a = window.iztro.astro;
    if (input.calendar === "solar") {
      var zh = a.bySolar(dateStr, input.timeIndex, genderZh);
      return { zh: zh, disp: LANG === "en" ? a.bySolar(dateStr, input.timeIndex, genderZh, undefined, "en-US") : zh };
    }
    var zhL = a.byLunar(dateStr, input.timeIndex, genderZh, input.leap);
    return { zh: zhL, disp: LANG === "en" ? a.byLunar(dateStr, input.timeIndex, genderZh, input.leap, undefined, "en-US") : zhL };
  }

  function slimPalaces(chart) {
    return chart.palaces.map(function (p) {
      return {
        name: p.name,
        branch: p.earthlyBranch,
        isBody: !!p.isBodyPalace,
        majors: p.majorStars.filter(function (s) { return s.type === "major"; })
          .map(function (s) { return { name: s.name, brightness: s.brightness || "", mutagen: s.mutagen || "" }; }),
        minors: p.minorStars.filter(function (s) { return KIND_MAP[s.type]; })
          .map(function (s) { return { name: s.name, kind: KIND_MAP[s.type], mutagen: s.mutagen || "" }; }),
      };
    });
  }

  function buildChart(input) {
    var genderZh = input.gender === "male" ? "男" : "女";
    var dateStr = input.year + "-" + two(input.month) + "-" + two(input.day);
    var pair = castPair(input, dateStr, genderZh);
    var chartZh = pair.zh;

    var now = new Date();
    var todayStr = now.getFullYear() + "-" + two(now.getMonth() + 1) + "-" + two(now.getDate());
    var h = chartZh.horoscope(todayStr, input.timeIndex);
    var decadalPalace = chartZh.palaces[h.decadal.index];

    return {
      disp: pair.disp,
      api: {
        gender: input.gender,
        solar: dateStr,
        lunar: chartZh.lunarDate,
        time: chartZh.time,
        zodiac: chartZh.zodiac,
        soul: chartZh.soul,
        body: chartZh.body,
        fiveElementsClass: chartZh.fiveElementsClass,
        palaces: slimPalaces(chartZh),
        decadal: {
          ganZhi: h.decadal.heavenlyStem + h.decadal.earthlyBranch,
          ageRange: decadalPalace.decadal.range[0] + "-" + decadalPalace.decadal.range[1],
          palaceNames: h.decadal.palaceNames,
          mutagen: h.decadal.mutagen,
        },
        yearly: {
          year: now.getFullYear(),
          ganZhi: h.yearly.heavenlyStem + h.yearly.earthlyBranch,
          palaceNames: h.yearly.palaceNames,
          mutagen: h.yearly.mutagen,
        },
      },
    };
  }

  /* ---------- 盘面渲染 ---------- */

  function starMeta(m) {
    return '<span class="ziwei-star-meta">' + esc(m.brightness)
      + (m.mutagen ? '<span class="ziwei-hua">' + esc(m.mutagen) + "</span>" : "") + "</span>";
  }

  function renderResult(built) {
    var api = built.api;
    var disp = built.disp;
    var html = "<h2>" + esc(T.chartTitle) + "</h2>";
    html += "<p>" + esc(T.solar) + "：" + esc(api.solar) + "　" + esc(T.lunar) + "：" + esc(api.lunar)
      + "　" + esc(T.time) + "：" + esc(api.time) + "</p>";
    html += '<div class="ziwei-board-wrap"><div class="ziwei-board">';
    html += '<div class="ziwei-center">'
      + "<p><strong>" + esc(T.soul) + "</strong> " + esc(disp.soul)
      + "　<strong>" + esc(T.bodyMaster) + "</strong> " + esc(disp.body) + "</p>"
      + "<p>" + esc(T.fiveElementsClass) + "：" + esc(disp.fiveElementsClass) + "</p>"
      + "<p>" + esc(T.zodiac) + "：" + esc(disp.zodiac) + "</p>"
      + "</div>";
    api.palaces.forEach(function (p, i) {
      // disp 与 zh 盘同源同序；英文盘仅提供本地化星名宫名，亮度/四化/地支取中文盘
      var dp = disp.palaces[i];
      var cls = "ziwei-cell" + (p.name === "命宫" ? " ming" : "") + (p.isBody ? " body" : "");
      html += '<div class="' + cls + '" style="grid-area:' + BRANCH_POS[p.branch] + '">';
      html += '<div class="ziwei-cell-head">' + esc(dp.name)
        + (p.isBody ? "·" + esc(T.shenGong) : "")
        + '<span class="ziwei-branch">' + esc(p.branch) + "</span></div>";
      if (!p.majors.length) {
        html += '<div class="ziwei-major ziwei-empty">' + esc(T.noMajor) + "</div>";
      }
      p.majors.forEach(function (m, j) {
        var name = dp.majors[j] ? dp.majors[j].name : m.name;
        html += '<div class="ziwei-major">' + esc(name) + starMeta(m) + "</div>";
      });
      if (p.minors.length) {
        html += '<div class="ziwei-minors">';
        p.minors.forEach(function (m, j) {
          var name = dp.minors[j] ? dp.minors[j].name : m.name;
          var k = m.kind === "吉" ? "ji" : m.kind === "煞" ? "sha" : m.kind === "禄" ? "lu" : "ma";
          html += '<span class="ziwei-minor ziwei-minor-' + k + '">' + esc(name)
            + (m.mutagen ? '<span class="ziwei-hua">' + esc(m.mutagen) + "</span>" : "") + "</span>";
        });
        html += "</div>";
      }
      html += "</div>";
    });
    html += "</div></div>";
    html += '<p class="ziwei-decadal-bar">'
      + esc(T.decadalBar.replace("{gz}", api.decadal.ganZhi).replace("{age}", api.decadal.ageRange)) + "</p>";

    var box = document.getElementById("ziwei-result");
    box.innerHTML = html;
    box.hidden = false;
  }

  /* ---------- 解读请求（串行） ---------- */

  var PART_IDS = ["mingpan", "daxian", "liunian"];
  var chainVersion = 0; // 每次提交递增，旧链据此丢弃过期的 DOM 写入

  function cardBody(part) {
    return document.querySelector("#card-" + part + " .ziwei-card-body");
  }

  function setStatus(part, cls, text, withRetry, retryFn) {
    var body = cardBody(part);
    body.innerHTML = "";
    var p = document.createElement("p");
    p.className = "status " + cls;
    p.textContent = text;
    body.appendChild(p);
    if (withRetry) {
      var btn = document.createElement("button");
      btn.className = "ziwei-retry";
      btn.textContent = T.retry;
      btn.addEventListener("click", retryFn);
      body.appendChild(btn);
    }
  }

  function renderMarkdown(part, md) {
    // marked/DOMPurify 由 CDN 异步加载，未就绪时抛友好文案（走现有 catch/重试路径）
    if (typeof DOMPurify === "undefined" || typeof marked === "undefined") {
      throw new Error(T.mdLibLoading);
    }
    cardBody(part).innerHTML = DOMPurify.sanitize(marked.parse(md));
  }

  function requestPart(part, chartSnapshot) {
    return fetch("/api/ziwei/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ part: part, lang: LANG, chart: chartSnapshot }),
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!json.ok) {
          var code = json.error && json.error.code;
          /* 抛出的已是完整用户文案（映射或兜底），catch 处直接展示、不再拼前缀 */
          throw new Error((T.errMap && T.errMap[code]) || T.failed + "HTTP " + res.status);
        }
        return json.data.markdown;
      });
    });
  }

  /* 从 startIndex 开始串行执行；失败则停在当前段，重试成功后继续后续段。
     链绑定提交时的 chartSnapshot 与 version，版本过期（用户重新排盘）则丢弃不写 DOM */
  function runChain(startIndex, chartSnapshot, version) {
    if (version !== chainVersion) return;
    if (startIndex >= PART_IDS.length) return;
    var part = PART_IDS[startIndex];
    setStatus(part, "loading", T.loading, false);
    for (var j = startIndex + 1; j < PART_IDS.length; j++) {
      setStatus(PART_IDS[j], "", T.waiting, false);
    }
    requestPart(part, chartSnapshot).then(function (md) {
      if (version !== chainVersion) return;
      renderMarkdown(part, md);
      runChain(startIndex + 1, chartSnapshot, version);
    }).catch(function (e) {
      if (version !== chainVersion) return;
      setStatus(part, "error", e.message, true, function () { runChain(startIndex, chartSnapshot, version); });
    });
  }

  /* ---------- 表单 ---------- */

  var form = document.getElementById("ziwei-form");
  var leapWrap = document.getElementById("ziwei-leap-wrap");
  Array.prototype.forEach.call(form.elements.calendar, function (r) {
    r.addEventListener("change", function () {
      leapWrap.hidden = form.elements.calendar.value !== "lunar";
    });
  });

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var errBox = document.getElementById("ziwei-form-error");
    errBox.hidden = true;
    if (!window.iztro || !window.iztro.astro) {
      errBox.textContent = T.libLoading;
      errBox.hidden = false;
      return;
    }
    var input = {
      calendar: form.elements.calendar.value,
      leap: document.getElementById("ziwei-leap").checked,
      year: parseInt(document.getElementById("ziwei-year").value, 10),
      month: parseInt(document.getElementById("ziwei-month").value, 10),
      day: parseInt(document.getElementById("ziwei-day").value, 10),
      timeIndex: parseInt(document.getElementById("ziwei-hour").value, 10),
      gender: form.elements.gender.value,
    };
    var built;
    try {
      built = buildChart(input);
    } catch (e) {
      // iztro 对非法日期（如农历无此闰月、公历溢出日期）抛异常
      errBox.textContent = T.invalidDate;
      errBox.hidden = false;
      return;
    }
    renderResult(built);
    document.getElementById("ziwei-interpret").hidden = false;
    chainVersion++;
    runChain(0, built.api, chainVersion);
    document.getElementById("ziwei-result").scrollIntoView({ behavior: "smooth" });
  });
})();
```

- [ ] **Step 5: 修改 `public/assets/style.css` —— 文件末尾追加**

```css
/* ---------- 紫微斗数页 ---------- */

.ziwei-app { max-width: 900px; margin: 0 auto; }

.ziwei-board-wrap { overflow-x: auto; margin: 1rem 0; }

.ziwei-board {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  grid-template-rows: repeat(4, minmax(110px, auto));
  min-width: 640px;
  gap: 4px;
}

.ziwei-cell {
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #fff;
  padding: 0.4rem 0.5rem;
  font-size: 0.82rem;
  line-height: 1.5;
}

.ziwei-cell.ming { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.ziwei-cell.body { background: #fdf6ec; }

.ziwei-cell-head {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.ziwei-branch { color: var(--muted); font-weight: 400; }

.ziwei-major { font-weight: 600; }
.ziwei-major.ziwei-empty { font-weight: 400; color: var(--muted); }

.ziwei-star-meta { font-weight: 400; color: var(--muted); font-size: 0.75rem; margin-left: 0.25rem; }
.ziwei-hua { color: #c62828; margin-left: 0.15rem; }

.ziwei-minors { margin-top: 0.2rem; }
.ziwei-minor { display: inline-block; margin-right: 0.3rem; font-size: 0.75rem; }
.ziwei-minor-ji { color: #2e7d32; }
.ziwei-minor-sha { color: #c62828; }
.ziwei-minor-lu { color: #b8860b; }
.ziwei-minor-ma { color: #1565c0; }

.ziwei-center {
  grid-area: 2 / 2 / 4 / 4;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: 0.9rem;
}
.ziwei-center p { margin: 0.2rem 0; }

.ziwei-decadal-bar { color: var(--muted); font-size: 0.9rem; }

.ziwei-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  padding: 1rem 1.25rem;
  margin: 1rem 0;
}

.ziwei-card h3 { margin-top: 0; }

.ziwei-card .status { color: var(--muted); font-size: 0.9rem; }

.ziwei-card .status.error { color: #b3261e; }

.ziwei-retry {
  background: none;
  border: 1px solid var(--accent);
  color: var(--accent);
  border-radius: 6px;
  padding: 0.25rem 1rem;
  font: inherit;
  cursor: pointer;
}

@keyframes ziwei-blink { 50% { opacity: 0.4; } }
.ziwei-card .status.loading { animation: ziwei-blink 1.2s infinite; }

.ziwei-faq h3 { margin-bottom: 0.25rem; }
```

- [ ] **Step 6: 运行测试**

Run: `npm test`
Expected: 全部通过（vendor 用例转绿）。

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 7: wrangler dev 冒烟验证**

```bash
npx wrangler dev
```

（后台运行后）

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/zh/ziwei/     # 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/en/ziwei/     # 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/assets/vendor/iztro.min.js   # 200
curl -s -X POST http://localhost:8787/api/ziwei/interpret -H "content-type: application/json" -d '{"part":"nope"}'   # {"ok":false,...invalid_request}
```

如有浏览器可用：打开 `http://localhost:8787/zh/ziwei/`，默认参数点「排盘」，核对 4×4 盘格（命宫在丑位、紫微(庙)+破军(旺)、身宫标记）、大限提示条「当前大限：丙戌（36-45 岁）」、三张解读卡进入 loading 态。英文页 `/en/ziwei/` 同验一遍（宫名/星名应为英文）。注意：wrangler dev 在 Windows 上须杀整棵进程树（taskkill //T），杀后 `netstat -ano | findstr 8787` 确认无 LISTENING。

- [ ] **Step 8: Commit**

```bash
git add public/assets/vendor/iztro.min.js public/assets/ziwei.js public/assets/style.css test/integration.test.ts
git commit -m "feat(ziwei): add iztro vendor fallback, board rendering and serial readings"
```

---

### Task 6: 文档同步

**Files:**
- Modify: `agents.md`
- Modify: `README.md`
- Modify: `docs/2026-08-17-tool-candidates-design.md`
- Modify: `docs/superpowers/specs/2026-08-18-ziwei-tool-design.md`

**Interfaces:**
- Consumes: 无
- Produces: 文档与代码现状一致（agents.md 是 AI 代理入口，必须准确）

- [ ] **Step 1: `agents.md` 目录树**

1a. 在 `xiaoliuren/` 行之后、`zeji/` 行之前（保持字母序则放在 zeji 之后亦可，与现有顺序保持一致即可）新增：

```
  ziwei/               紫微斗数解读模块：validate 请求校验 / prompt 提示词 / types 共享类型（零安星重算，命盘由前端 iztro 算好传入）
```

1b. `routes/zeji.ts` 行之后新增：

```
  routes/ziwei.ts      POST /api/ziwei/interpret：限流→校验→LLM→Markdown 返回
```

1c. `public/assets/` 总述行改为（补 ziwei.js 与 vendor、补 iztro 加载说明）：

```
public/assets/        静态资源（style.css、logo.png（印章 LOGO，兼作 favicon）、og-default.png、bazi.js、liuyao.js、meihua.js、xiaoliuren.js、zeji.js、ziwei.js、vendor/iztro.min.js），由 Workers assets 直接服务；bazi/liuyao/meihua/xiaoliuren/zeji 页面经 CDN 统一加载 lunar-javascript 1.7.7（cdnjs 主源 + staticfile 回退）；ziwei 页面经 unpkg → jsdelivr → 本地 vendor 三级链加载 iztro 2.6.0
```

1d. `zeji.js` 行之后新增：

```
  ziwei.js             前端 iztro 排盘 + 4×4 盘格渲染 + 三段串行解读渲染
```

- [ ] **Step 2: `agents.md` 核心约定第 6 条 API 实例**

该条末尾 `（见 \`src/routes/zeji.ts\`，错误码同 liuyao）。` 改为：

```
（见 `src/routes/zeji.ts`，错误码同 liuyao）；`POST /api/ziwei/interpret`（见 `src/routes/ziwei.ts`，错误码同 liuyao）。
```

- [ ] **Step 3: `agents.md` nav.ts 目录树描述**

`layout/nav.ts` 行改为：

```
  layout/nav.ts       品牌块（logo.png + 站名）+ 导航（含「命理」下拉：MINGLI_NAV_LABEL/MINGLI_NAV_ITEMS，八字排盘/紫微斗数，纯按钮无链接；「占卜」下拉：DIVINATION_NAV_LABEL/DIVINATION_NAV_ITEMS，六爻起卦/梅花易数/小六壬，标题链接 divination 总览页；「运势」下拉：FORTUNE_NAV_LABEL/FORTUNE_NAV_ITEMS，每日/每周/每月运势；三个下拉均纯 CSS）+ 语言切换
```

- [ ] **Step 4: `agents.md` FAQ 节已知边界**

「faqJsonLd 的 FAQPage mainEntity 已实现并有单测覆盖（择吉页首个使用，占卜总览页为第二例，上线后宜用 Google Rich Results Test 验证）」改为：

```
**已知边界**：`faqJsonLd` 的 FAQPage `mainEntity` 已实现并有单测覆盖（择吉页首个使用，占卜总览页第二例，紫微斗数页第三例，上线后宜用 Google Rich Results Test 验证）。
```

- [ ] **Step 5: `README.md` API 段**

`、`POST /api/zeji/interpret`（择吉日解读，见 `src/routes/zeji.ts`，限流 10 req/60s），后续 LLM 接口按同模式新增。` 改为：

```
、`POST /api/zeji/interpret`（择吉日解读，见 `src/routes/zeji.ts`，限流 10 req/60s）、`POST /api/ziwei/interpret`（紫微斗数解读，见 `src/routes/ziwei.ts`，限流 10 req/60s），后续 LLM 接口按同模式新增。
```

- [ ] **Step 6: 候选清单勾选**

`docs/2026-08-17-tool-candidates-design.md` 实施跟踪列表中 `- [ ] 紫微斗数` 改为 `- [x] 紫微斗数`。

- [ ] **Step 7: spec 状态**

`docs/superpowers/specs/2026-08-18-ziwei-tool-design.md` 头部 `- 状态：待实施` 改为 `- 状态：已实施`。

- [ ] **Step 8: Commit**

```bash
git add agents.md README.md docs/2026-08-17-tool-candidates-design.md docs/superpowers/specs/2026-08-18-ziwei-tool-design.md
git commit -m "docs: record ziwei tool rollout"
```

---

### Task 7: 最终验证

**Files:** 无新增

**Interfaces:**
- Consumes: 全部前序任务
- Produces: 可部署的最终状态确认

- [ ] **Step 1: 全量测试 + 类型检查**

Run: `npm test`
Expected: 全部通过（较开工前新增约 47 个用例：validate 19 + prompt 7 + api 8 + registry 2 + integration 11；既有 343 个保持通过）。

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 2: 交付核对清单**

逐项确认：

```bash
git log --oneline -7    # 六个新提交（Task 1-6）依次在列
git status              # 工作区干净
```

- `/zh/ziwei/` 与 `/en/ziwei/` 可访问，FAQPage JSON-LD 注入（集成测试已覆盖）
- 导航：首页 · [命理 ▾] · [占卜 ▾] · 择吉日 · [运势 ▾]；命理下拉为纯按钮无 href，子项八字排盘/紫微斗数
- 页脚工具列含紫微斗数
- `wrangler.jsonc` 含 ZIWEI_RATE_LIMITER（namespace 1006，10/60s）
- `public/assets/vendor/iztro.min.js` 已提交（约 787KB，版本 2.6.0 与 CDN 一致）
- 部署提醒：生产已有 LLM_API_KEY secret，无新增 secret；push main 即自动部署
