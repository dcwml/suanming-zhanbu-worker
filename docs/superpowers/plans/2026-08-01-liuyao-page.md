# 六爻起卦页面实施计划（2026-08-01）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增六爻起卦页面（`/zh/liuyao/`、`/en/liuyao/`），三步手动投币起卦，前端内置 64 卦权威文本表算卦并即时展示，后端 `POST /api/liuyao/interpret` 只校验 + 调 LLM 返回一段 Markdown 解读。

**Architecture:** 与八字页同构——前端原生 JS 单文件算卦/查表/展示，后端零算法只校验转发 LLM。卦辞文本全部在前端（单一来源），后端不重算卦象。先做一次共享 LLM 客户端的小重构（`callLlm` 提到 `src/llm.ts`），让两个解读接口共用。

**Tech Stack:** Hono + TypeScript（Cloudflare Workers），原生 JS（无构建），vitest（`@cloudflare/vitest-pool-workers`），marked + DOMPurify（CDN）。

**设计文档：** `docs/superpowers/specs/2026-08-01-liuyao-page-design.md`

---

## 文件结构总览

| 文件 | 操作 | 职责 |
|---|---|---|
| `src/llm.ts` | 新建 | 共享：`LlmEnv`、`RateLimiter`、`callLlm`、`LlmResult` |
| `src/bazi/llm.ts` | 改 | 改为从 `../llm` 转出（保持八字 import 路径不变） |
| `src/bazi/types.ts` | 改 | `BaziEnv extends LlmEnv`，删去重复字段，`RateLimiter` 改从 `../llm` 导入 |
| `src/liuyao/types.ts` | 新建 | `LiuyaoEnv`、`InterpretRequest` 及子类型 |
| `src/liuyao/validate.ts` | 新建 | 请求体校验纯函数 |
| `src/liuyao/prompt.ts` | 新建 | system / user prompt 构建纯函数 |
| `src/routes/liuyao.ts` | 新建 | `registerLiuyaoRoutes`：限流→体积→校验→LLM |
| `src/routes/api.ts` | 改 | 注册 liuyao 路由，app Bindings 类型覆盖两个限流器 |
| `src/content/liuyao.zh.html` | 新建 | 中文正文片段（三步骨架 + script 标签） |
| `src/content/liuyao.en.html` | 新建 | 英文正文片段 |
| `src/pages/registry.ts` | 改 | PAGES 加一条 liuyao |
| `public/assets/liuyao.js` | 新建 | 前端：64 卦文本表 + 算卦算法 + 交互 + 解读请求 |
| `public/assets/style.css` | 改 | liuyao 页样式 |
| `wrangler.jsonc` | 改 | ratelimits 加 `LIUYAO_RATE_LIMITER` |
| `test/fixtures/liuyao-request.ts` | 新建 | 合法请求体夹具 |
| `test/liuyao-validate.test.ts` | 新建 | 校验单测 |
| `test/liuyao-prompt.test.ts` | 新建 | prompt 单测 |
| `test/liuyao-api.test.ts` | 新建 | API 集成测试 |
| `test/integration.test.ts` | 改 | 补 liuyao 页 200 + 骨架断言 |

---

### Task 1: 提取共享 LLM 客户端

把 `callLlm` 从 bazi 模块提到共享模块，让六爻接口也能用。零行为变化，靠八字现有测试回归验证。

**Files:**
- Create: `src/llm.ts`
- Modify: `src/bazi/llm.ts`
- Modify: `src/bazi/types.ts`

- [ ] **Step 1: 创建 `src/llm.ts`**

把 `src/bazi/llm.ts` 的 `callLlm`、`LlmResult` 搬过来，新增 `LlmEnv` 与 `RateLimiter` 接口：

```ts
/** LLM 接口所需的环境变量（OpenAI 兼容接口） */
export interface LlmEnv {
  LLM_BASE_URL?: string;
  LLM_MODEL?: string;
  LLM_API_KEY?: string;
}

/** Cloudflare Rate Limiting 绑定的最小接口（不引入完整 workers-types） */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export type LlmResult =
  | { ok: true; content: string }
  | { ok: false; code: "not_configured" | "upstream_error" | "upstream_timeout"; status: 500 | 502 | 504 };

/**
 * 调用 OpenAI 兼容的 chat/completions 接口（非流式）。
 * timeoutMs 参数化便于测试注入短超时；生产默认 60 秒。
 */
export async function callLlm(
  env: LlmEnv,
  system: string,
  user: string,
  timeoutMs = 60_000,
): Promise<LlmResult> {
  const { LLM_BASE_URL, LLM_MODEL, LLM_API_KEY } = env;
  if (!LLM_BASE_URL || !LLM_MODEL || !LLM_API_KEY) {
    return { ok: false, code: "not_configured", status: 500 };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, code: "upstream_error", status: 502 };
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim() === "") {
      return { ok: false, code: "upstream_error", status: 502 };
    }
    return { ok: true, content };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, code: "upstream_timeout", status: 504 };
    }
    return { ok: false, code: "upstream_error", status: 502 };
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 2: 改 `src/bazi/llm.ts` 为纯转出**

整个文件替换为：

```ts
export { callLlm } from "../llm";
export type { LlmResult } from "../llm";
```

- [ ] **Step 3: 改 `src/bazi/types.ts`**

把 `BaziEnv` 改为继承 `LlmEnv`，删去重复的三个 LLM 字段；`RateLimiter` 改为从 `../llm` 导入（删去本地定义）。文件顶部 import 与 `BaziEnv` 改为：

```ts
import type { Lang } from "../config/site";
import type { LlmEnv, RateLimiter } from "../llm";

export type { RateLimiter } from "../llm";
```

（保留 `export type { RateLimiter }` 转出，使现有从 `bazi/types` 导入 `RateLimiter` 的代码不破坏。）

把原 `BaziEnv` 接口替换为：

```ts
export interface BaziEnv extends LlmEnv {
  BAZI_RATE_LIMITER?: RateLimiter;
}
```

删去原文件中的 `RateLimiter` 接口定义和 `BaziEnv` 里的三个 LLM 字段。其余类型（`Part`、`PillarData` 等）全部保留不动。

- [ ] **Step 4: 运行类型检查 + 全量测试回归**

Run: `npm run typecheck`
Expected: 无错误

Run: `npm test`
Expected: 全部通过（八字 12 个测试文件不受影响）

- [ ] **Step 5: Commit**

```bash
git add src/llm.ts src/bazi/llm.ts src/bazi/types.ts
git commit -m "refactor: extract shared callLlm to src/llm.ts for reuse"
```

---

### Task 2: 六爻类型定义

**Files:**
- Create: `src/liuyao/types.ts`

- [ ] **Step 1: 创建 `src/liuyao/types.ts`**

```ts
import type { Lang } from "../config/site";
import type { LlmEnv, RateLimiter } from "../llm";

export type { RateLimiter } from "../llm";

/** 一条动爻信息（position 从初爻=1 到上爻=6） */
export interface MovingLine {
  position: number;
  text: string;
}

/** 卦象文本（本卦或变卦） */
export interface HexagramText {
  name: string;
  statement: string;
}

export interface NowInfo {
  /** YYYY-MM-DD */
  solar: string;
}

export interface InterpretRequest {
  lang: Lang;
  question: string;
  /** 6 个爻值，每项 ∈ {6,7,8,9}（铜钱法） */
  lines: number[];
  now: NowInfo;
  primary: HexagramText;
  changed?: HexagramText;
  moving?: MovingLine[];
}

export interface LiuyaoEnv extends LlmEnv {
  LIUYAO_RATE_LIMITER?: RateLimiter;
}
```

- [ ] **Step 2: 类型检查**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/liuyao/types.ts
git commit -m "feat(liuyao): add shared type definitions"
```

---

### Task 3: 六爻请求校验（TDD）

**Files:**
- Create: `test/fixtures/liuyao-request.ts`
- Create: `src/liuyao/validate.ts`
- Create: `test/liuyao-validate.test.ts`

- [ ] **Step 1: 创建合法请求体夹具 `test/fixtures/liuyao-request.ts`**

```ts
import type { InterpretRequest } from "../../src/liuyao/types";

/**
 * 合法的六爻解读请求体夹具。
 * lines [7,9,8,6,7,8] → 本卦「雷水解」(40)，动爻在第 2、4 爻 → 变卦「雷风恒」(32)。
 * 每次调用返回全新对象，测试可安全修改。
 */
export function validRequest(): InterpretRequest {
  return {
    lang: "zh",
    question: "近期事业是否有转机",
    lines: [7, 9, 8, 6, 7, 8],
    now: { solar: "2026-08-01" },
    primary: {
      name: "雷水解",
      statement: "解：利西南；无所往，其来复吉；有攸往，夙吉。",
    },
    changed: {
      name: "雷风恒",
      statement: "恒：亨，无咎，利贞，利有攸往。",
    },
    moving: [
      { position: 2, text: "九二：田获三狐，得黄矢，贞吉。" },
      { position: 4, text: "九四：解而拇，朋至斯孚。" },
    ],
  };
}

/** 0 动爻请求体（lines 全静爻） */
export function staticRequest(): InterpretRequest {
  return {
    lang: "zh",
    question: "考试能否顺利通过",
    lines: [7, 7, 8, 8, 7, 8],
    now: { solar: "2026-08-01" },
    primary: {
      name: "雷水解",
      statement: "解：利西南；无所往，其来复吉；有攸往，夙吉。",
    },
  };
}
```

- [ ] **Step 2: 写失败测试 `test/liuyao-validate.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { validateInterpretRequest } from "../src/liuyao/validate";
import { validRequest, staticRequest } from "./fixtures/liuyao-request";

describe("validateInterpretRequest", () => {
  it("accepts a valid request with moving lines", () => {
    expect(validateInterpretRequest(validRequest()).ok).toBe(true);
  });

  it("accepts a valid request with 0 moving lines (no changed/moving)", () => {
    expect(validateInterpretRequest(staticRequest()).ok).toBe(true);
  });

  it("accepts empty moving array as equivalent to absent", () => {
    const body = validRequest();
    body.moving = [];
    delete body.changed;
    expect(validateInterpretRequest(body).ok).toBe(true);
  });

  it("rejects non-object body", () => {
    expect(validateInterpretRequest("nope").ok).toBe(false);
    expect(validateInterpretRequest(null).ok).toBe(false);
  });

  it("rejects lines with wrong length", () => {
    const body = validRequest();
    (body as { lines: number[] }).lines = [7, 8, 9];
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects lines with invalid value (5)", () => {
    const body = validRequest();
    (body as { lines: number[] }).lines = [7, 5, 8, 6, 7, 8];
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects empty question", () => {
    const body = validRequest();
    body.question = "";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects overlong question (>200 chars)", () => {
    const body = validRequest();
    body.question = "事".repeat(201);
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects unknown lang", () => {
    const body = validRequest();
    (body as { lang: string }).lang = "fr";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects malformed now.solar", () => {
    const body = validRequest();
    body.now.solar = "2026/08/01";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects missing primary", () => {
    const body = validRequest();
    delete (body as { primary?: unknown }).primary;
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects overlong primary.statement (>300 chars)", () => {
    const body = validRequest();
    body.primary.statement = "字".repeat(301);
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects moving item with invalid position (0)", () => {
    const body = validRequest();
    body.moving = [{ position: 0, text: "text" }];
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects moving item with invalid position (7)", () => {
    const body = validRequest();
    body.moving = [{ position: 7, text: "text" }];
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects moving array longer than 6", () => {
    const body = validRequest();
    body.moving = Array.from({ length: 7 }, (_, i) => ({ position: i + 1, text: "t" }));
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("does not echo user input in error message", () => {
    const body = validRequest();
    body.question = "我的秘密问题uniqueToken123";
    (body as { lines: number[] }).lines = [1, 2, 3, 4, 5, 6];
    const r = validateInterpretRequest(body);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).not.toContain("uniqueToken123");
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npx vitest run test/liuyao-validate.test.ts`
Expected: FAIL（`validateInterpretRequest` 不存在 / 全部 error）

- [ ] **Step 4: 创建 `src/liuyao/validate.ts`**

```ts
import { LANGS } from "../config/site";
import type { InterpretRequest } from "./types";

const VALID_LINES = new Set([6, 7, 8, 9]);
const MAX_QUESTION = 200;
const MAX_TEXT = 300;

type Result = { ok: true; value: InterpretRequest } | { ok: false; message: string };

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isNonEmptyStr(v: unknown, max: number): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= max;
}
function fail(message: string): Result {
  return { ok: false, message };
}

export function validateInterpretRequest(body: unknown): Result {
  if (!isObj(body)) return fail("body must be a JSON object");
  if (typeof body.lang !== "string" || !(LANGS as readonly string[]).includes(body.lang))
    return fail("lang must be zh or en");
  if (!isNonEmptyStr(body.question, MAX_QUESTION)) return fail("question is invalid");

  // lines：长度 6 且每项 ∈ {6,7,8,9}
  if (!Array.isArray(body.lines) || body.lines.length !== 6) return fail("lines must be an array of 6 items");
  for (const v of body.lines as unknown[]) {
    if (typeof v !== "number" || !VALID_LINES.has(v)) return fail("lines contains an invalid value");
  }

  // now.solar
  const now = body.now;
  if (!isObj(now) || typeof now.solar !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(now.solar))
    return fail("now.solar must be YYYY-MM-DD");

  // primary（必填）
  const p = checkHexText(body.primary);
  if (p) return fail(p);

  // changed（可选）
  if (body.changed !== undefined) {
    const c = checkHexText(body.changed);
    if (c) return fail(c);
  }

  // moving（可选，空数组等价于省略）
  if (body.moving !== undefined && (!Array.isArray(body.moving) || body.moving.length > 6))
    return fail("moving must be an array of at most 6 items");
  if (Array.isArray(body.moving)) {
    for (const m of body.moving as unknown[]) {
      if (!isObj(m)) return fail("moving item is invalid");
      if (typeof m.position !== "number" || m.position < 1 || m.position > 6 || !Number.isInteger(m.position))
        return fail("moving.position is invalid");
      if (!isNonEmptyStr(m.text, MAX_TEXT)) return fail("moving.text is invalid");
    }
  }

  return { ok: true, value: body as unknown as InterpretRequest };
}

function checkHexText(v: unknown): string | null {
  if (!isObj(v)) return "hexagram text must be an object";
  if (!isNonEmptyStr(v.name, MAX_TEXT)) return "hexagram name is invalid";
  if (!isNonEmptyStr(v.statement, MAX_TEXT)) return "hexagram statement is invalid";
  return null;
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npx vitest run test/liuyao-validate.test.ts`
Expected: PASS（全部通过）

- [ ] **Step 6: 类型检查 + Commit**

Run: `npm run typecheck`
Expected: 无错误

```bash
git add src/liuyao/validate.ts test/liuyao-validate.test.ts test/fixtures/liuyao-request.ts
git commit -m "feat(liuyao): add request validation with tests"
```

---

### Task 4: 六爻 prompt 构建（TDD）

**Files:**
- Create: `src/liuyao/prompt.ts`
- Create: `test/liuyao-prompt.test.ts`

- [ ] **Step 1: 写失败测试 `test/liuyao-prompt.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "../src/liuyao/prompt";
import { validRequest, staticRequest } from "./fixtures/liuyao-request";

describe("buildSystemPrompt", () => {
  it("zh prompt asks for Markdown output in Chinese", () => {
    const s = buildSystemPrompt("zh");
    expect(s).toContain("Markdown");
    expect(s).toContain("中文");
  });

  it("en prompt asks for English output", () => {
    const s = buildSystemPrompt("en");
    expect(s).toContain("Markdown");
    expect(s).toContain("English");
  });
});

describe("buildUserPrompt", () => {
  it("includes question, primary hexagram, moving lines, changed hexagram, and date", () => {
    const req = validRequest();
    const p = buildUserPrompt(req);
    expect(p).toContain(req.question);
    expect(p).toContain("雷水解");
    expect(p).toContain("九二：田获三狐");
    expect(p).toContain("雷风恒");
    expect(p).toContain("2026-08-01");
  });

  it("omits moving/changed sections for 0 moving lines", () => {
    const req = staticRequest();
    const p = buildUserPrompt(req);
    expect(p).toContain("雷水解");
    // 没有动爻时不应出现"变卦"相关段落标题
    expect(p).not.toContain("变卦");
    expect(p).not.toContain("动爻");
  });

  it("en prompt keeps chinese hexagram names", () => {
    const req = validRequest();
    req.lang = "en";
    const p = buildUserPrompt(req);
    expect(p).toContain("雷水解");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/liuyao-prompt.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 创建 `src/liuyao/prompt.ts`**

```ts
import type { Lang } from "../config/site";
import type { InterpretRequest } from "./types";

export function buildSystemPrompt(lang: Lang): string {
  if (lang === "zh") {
    return [
      "你是一位精通《周易》占法的占卜大师，熟悉六十四卦卦辞、爻辞与变卦占断。",
      "规则：",
      "1. 只基于用户提供的卦象、卦辞、爻辞与变卦资料进行分析，不要重新起卦或质疑数据。",
      "2. 用 Markdown 输出（可用二三级标题、列表、粗体），不要输出代码块。",
      "3. 语气客观温和，多讲趋势与建议，避免绝对化断言。",
      "4. 不提供医疗、法律、投资等专业建议；涉及健康财务话题只做泛化提醒。",
      "5. 全文使用中文。",
    ].join("\n");
  }
  return [
    "You are a master of the I Ching (Book of Changes) divination, fluent in the 64 hexagram statements, line texts, and transformed-hexagram interpretation.",
    "Rules:",
    "1. Analyse only the hexagram data provided by the user; never recast or question it.",
    "2. Output Markdown (h2/h3 headings, lists, bold), no code blocks.",
    "3. Keep an objective, gentle tone; describe tendencies and advice, avoid absolute claims.",
    "4. No medical, legal or investment advice; only general reminders on such topics.",
    "5. Respond entirely in English. Keep hexagram names in Chinese characters followed by a short English gloss, e.g. 雷水解 (Deliverance).",
  ].join("\n");
}

export function buildUserPrompt(req: InterpretRequest): string {
  const moving = req.moving && req.moving.length > 0 ? req.moving : [];
  const hasMoving = moving.length > 0;

  const blocks: string[] = [];

  blocks.push(`所求之事：${req.question}`);
  blocks.push(`起卦公历日期：${req.now.solar}`);

  blocks.push(`本卦：${req.primary.name}\n卦辞：${req.primary.statement}`);

  if (hasMoving) {
    const linesText = moving
      .map((m) => `第${m.position}爻（${positionName(m.position, req.lang)}）：${m.text}`)
      .join("\n");
    blocks.push(`动爻爻辞：\n${linesText}`);
    if (req.changed) {
      blocks.push(`变卦：${req.changed.name}\n卦辞：${req.changed.statement}`);
    }
  }

  if (req.lang === "zh") {
    const task = hasMoving
      ? "请综合以上卦象、动爻爻辞与变卦，解读所问之事的吉凶趋势与建议。先点明本卦总体含义与所问之事的关联，再据各动爻爻辞论变化趋势，最后以变卦指示最终走向。500 字左右。"
      : "请基于本卦卦辞，解读所问之事的吉凶趋势与建议。先点明卦象总体含义与所问之事的关联，再给出具体建议。400 字左右。";
    blocks.push(task);
  } else {
    const task = hasMoving
      ? "Synthesise the primary hexagram, the moving line texts, and the transformed hexagram to interpret the outlook and advice for the question asked. Start with the overall meaning of the primary hexagram in relation to the question, then analyse the changing trends indicated by the moving lines, and conclude with the direction shown by the transformed hexagram. About 400 words."
      : "Based on the primary hexagram statement, interpret the outlook and advice for the question asked. Start with the overall meaning in relation to the question, then give specific advice. About 300 words.";
    blocks.push(task);
  }

  return blocks.join("\n\n");
}

/** 爻位中文名（1=初爻 … 6=上爻） */
function positionName(position: number, lang: Lang): string {
  if (lang === "en") return `line ${position}`;
  const names = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];
  return names[position - 1] ?? `${position}爻`;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/liuyao-prompt.test.ts`
Expected: PASS

- [ ] **Step 5: 类型检查 + Commit**

Run: `npm run typecheck`
Expected: 无错误

```bash
git add src/liuyao/prompt.ts test/liuyao-prompt.test.ts
git commit -m "feat(liuyao): add prompt builders with tests"
```

---

### Task 5: 六爻 API 路由（TDD）

**Files:**
- Create: `src/routes/liuyao.ts`
- Modify: `src/routes/api.ts`
- Modify: `wrangler.jsonc`
- Create: `test/liuyao-api.test.ts`

- [ ] **Step 1: 写失败测试 `test/liuyao-api.test.ts`**

```ts
import { fetchMock } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { api } from "../src/routes/api";
import type { LiuyaoEnv } from "../src/liuyao/types";
import { validRequest } from "./fixtures/liuyao-request";

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});
afterEach(() => {
  fetchMock.assertNoPendingInterceptors();
});

const baseEnv: LiuyaoEnv = {
  LLM_BASE_URL: "https://apihub.agnes-ai.cn",
  LLM_MODEL: "agnes-2.0-flash",
  LLM_API_KEY: "test-key",
};

function allowLimiter(success: boolean): LiuyaoEnv["LIUYAO_RATE_LIMITER"] {
  return { limit: async () => ({ success }) };
}

function req(body: unknown): Request {
  return new Request("http://localhost/api/liuyao/interpret", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "1.2.3.4" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/liuyao/interpret", () => {
  it("returns markdown on success", async () => {
    fetchMock
      .get("https://apihub.agnes-ai.cn")
      .intercept({ path: "/v1/chat/completions", method: "POST" })
      .reply(200, { choices: [{ message: { content: "## 卦象解读\n内容" } }] });
    const res = await api.fetch(req(validRequest()), { ...baseEnv, LIUYAO_RATE_LIMITER: allowLimiter(true) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; data: { markdown: string } };
    expect(json.ok).toBe(true);
    expect(json.data.markdown).toContain("卦象解读");
  });

  it("works without rate limiter binding (local dev)", async () => {
    fetchMock
      .get("https://apihub.agnes-ai.cn")
      .intercept({ path: "/v1/chat/completions", method: "POST" })
      .reply(200, { choices: [{ message: { content: "ok" } }] });
    const res = await api.fetch(req(validRequest()), baseEnv);
    expect(res.status).toBe(200);
  });

  it("returns 429 when rate limited", async () => {
    const res = await api.fetch(req(validRequest()), { ...baseEnv, LIUYAO_RATE_LIMITER: allowLimiter(false) });
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
    const body = validRequest();
    (body as { lines: number[] }).lines = [1, 2, 3, 4, 5, 6];
    body.question = "secretTokenXYZ";
    const res = await api.fetch(req(body), baseEnv);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string; message: string } };
    expect(json.error.code).toBe("invalid_request");
    expect(json.error.message).not.toContain("secretTokenXYZ");
  });

  it("returns 413 when body exceeds 8KB", async () => {
    const body = validRequest();
    body.question = "字".repeat(200);
    const res = await api.fetch(req(JSON.stringify(body) + " ".repeat(9000)), baseEnv);
    expect(res.status).toBe(413);
  });

  it("returns 500 not_configured when llm key missing", async () => {
    const res = await api.fetch(req(validRequest()), {});
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("not_configured");
  });

  it("maps upstream failure to 502", async () => {
    fetchMock
      .get("https://apihub.agnes-ai.cn")
      .intercept({ path: "/v1/chat/completions", method: "POST" })
      .reply(500, "boom");
    const res = await api.fetch(req(validRequest()), baseEnv);
    expect(res.status).toBe(502);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("upstream_error");
  });
});
```

> **注意**：上面的 `baseEnv` 用了 `LLM_BASE_URL: "https://apihub.agnes-ai.cn"`（当前 `wrangler.jsonc` 中的值）。如果 fetchMock 拦截的域名与实际 env 不一致，测试会 hang。请确认 `wrangler.jsonc` 中 `LLM_BASE_URL` 与测试一致；八字 API 测试用的是 `https://apihub.agnes-ai.com`（旧值），六爻测试用当前 wrangler.jsonc 的值。

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/liuyao-api.test.ts`
Expected: FAIL（路由 404 / 未注册）

- [ ] **Step 3: 创建 `src/routes/liuyao.ts`**

```ts
import type { Hono } from "hono";
import { callLlm } from "../llm";
import { buildSystemPrompt, buildUserPrompt } from "../liuyao/prompt";
import type { LiuyaoEnv } from "../liuyao/types";
import { validateInterpretRequest } from "../liuyao/validate";

const MAX_BODY_BYTES = 8 * 1024;

function err(code: string, message: string) {
  return { ok: false as const, error: { code, message } };
}

/** 注册六爻解读路由（在 api 子应用内，basePath 已是 /api） */
export function registerLiuyaoRoutes(api: Hono<{ Bindings: LiuyaoEnv }>): void {
  api.post("/liuyao/interpret", async (c) => {
    // 1. 限流（绑定缺失则跳过，本地 dev / 测试环境可用）
    const limiter = c.env?.LIUYAO_RATE_LIMITER;
    if (limiter) {
      const ip = c.req.header("cf-connecting-ip") ?? "unknown";
      const { success } = await limiter.limit({ key: ip });
      if (!success) return c.json(err("rate_limited", "Too many requests, please retry later."), 429);
    }

    // 2. 体积上限
    const raw = await c.req.text();
    if (raw.length > MAX_BODY_BYTES) return c.json(err("payload_too_large", "Request body too large."), 413);

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return c.json(err("invalid_json", "Request body must be valid JSON."), 400);
    }

    // 3. 校验
    const v = validateInterpretRequest(body);
    if (!v.ok) return c.json(err("invalid_request", v.message), 400);

    // 4. 组提示词 → 调 LLM
    const r = await callLlm(c.env ?? {}, buildSystemPrompt(v.value.lang), buildUserPrompt(v.value));
    if (!r.ok) {
      const messages: Record<typeof r.code, string> = {
        not_configured: "Service is not configured.",
        upstream_error: "Service returned an error, please retry.",
        upstream_timeout: "Service timed out, please retry.",
      };
      return c.json(err(r.code, messages[r.code]), r.status);
    }
    return c.json({ ok: true, data: { markdown: r.content } });
  });
}
```

- [ ] **Step 4: 在 `src/routes/api.ts` 注册路由并更新 Bindings 类型**

在 `src/routes/api.ts` 中：

1. 顶部增加 import：

```ts
import { registerLiuyaoRoutes } from "./liuyao";
import type { LiuyaoEnv } from "../liuyao/types";
```

2. 把 app 类型改为覆盖两个限流器的交集类型：

```ts
export const api = new Hono<{ Bindings: BaziEnv & LiuyaoEnv }>().basePath("/api");
```

3. 在 `registerBaziRoutes(api);` 之后、兜底 `api.all("*", ...)` 之前加：

```ts
registerLiuyaoRoutes(api);
```

> **类型说明**：如果 Hono 泛型协变导致 `registerBaziRoutes` / `registerLiuyaoRoutes` 的参数类型报错，把两个注册函数签名改为泛型：`export function registerXxxRoutes<E extends XxxEnv>(api: Hono<{ Bindings: E }>): void`。先按交集类型试，typecheck 报错再改泛型。

- [ ] **Step 5: 在 `wrangler.jsonc` 的 `ratelimits` 数组加一条**

在现有 `BAZI_RATE_LIMITER` 条目后加：

```jsonc
,
{
  "name": "LIUYAO_RATE_LIMITER",
  "namespace_id": "1002",
  "simple": { "limit": 10, "period": 60 }
}
```

- [ ] **Step 6: 运行 API 测试确认通过**

Run: `npx vitest run test/liuyao-api.test.ts`
Expected: PASS

- [ ] **Step 7: 全量测试 + 类型检查**

Run: `npm test`
Expected: 全部通过（含八字回归）

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 8: Commit**

```bash
git add src/routes/liuyao.ts src/routes/api.ts wrangler.jsonc test/liuyao-api.test.ts
git commit -m "feat(liuyao): add POST /api/liuyao/interpret route with rate limit and tests"
```

---

### Task 6: 页面正文片段 + 注册（TDD）

**Files:**
- Create: `src/content/liuyao.zh.html`
- Create: `src/content/liuyao.en.html`
- Modify: `src/pages/registry.ts`
- Modify: `test/integration.test.ts`

- [ ] **Step 1: 创建 `src/content/liuyao.zh.html`**

```html
<div class="liuyao-app" id="liuyao-app" data-lang="zh">
  <h1>六爻起卦</h1>
  <p class="lead">备好三枚铜钱或硬币，静心凝神，手动投掷六次起卦，获取周易卦辞解读。</p>

  <section class="liuyao-step" id="liuyao-step1">
    <h2>第一步 · 准备</h2>
    <p class="liuyao-guide">准备三枚相同的铜钱或硬币。静心凝神，集中意念于所问之事。</p>
    <p class="liuyao-rules">投掷规则：三枚同时投掷；若硬币立起则作废重投；每次记录结果，共投掷六次（从初爻到上爻）。</p>
    <label class="liuyao-question-label">所求之事
      <input type="text" id="liuyao-question" maxlength="200" placeholder="例如：近期事业是否有转机" required>
    </label>
  </section>

  <section class="liuyao-step" id="liuyao-step2">
    <h2>第二步 · 投掷录入</h2>
    <fieldset class="liuyao-field">
      <legend>规定正反</legend>
      <select id="liuyao-coindef">
        <option value="default" selected>有字/图案面 = 字（阴），另一面 = 背（阳）</option>
        <option value="flipped">有字/图案面 = 背（阳），另一面 = 字（阴）</option>
      </select>
    </fieldset>
    <div id="liuyao-lines"></div>
    <div class="liuyao-preview" id="liuyao-preview" aria-live="polite"></div>
  </section>

  <section class="liuyao-step" id="liuyao-step3">
    <h2>第三步 · 结果与解读</h2>
    <div id="liuyao-result" hidden></div>
    <button type="button" id="liuyao-interpret-btn" hidden>开始解读</button>
    <section id="liuyao-interpret" class="liuyao-interpret" hidden>
      <p class="liuyao-disclaimer">以下解读仅供娱乐参考，不构成任何专业建议。</p>
      <article class="liuyao-card"><div class="liuyao-card-body"></div></article>
    </section>
    <p class="liuyao-error" id="liuyao-error" role="alert" hidden></p>
  </section>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js" defer></script>
<script src="/assets/liuyao.js" defer></script>
```

- [ ] **Step 2: 创建 `src/content/liuyao.en.html`**

结构完全相同，文案改为英文：

```html
<div class="liuyao-app" id="liuyao-app" data-lang="en">
  <h1>I Ching Hexagram Casting</h1>
  <p class="lead">Prepare three coins, focus your mind, cast six times, and receive an I Ching hexagram reading.</p>

  <section class="liuyao-step" id="liuyao-step1">
    <h2>Step 1 · Preparation</h2>
    <p class="liuyao-guide">Prepare three identical coins. Calm your mind and focus on what you wish to ask.</p>
    <p class="liuyao-rules">Casting rules: toss all three coins together; if a coin lands on its edge, redo that toss; record each result, six tosses in total (from the bottom line to the top).</p>
    <label class="liuyao-question-label">Your question
      <input type="text" id="liuyao-question" maxlength="200" placeholder="e.g. Will my career improve soon?" required>
    </label>
  </section>

  <section class="liuyao-step" id="liuyao-step2">
    <h2>Step 2 · Record Tosses</h2>
    <fieldset class="liuyao-field">
      <legend>Define coin sides</legend>
      <select id="liuyao-coindef">
        <option value="default" selected>Inscribed/heads side = Yin, other side = Yang</option>
        <option value="flipped">Inscribed/heads side = Yang, other side = Yin</option>
      </select>
    </fieldset>
    <div id="liuyao-lines"></div>
    <div class="liuyao-preview" id="liuyao-preview" aria-live="polite"></div>
  </section>

  <section class="liuyao-step" id="liuyao-step3">
    <h2>Step 3 · Result &amp; Reading</h2>
    <div id="liuyao-result" hidden></div>
    <button type="button" id="liuyao-interpret-btn" hidden>Start Reading</button>
    <section id="liuyao-interpret" class="liuyao-interpret" hidden>
      <p class="liuyao-disclaimer">Readings are for entertainment purposes only and do not constitute professional advice.</p>
      <article class="liuyao-card"><div class="liuyao-card-body"></div></article>
    </section>
    <p class="liuyao-error" id="liuyao-error" role="alert" hidden></p>
  </section>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js" defer></script>
<script src="/assets/liuyao.js" defer></script>
```

- [ ] **Step 3: 在 `src/pages/registry.ts` 注册**

1. 顶部增加 import（在 bazi import 之后）：

```ts
import liuyaoZh from "../content/liuyao.zh.html";
import liuyaoEn from "../content/liuyao.en.html";
```

2. 在 `PAGES` 数组中 bazi 条目之后加一条：

```ts
  {
    slug: "liuyao",
    inNav: true,
    meta: {
      zh: { title: "六爻起卦", description: "在线六爻起卦：铜钱摇卦、周易卦辞，AI 智能解读吉凶趋势。" },
      en: { title: "I Ching Casting", description: "Free online I Ching coin-toss hexagram casting with AI-powered readings." },
    },
    content: { zh: liuyaoZh, en: liuyaoEn },
  },
```

- [ ] **Step 4: 补集成测试 `test/integration.test.ts`**

在文件末尾 `});` 之前加一个新 describe 块：

```ts
describe("liuyao page", () => {
  it("serves /zh/liuyao/ with form skeleton and scripts", async () => {
    const res = await SELF.fetch("http://localhost/zh/liuyao/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('id="liuyao-app"');
    expect(html).toContain("/assets/liuyao.js");
  });

  it("serves /en/liuyao/ in English", async () => {
    const res = await SELF.fetch("http://localhost/en/liuyao/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('data-lang="en"');
  });
});
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test`
Expected: 全部通过（含 registry.test.ts 自动覆盖双语 meta/content 校验、sitemap 自动覆盖）

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add src/content/liuyao.zh.html src/content/liuyao.en.html src/pages/registry.ts test/integration.test.ts
git commit -m "feat(liuyao): register bilingual liuyao page with three-step skeleton"
```

---

### Task 7: 前端 `public/assets/liuyao.js`

前端单文件，包含：i18n 文案、64 卦文本表、算卦纯函数、三步交互逻辑、解读请求。无自动化测试，靠 `npm run dev` 手工验证。

**Files:**
- Create: `public/assets/liuyao.js`

- [ ] **Step 1: 创建 `public/assets/liuyao.js`**

文件结构（按注释分块）。先写算法与交互骨架（不含完整 64 卦文本——先用占位最小集让页面跑通），下一步再填充文本表。

```js
/* 六爻起卦页脚本：手动投掷录入 → 算卦排盘 → 查表 → 请求周易解读 */
(function () {
  "use strict";

  var app = document.getElementById("liuyao-app");
  if (!app) return;
  var LANG = app.dataset.lang === "en" ? "en" : "zh";

  /* ---------- i18n 文案 ---------- */
  var T = {
    zh: {
      lineLabels: ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"],
      options: ["三字（老阴 6）", "两字一背（少阳 7）", "一字两背（少阴 8）", "三背（老阳 9）"],
      optionValues: [6, 7, 8, 9],
      primary: "本卦", changed: "变卦", movingMark: "动",
      resultTitle: "投掷结果", interpretBtn: "开始解读",
      loading: "正在解读…", retry: "重试", failed: "解读失败：",
      noQuestion: "请先输入所求之事",
      notComplete: "请完成六次投掷录入",
      mdLibLoading: "解读组件未完全加载，请稍后重试",
    },
    en: {
      lineLabels: ["Line 1", "Line 2", "Line 3", "Line 4", "Line 5", "Line 6"],
      options: ["3 inscribed (Old Yin 6)", "2 inscribed 1 other (Young Yang 7)", "1 inscribed 2 other (Young Yin 8)", "3 other (Old Yang 9)"],
      optionValues: [6, 7, 8, 9],
      primary: "Primary Hexagram", changed: "Changed Hexagram", movingMark: "M",
      resultTitle: "Casting Result", interpretBtn: "Start Reading",
      loading: "Interpreting…", retry: "Retry", failed: "Reading failed: ",
      noQuestion: "Please enter your question first",
      notComplete: "Please complete all six tosses",
      mdLibLoading: "Reading components not fully loaded, please retry later",
    },
  }[LANG];

  /* ---------- 算卦纯函数 ---------- */

  /* 经卦二进制值（bottom→top，yang=1 yin=0）：
     坤0 震1 坎2 兌3 艮4 離5 巽6 乾7 */
  var TRIGRAM_NAMES = {
    zh: { 0: "坤", 1: "震", 2: "坎", 3: "兌", 4: "艮", 5: "離", 6: "巽", 7: "乾" },
    en: { 0: "Kun 坤", 1: "Zhen 震", 2: "Kan 坎", 3: "Dui 兌", 4: "Gen 艮", 5: "Li 離", 6: "Xun 巽", 7: "Qian 乾" },
  };

  /* King Wen 序号查找表：TABLE[lowerBinary][upperBinary] = 1-64 */
  var KING_WEN = [
    [2, 16, 8, 45, 23, 35, 20, 12],
    [24, 51, 3, 17, 27, 21, 42, 25],
    [7, 40, 29, 47, 4, 64, 59, 6],
    [19, 54, 60, 58, 41, 38, 61, 10],
    [15, 62, 39, 31, 52, 56, 53, 33],
    [36, 55, 63, 49, 22, 30, 37, 13],
    [46, 32, 48, 28, 18, 50, 57, 44],
    [11, 34, 5, 43, 26, 14, 9, 1],
  ];

  function isYang(v) { return v === 7 || v === 9; }

  /** 由 6 个爻值算下/上经卦二进制索引 */
  function trigramIndex(lines, start) {
    return (isYang(lines[start]) ? 1 : 0) + (isYang(lines[start + 1]) ? 2 : 0) + (isYang(lines[start + 2]) ? 4 : 0);
  }

  /** 本卦 King Wen 序号 (1-64) */
  function primaryNo(lines) {
    return KING_WEN[trigramIndex(lines, 0)][trigramIndex(lines, 3)];
  }

  /** 动爻位号数组（1=初爻…6=上爻） */
  function movingPositions(lines) {
    var pos = [];
    for (var i = 0; i < 6; i++) if (lines[i] === 6 || lines[i] === 9) pos.push(i + 1);
    return pos;
  }

  /** 变卦爻值（6→7, 9→8, 静爻不变） */
  function transformLines(lines) {
    return lines.map(function (v) {
      if (v === 6) return 7;
      if (v === 9) return 8;
      return v;
    });
  }

  /** 变卦 King Wen 序号（无动爻时返回 null） */
  function changedNo(lines) {
    var m = movingPositions(lines);
    if (m.length === 0) return null;
    var t = transformLines(lines);
    return KING_WEN[trigramIndex(t, 0)][trigramIndex(t, 3)];
  }

  /* ---------- 64 卦文本表 ----------
     每条：{ symbol, name:{zh,en}, statement:{zh,en}, lines:{zh:[6],en:[6]} }
     索引 0-63 对应序号 1-64。文本据《周易》通行本（如"周易正义"）逐卦填写。
     下方先放乾/坤/解/恒四卦完整样例，其余 60 卦按同一结构补全。
  */
  var HEXAGRAMS = [
    /* 1 乾 */ { symbol: "䷀", name: { zh: "乾为天", en: "Qian (The Creative)" }, statement: { zh: "乾：元，亨，利，贞。", en: "Qian: Sublime success. Furthering through perseverance." }, lines: { zh: ["初九：潜龙勿用。","九二：见龙在田，利见大人。","九三：君子终日乾乾，夕惕若厉，无咎。","九四：或跃在渊，无咎。","九五：飞龙在天，利见大人。","上九：亢龙有悔。"], en: ["Line 1: Hidden dragon. Do not act.","Line 2: Dragon appearing in the field. It furthers one to see the great person.","Line 3: All day active, at night still cautious. Blameless.","Line 4: Wavering flight over the depths. Blameless.","Line 5: Flying dragon in the heavens. It furthers one to see the great person.","Line 6: Arrogant dragon will have cause to repent."] } },
    /* 2 坤 */ { symbol: "䷁", name: { zh: "坤为地", en: "Kun (The Receptive)" }, statement: { zh: "坤：元，亨，利牝马之贞。", en: "Kun: Sublime success through the perseverance of a mare." }, lines: { zh: ["初六：履霜，坚冰至。","六二：直，方，大，不习无不利。","六三：含章可贞。","六四：括囊，无咎无誉。","六五：黄裳，元吉。","上六：龙战于野，其血玄黄。"], en: ["Line 1: Treading on hoarfrost — solid ice is not far.","Line 2: Straight, square, great. Without effort, all is favorable.","Line 3: Hidden lines, one is able to remain persevering.","Line 4: Tied-up sack. No blame, no praise.","Line 5: Yellow lower garment. Supreme good fortune.","Line 6: Dragons fight in the meadow. Their blood is black and yellow."] } },
    /* … 3-39 据通行本补全 … */
    /* 40 解 */ { symbol: "䷧", name: { zh: "雷水解", en: "Xie (Deliverance)" }, statement: { zh: "解：利西南；无所往，其来复吉；有攸往，夙吉。", en: "Deliverance: The southwest furthers. If there is nowhere to go, return brings good fortune. If there is a goal, early action brings good fortune." }, lines: { zh: ["初六：无咎。","九二：田获三狐，得黄矢，贞吉。","六三：负且乘，致寇至，贞吝。","九四：解而拇，朋至斯孚。","六五：君子维有解，吉。","上六：公用射隼于高墉之上，获之，无不利。"], en: ["Line 1: No blame.","Line 2: Killing three foxes in the hunt, receiving a yellow arrow. Perseverance brings good fortune.","Line 3: Carrying a burden on a carriage — inviting robbers. Perseverance brings humiliation.","Line 4: Deliverance from your big toe. Friends arrive whom you can trust.","Line 5: The superior person delivers those bound. Good fortune.","Line 6: The prince shoots a hawk atop a high wall and kills it. All is favorable."] } },
    /* … 41-63 据通行本补全 … */
    /* 32 恒 */ { symbol: "䷟", name: { zh: "雷风恒", en: "Heng (Duration)" }, statement: { zh: "恒：亨，无咎，利贞，利有攸往。", en: "Duration: Success. No blame. Perseverance furthers. It furthers one to have goals." }, lines: { zh: ["初六：浚恒，贞凶。","九二：悔亡。","九三：不恒其德，或承之羞，贞吝。","九四：田无禽。","六五：恒其德，贞，妇人吉，夫子凶。","上六：振恒，凶。"], en: ["Line 1: Seeking duration too deeply. Perseverance brings misfortune.","Line 2: Remorse disappears.","Line 3: Not preserving one's virtue — disgrace follows. Perseverance brings humiliation.","Line 4: No game in the hunt.","Line 5: Preserving one's virtue — good for a wife, misfortune for a husband.","Line 6: Restlessness as a lasting condition. Misfortune."] } },
  ];

  // 确保数组索引与序号对齐（用辅助函数按 no 取卦）
  function hexByNo(no) {
    return HEXAGRAMS.find(function (h, i) { return i + 1 === no; });
  }
  /* TODO(填表): 上方 HEXAGRAMS 只含样例卦。补全全部 64 卦后，
     确保 HEXAGRAMS 数组长度 === 64，索引 0 对应序号 1（乾），
     索引 63 对应序号 64（未济）。每卦结构与乾/坤/解/恒完全一致。 */

  function resolveReading(lines) {
    var pn = primaryNo(lines);
    var cn = changedNo(lines);
    var moving = movingPositions(lines);
    var p = hexByNo(pn);
    var c = cn ? hexByNo(cn) : null;
    return {
      primary: {
        no: pn, symbol: p.symbol, name: p.name[LANG], statement: p.statement[LANG],
        lowerTrigram: TRIGRAM_NAMES[LANG][trigramIndex(lines, 0)],
        upperTrigram: TRIGRAM_NAMES[LANG][trigramIndex(lines, 3)],
      },
      changed: c ? { no: cn, symbol: c.symbol, name: c.name[LANG], statement: c.statement[LANG] } : null,
      moving: moving.map(function (pos) { return { position: pos, text: p.lines[LANG][pos - 1] }; }),
    };
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  /* ---------- 第二步：录入项生成 ---------- */

  var linesContainer = document.getElementById("liuyao-lines");
  var selected = [null, null, null, null, null, null]; // 未选 = null

  T.lineLabels.forEach(function (label, i) {
    var fieldset = document.createElement("fieldset");
    fieldset.className = "liuyao-line";
    var legend = document.createElement("legend");
    legend.textContent = label;
    fieldset.appendChild(legend);
    T.options.forEach(function (optText, j) {
      var id = "liuyao-line-" + i + "-" + j;
      var input = document.createElement("input");
      input.type = "radio";
      input.name = "liuyao-line-" + i;
      input.id = id;
      input.value = T.optionValues[j];
      input.addEventListener("change", function () {
        selected[i] = T.optionValues[j];
        renderPreview();
      });
      var lab = document.createElement("label");
      lab.htmlFor = id;
      lab.textContent = optText;
      fieldset.appendChild(input);
      fieldset.appendChild(lab);
    });
    linesContainer.appendChild(fieldset);
  });

  /* ---------- 实时预览 ---------- */

  function renderPreview() {
    var html = "";
    for (var i = 5; i >= 0; i--) {
      var v = selected[i];
      if (v === null) { html += '<div class="yaoline pending"></div>'; continue; }
      var yang = isYang(v);
      var moving = v === 6 || v === 9;
      html += '<div class="yaoline ' + (yang ? "yang" : "yin") + (moving ? " moving" : "") + '"></div>';
    }
    document.getElementById("liuyao-preview").innerHTML = html;
  }
  renderPreview();

  /* ---------- 第三步：结果渲染 ---------- */

  var interpretBtn = document.getElementById("liuyao-interpret-btn");
  var resultBox = document.getElementById("liuyao-result");
  var interpretSection = document.getElementById("liuyao-interpret");
  var errorBox = document.getElementById("liuyao-error");
  var chartSnapshot = null;

  function showResult() {
    var r = chartSnapshot;
    var html = "<h2>" + esc(T.resultTitle) + "</h2>";
    html += '<div class="liuyao-hex-display">';
    html += '<div class="liuyao-hex-card"><div class="liuyao-symbol">' + esc(r.primary.symbol) + "</div>";
    html += "<div>" + esc(T.primary) + "</div><div>" + esc(r.primary.name) + "</div>";
    html += "<div>" + esc(r.primary.lowerTrigram) + " / " + esc(r.primary.upperTrigram) + "</div></div>";
    if (r.changed) {
      html += '<div class="liuyao-hex-card"><div class="liuyao-symbol">' + esc(r.changed.symbol) + "</div>";
      html += "<div>" + esc(T.changed) + "</div><div>" + esc(r.changed.name) + "</div></div>";
    }
    html += "</div>";
    resultBox.innerHTML = html;
    resultBox.hidden = false;
    interpretBtn.hidden = false;
  }

  /* 正反规定切换不影响爻值语义（4 选项已直接映射 6/7/8/9），
     coindef 仅作展示与心理锚定，不参与计算 */

  /* ---------- 解读请求 ---------- */

  function setStatus(text, withRetry) {
    var body = interpretSection.querySelector(".liuyao-card-body");
    body.innerHTML = "";
    var p = document.createElement("p");
    p.className = "status loading";
    p.textContent = text;
    body.appendChild(p);
    if (withRetry) {
      var btn = document.createElement("button");
      btn.className = "liuyao-retry";
      btn.textContent = T.retry;
      btn.addEventListener("click", requestInterpret);
      body.appendChild(btn);
    }
  }

  function renderMarkdown(md) {
    if (typeof DOMPurify === "undefined" || typeof marked === "undefined") {
      throw new Error(T.mdLibLoading);
    }
    interpretSection.querySelector(".liuyao-card-body").innerHTML = DOMPurify.sanitize(marked.parse(md));
  }

  function requestInterpret() {
    errorBox.hidden = true;
    interpretSection.hidden = false;
    setStatus(T.loading, false);
    var payload = {
      lang: LANG,
      question: chartSnapshot.question,
      lines: chartSnapshot.lines,
      now: { solar: chartSnapshot.solar },
      primary: { name: chartSnapshot.primary.name, statement: chartSnapshot.primary.statement },
    };
    if (chartSnapshot.changed) {
      payload.changed = { name: chartSnapshot.changed.name, statement: chartSnapshot.changed.statement };
    }
    if (chartSnapshot.moving.length > 0) {
      payload.moving = chartSnapshot.moving;
    }
    fetch("/api/liuyao/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!json.ok) throw new Error(json.error && json.error.message ? json.error.message : "HTTP " + res.status);
        return json.data.markdown;
      });
    }).then(function (md) {
      renderMarkdown(md);
    }).catch(function (e) {
      setStatus(T.failed + e.message, true);
    });
  }

  interpretBtn.addEventListener("click", requestInterpret);

  /* ---------- 提交（从第二步进入第三步） ----------
     在第二步底部动态加一个"起卦"按钮，录满 6 爻后可用 */
  var castBtn = document.createElement("button");
  castBtn.type = "button";
  castBtn.className = "liuyao-cast";
  castBtn.textContent = LANG === "zh" ? "起卦" : "Cast Hexagram";
  castBtn.disabled = true;
  linesContainer.appendChild(castBtn);

  function updateCastBtn() {
    castBtn.disabled = selected.indexOf(null) !== -1;
  }
  linesContainer.addEventListener("change", updateCastBtn);

  castBtn.addEventListener("click", function () {
    var question = document.getElementById("liuyao-question").value.trim();
    if (!question) {
      errorBox.textContent = T.noQuestion;
      errorBox.hidden = false;
      return;
    }
    errorBox.hidden = true;
    var lines = selected.slice();
    var reading = resolveReading(lines);
    var today = new Date();
    function two(n) { return (n < 10 ? "0" : "") + n; }
    chartSnapshot = {
      question: question,
      lines: lines,
      solar: today.getFullYear() + "-" + two(today.getMonth() + 1) + "-" + two(today.getDate()),
      primary: reading.primary,
      changed: reading.changed,
      moving: reading.moving,
    };
    showResult();
    document.getElementById("liuyao-step3").scrollIntoView({ behavior: "smooth" });
  });
})();
```

> **填表说明**：上面 `HEXAGRAMS` 数组只含乾(1)、坤(2)、解(40)、恒(32) 四个样例卦。补全全部 64 卦时，按序号 1→64 顺序排列（索引 0=乾 … 索引 63=未济），每卦结构完全一致：`{ symbol, name:{zh,en}, statement:{zh,en}, lines:{zh:[6条],en:[6条]} }`。Unicode 卦符范围 U+4DC0–U+4DFF（䷀–䷿）。中文卦辞/爻辞据《周易》通行本（如中华书局《周易正义》），英文据 Richard Wilhelm 译本。补全后删去 `TODO(填表)` 注释。

- [ ] **Step 2: 补全 64 卦文本表**

将 `HEXAGRAMS` 数组补全为 64 条（序号 1 乾 → 64 未济），每条结构与样例卦完全一致。确保：
- 数组长度 === 64，索引 0 对应序号 1。
- 每卦 6 条爻辞，顺序为初爻→上爻（与 `lines` 数组 index 0-5 对应）。
- `symbol` 为正确的 Unicode 卦符（䷀–䷿）。
- 删去 `TODO(填表)` 注释与 `hexByNo` 中的 find 兜底逻辑（可直接用 `HEXAGRAMS[no - 1]`）。

- [ ] **Step 3: 手工验证**

Run: `npm run dev`

打开 `http://localhost:8787/zh/liuyao/`，验证：
1. 三步骨架完整渲染。
2. 6 个录入项各选一个值，实时预览阴阳爻 + 动爻标记正确。
3. 录满后"起卦"按钮可点，弹出本卦/变卦卦符与卦名。
4. 输入所求之事 + 点"开始解读"，看到 loading → Markdown 渲染（需 `.dev.vars` 配 `LLM_API_KEY`）。
5. 打开 `/en/liuyao/` 验证英文版。
6. 用一个已知卦象（如全阳 → 乾 ䷀）对照验证算法正确。

- [ ] **Step 4: 全量测试 + 类型检查 + Commit**

Run: `npm test && npm run typecheck`
Expected: 全部通过

```bash
git add public/assets/liuyao.js
git commit -m "feat(liuyao): add frontend casting logic and 64-hexagram text table"
```

---

### Task 8: 样式

**Files:**
- Modify: `public/assets/style.css`

- [ ] **Step 1: 在 `public/assets/style.css` 末尾追加 liuyao 样式**

```css
/* ===== 六爻起卦页 ===== */
.liuyao-app { max-width: 800px; margin: 0 auto; }
.liuyao-step { margin: 2rem 0; padding: 1.5rem; border: 1px solid var(--border, #e0e0e0); border-radius: 8px; }
.liuyao-step h2 { margin-top: 0; }
.liuyao-guide, .liuyao-rules { color: var(--text-muted, #666); line-height: 1.7; }
.liuyao-question-label { display: block; margin-top: 1rem; font-weight: 600; }
.liuyao-question-label input { display: block; width: 100%; margin-top: 0.5rem; padding: 0.5rem; font-size: 1rem; }
.liuyao-line { margin: 0.75rem 0; padding: 0.5rem 1rem; }
.liuyao-line legend { font-weight: 600; }
.liuyao-line label { display: inline-block; margin-right: 1rem; cursor: pointer; }

/* 爻线预览（上爻在顶部） */
.liuyao-preview { margin: 1rem 0; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.yaoline { width: 180px; height: 16px; position: relative; }
.yaoline.yang { background: #333; }
.yaoline.yin { background: linear-gradient(to right, #333 0 42%, transparent 42% 58%, #333 58% 100%); }
.yaoline.moving::after { content: "○"; position: absolute; right: -24px; top: -2px; color: #c0392b; font-size: 14px; }
.yaoline.pending { background: repeating-linear-gradient(90deg, #ddd 0 8px, transparent 8px 16px); }

/* 结果区 */
.liuyao-hex-display { display: flex; gap: 2rem; justify-content: center; margin: 1.5rem 0; flex-wrap: wrap; }
.liuyao-hex-card { text-align: center; }
.liuyao-symbol { font-size: 4rem; line-height: 1.2; color: #333; }

/* 解读区 */
.liuyao-interpret { margin-top: 2rem; }
.liuyao-disclaimer { color: var(--text-muted, #666); font-size: 0.9rem; }
.liuyao-card { padding: 1.5rem; border: 1px solid var(--border, #e0e0e0); border-radius: 8px; }
.status.loading { color: var(--text-muted, #666); }
.liuyao-retry { margin-top: 1rem; }
.liuyao-cast { display: block; margin: 1.5rem auto; padding: 0.6rem 2rem; font-size: 1.1rem; }
.liuyao-cast:disabled { opacity: 0.5; cursor: not-allowed; }
.liuyao-error { color: #c0392b; }
```

- [ ] **Step 2: 验证 + Commit**

Run: `npm run dev`，确认 `/zh/liuyao/` 样式正常。

```bash
git add public/assets/style.css
git commit -m "feat(liuyao): add page styles"
```

---

## 完工检查清单

- [ ] `npm test` 全绿（含八字回归 + 六爻新增）
- [ ] `npm run typecheck` 无错误
- [ ] `npm run dev` 手工验证六爻页三步交互 + 解读请求
- [ ] 导航栏出现六爻入口（中英）
- [ ] `/sitemap.xml` 包含 liuyao 双语 URL（自动派生）
