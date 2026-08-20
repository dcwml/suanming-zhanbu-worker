# 八字合婚（hehun）+ 命理总览页（mingli）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增第 7 个工具「八字合婚」（双人排盘 + 三层配对 + 单段 LLM 解读）与「命理」总览页，导航「命理」下拉标题改为链接并纳入合婚入口。

**Architecture:** 完全复刻既有工具模块模式（以 liuyao 为后端模板、bazi.js 为前端模板）：`src/hehun/{types,validate,prompt}.ts` + `src/routes/hehun.ts` + `public/assets/hehun.js` + 内容片段两步注册。前端用 lunar-javascript 排两人四柱、自带地支/天干关系查表（与 `src/fortune/rules.ts` 同值但运行时独立），后端只校验结构零重算，LLM 单次调用出单段解读。mingli 总览页复制 divination 总览页模式（三工具卡 + 对比表 + FAQ），CSS 采用分组选择器复用。

**Tech Stack:** Hono + TypeScript + Cloudflare Workers（vitest-pool-workers）、lunar-javascript 1.7.7（CDN: cdnjs 主源 + staticfile 回退）、marked 12 + DOMPurify 3.1.6（CDN）、Cloudflare ratelimits（namespace 1007）。

**Spec:** `docs/superpowers/specs/2026-08-20-hehun-mingli-design.md`

## Global Constraints

- 双语对称：所有新文案 zh + en 成对；`Lang` 收紧为 `"zh" | "en"`。
- API 响应壳：`{ ok: true, data }` / `{ ok: false, error: { code, message } }`；错误码全套 `invalid_json`(400) / `payload_too_large`(413) / `invalid_request`(400) / `rate_limited`(429) / **`not_configured`(500)** / `upstream_error`(502) / `upstream_timeout`(504)。注意 not_configured 是 **500** 不是 503（见 `src/llm.ts:29`，liuyao-api.test.ts 已断言 500）。
- 错误消息不得回显用户输入值（校验消息只写我们自己的字段名描述）。
- registry `faq` 字段内容必须与正文 FAQ 逐字一致，zh/en 问答条数相等（registry.test 断言等长）。
- 每个任务提交前必须全绿：`npm test` + `npm run typecheck`（测试末尾 Windows miniflare EBUSY 警告是无害噪音，不代表失败）。
- 全程直接在 main 分支提交；**只在 Task 8 结束时 `git push` 一次**（Cloudflare Git 集成自动部署），勿本地 `wrangler deploy`。
- 本机 Bash 工具是 bash（非 cmd）；命令行用 bash 语法。
- 排盘数据以 lunar-javascript 1.7.7 实测为准（本计划 fixture 已实测：男 1996-02-19 午时 = 丙子年庚寅月**丙戌**日甲午时；女 1997-07-07 未时 = 丁丑年**丁未**月**庚戌**日癸未时）。

---

### Task 1: hehun 类型与校验（types + validate + fixture + 单测）

**Files:**
- Create: `src/hehun/types.ts`
- Create: `src/hehun/validate.ts`
- Create: `test/fixtures/hehun-request.ts`
- Create: `test/hehun-validate.test.ts`

**Interfaces:**
- Produces: `InterpretRequest`（`{ lang, male, female, pairing }`）、`PersonChart`、`PillarInfo`、`Pairing`、`BranchRelationValue`、`StemRelationValue`、`HehunEnv extends LlmEnv { HEHUN_RATE_LIMITER?: RateLimiter }`；`validateInterpretRequest(body): { ok: true, value: InterpretRequest } | { ok: false, message: string }`。后续 Task 2/3 直接 import 这些名字。

- [ ] **Step 1: 写失败测试**

`test/hehun-validate.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { validateInterpretRequest } from "../src/hehun/validate";
import { validRequest } from "./fixtures/hehun-request";

describe("validateInterpretRequest", () => {
  it("accepts a valid request", () => {
    expect(validateInterpretRequest(validRequest()).ok).toBe(true);
  });

  it("rejects non-object body", () => {
    expect(validateInterpretRequest("nope").ok).toBe(false);
    expect(validateInterpretRequest(null).ok).toBe(false);
  });

  it("rejects unknown lang", () => {
    const body = validRequest();
    (body as { lang: string }).lang = "fr";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects malformed male.solar", () => {
    const body = validRequest();
    body.male.solar = "1996/02/19";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects ganZhi outside the 60 jiazi cycle", () => {
    const body = validRequest();
    body.female.pillars.month.ganZhi = "丙丙";
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects missing female hour pillar", () => {
    const body = validRequest();
    delete (body.female.pillars as { hour?: unknown }).hour;
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects overlong lunar text (>100 chars)", () => {
    const body = validRequest();
    body.male.lunar = "字".repeat(101);
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects wuxingCount with unknown element key", () => {
    const body = validRequest();
    (body.male.wuxingCount as Record<string, number>).风 = 1;
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects wuxingCount value out of range (9)", () => {
    const body = validRequest();
    body.male.wuxingCount.火 = 9;
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects unknown pairing enum values", () => {
    const body = validRequest();
    (body.pairing as { yearZhi: string }).yearZhi = "bogus";
    expect(validateInterpretRequest(body).ok).toBe(false);
    const body2 = validRequest();
    (body2.pairing as { dayGan: string }).dayGan = "chong";
    expect(validateInterpretRequest(body2).ok).toBe(false);
  });

  it("rejects missing pairing", () => {
    const body = validRequest();
    delete (body as { pairing?: unknown }).pairing;
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("rejects missing male", () => {
    const body = validRequest();
    delete (body as { male?: unknown }).male;
    expect(validateInterpretRequest(body).ok).toBe(false);
  });

  it("does not echo user input in error message", () => {
    const body = validRequest();
    body.male.lunar = "我的秘密生日uniqueToken123";
    (body.pairing as { yearZhi: string }).yearZhi = "bogus";
    const r = validateInterpretRequest(body);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).not.toContain("uniqueToken123");
  });
});
```

`test/fixtures/hehun-request.ts`：

```ts
import type { InterpretRequest } from "../../src/hehun/types";

/**
 * 合法的八字合婚解读请求体夹具。
 * 男方 1996-02-19 午时（丙子年庚寅月丙戌日甲午时）、女方 1997-07-07 未时
 * （丁丑年丁未月庚戌日癸未时），均经 lunar-javascript 1.7.7 实测；
 * pairing 与两人干支自洽：年支子丑六合、日支戌戌同支、日干丙庚无五合。
 * wuxingCount 只数四柱明干明支 8 个（与 bazi.js 口径一致）。
 * 每次调用返回全新对象，测试可安全修改。
 */
export function validRequest(): InterpretRequest {
  return {
    lang: "zh",
    male: {
      solar: "1996-02-19",
      lunar: "一九九六年正月初一 午时",
      dayMaster: "丙火",
      pillars: {
        year: { ganZhi: "丙子", hideGan: "癸", naYin: "涧下水" },
        month: { ganZhi: "庚寅", hideGan: "甲,丙,戊", naYin: "松柏木" },
        day: { ganZhi: "丙戌", hideGan: "戊,辛,丁", naYin: "屋上土" },
        hour: { ganZhi: "甲午", hideGan: "丁,己", naYin: "沙中金" },
      },
      wuxingCount: { 金: 1, 木: 2, 水: 1, 火: 3, 土: 1 },
    },
    female: {
      solar: "1997-07-07",
      lunar: "一九九七年六月初三 未时",
      dayMaster: "庚金",
      pillars: {
        year: { ganZhi: "丁丑", hideGan: "己,癸,辛", naYin: "涧下水" },
        month: { ganZhi: "丁未", hideGan: "己,丁,乙", naYin: "天河水" },
        day: { ganZhi: "庚戌", hideGan: "戊,辛,丁", naYin: "钗钏金" },
        hour: { ganZhi: "癸未", hideGan: "己,丁,乙", naYin: "杨柳木" },
      },
      wuxingCount: { 金: 1, 木: 0, 水: 1, 火: 2, 土: 4 },
    },
    pairing: { yearZhi: "liuhe", dayZhi: "same", dayGan: "none" },
  };
}
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npx vitest run test/hehun-validate.test.ts
```

Expected: FAIL（Cannot find module `../src/hehun/validate`）。

- [ ] **Step 3: 实现 types.ts 与 validate.ts**

`src/hehun/types.ts`：

```ts
import type { Lang } from "../config/site";
import type { LlmEnv, RateLimiter } from "../llm";

export type { RateLimiter } from "../llm";

/** 单柱（前端排好传入，后端只校验结构不重算） */
export interface PillarInfo {
  /** 干支，如「丙子」 */
  ganZhi: string;
  /** 藏干（逗号分隔，如「甲,丙,戊」） */
  hideGan: string;
  /** 纳音，如「涧下水」 */
  naYin: string;
}

/** 单人命盘子集（合婚只需四柱干支 + 日主 + 五行统计） */
export interface PersonChart {
  /** 公历生日 YYYY-MM-DD */
  solar: string;
  /** 农历生日文本，如「一九九六年正月初一 午时」 */
  lunar: string;
  /** 日主，如「丙火」 */
  dayMaster: string;
  /** 四柱（年/月/日/时） */
  pillars: { year: PillarInfo; month: PillarInfo; day: PillarInfo; hour: PillarInfo };
  /** 五行统计（键 ∈ 金木水火土；只数四柱明干明支 8 个） */
  wuxingCount: Record<string, number>;
}

/** 地支关系（年支/日支配对共用；取值与前端 hehun.js 查表一致） */
export type BranchRelationValue = "liuhe" | "sanhe" | "chong" | "hai" | "same" | "none";

/** 天干关系（日干配对） */
export type StemRelationValue = "wuhe" | "none";

export interface Pairing {
  /** 年支关系 */
  yearZhi: BranchRelationValue;
  /** 日支关系 */
  dayZhi: BranchRelationValue;
  /** 日干关系 */
  dayGan: StemRelationValue;
}

export interface InterpretRequest {
  lang: Lang;
  male: PersonChart;
  female: PersonChart;
  pairing: Pairing;
}

export interface HehunEnv extends LlmEnv {
  HEHUN_RATE_LIMITER?: RateLimiter;
}
```

`src/hehun/validate.ts`：

```ts
import { LANGS } from "../config/site";
import type { InterpretRequest } from "./types";

/** 六十甲子全集（ganZhi 白名单） */
const JIAZI = new Set([
  "甲子", "乙丑", "丙寅", "丁卯", "戊辰", "己巳", "庚午", "辛未", "壬申", "癸酉",
  "甲戌", "乙亥", "丙子", "丁丑", "戊寅", "己卯", "庚辰", "辛巳", "壬午", "癸未",
  "甲申", "乙酉", "丙戌", "丁亥", "戊子", "己丑", "庚寅", "辛卯", "壬辰", "癸巳",
  "甲午", "乙未", "丙申", "丁酉", "戊戌", "己亥", "庚子", "辛丑", "壬寅", "癸卯",
  "甲辰", "乙巳", "丙午", "丁未", "戊申", "己酉", "庚戌", "辛亥", "壬子", "癸丑",
  "甲寅", "乙卯", "丙辰", "丁巳", "戊午", "己未", "庚申", "辛酉", "壬戌", "癸亥",
]);

const BRANCH_RELATIONS = new Set(["liuhe", "sanhe", "chong", "hai", "same", "none"]);
const STEM_RELATIONS = new Set(["wuhe", "none"]);
const WUXING = new Set(["金", "木", "水", "火", "土"]);

const MAX_TEXT = 100;

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

/** 校验单人命盘：solar 日期格式 + 四柱干支 ∈ 六十甲子 + 文本上限 + 五行统计结构 */
function checkPerson(v: unknown, field: string): string | null {
  if (!isObj(v)) return `${field} must be an object`;
  if (typeof v.solar !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.solar))
    return `${field}.solar must be YYYY-MM-DD`;
  if (!isNonEmptyStr(v.lunar, MAX_TEXT)) return `${field}.lunar is invalid`;
  if (!isNonEmptyStr(v.dayMaster, MAX_TEXT)) return `${field}.dayMaster is invalid`;
  if (!isObj(v.pillars)) return `${field}.pillars must be an object`;
  for (const k of ["year", "month", "day", "hour"] as const) {
    const p = v.pillars[k];
    if (!isObj(p)) return `${field}.pillars.${k} must be an object`;
    if (typeof p.ganZhi !== "string" || !JIAZI.has(p.ganZhi)) return `${field}.pillars.${k}.ganZhi is invalid`;
    if (!isNonEmptyStr(p.hideGan, MAX_TEXT)) return `${field}.pillars.${k}.hideGan is invalid`;
    if (!isNonEmptyStr(p.naYin, MAX_TEXT)) return `${field}.pillars.${k}.naYin is invalid`;
  }
  if (!isObj(v.wuxingCount)) return `${field}.wuxingCount must be an object`;
  const keys = Object.keys(v.wuxingCount);
  if (keys.length === 0 || keys.length > 5) return `${field}.wuxingCount is invalid`;
  for (const k of keys) {
    if (!WUXING.has(k)) return `${field}.wuxingCount has an unknown element`;
    const n = v.wuxingCount[k];
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 8)
      return `${field}.wuxingCount values are invalid`;
  }
  return null;
}

export function validateInterpretRequest(body: unknown): Result {
  if (!isObj(body)) return fail("body must be a JSON object");
  if (typeof body.lang !== "string" || !(LANGS as readonly string[]).includes(body.lang))
    return fail("lang must be zh or en");

  const male = checkPerson(body.male, "male");
  if (male) return fail(male);
  const female = checkPerson(body.female, "female");
  if (female) return fail(female);

  if (!isObj(body.pairing)) return fail("pairing must be an object");
  if (typeof body.pairing.yearZhi !== "string" || !BRANCH_RELATIONS.has(body.pairing.yearZhi))
    return fail("pairing.yearZhi is invalid");
  if (typeof body.pairing.dayZhi !== "string" || !BRANCH_RELATIONS.has(body.pairing.dayZhi))
    return fail("pairing.dayZhi is invalid");
  if (typeof body.pairing.dayGan !== "string" || !STEM_RELATIONS.has(body.pairing.dayGan))
    return fail("pairing.dayGan is invalid");

  return { ok: true, value: body as unknown as InterpretRequest };
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npx vitest run test/hehun-validate.test.ts
```

Expected: PASS（13 个用例全绿）。

- [ ] **Step 5: 全量门禁 + 提交**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npm test && npm run typecheck
```

Expected: 全绿（EBUSY 警告忽略）。

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && git add src/hehun/types.ts src/hehun/validate.ts test/fixtures/hehun-request.ts test/hehun-validate.test.ts && git commit -m "feat(hehun): add request types and validation with 60-jiazi whitelist"
```

---

### Task 2: hehun 提示词（prompt + 单测）

**Files:**
- Create: `src/hehun/prompt.ts`
- Create: `test/hehun-prompt.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `InterpretRequest` / `BranchRelationValue` / `StemRelationValue` / `PersonChart`。
- Produces: `buildSystemPrompt(lang: Lang): string`、`buildUserPrompt(req: InterpretRequest): string`（Task 3 路由调用）。

- [ ] **Step 1: 写失败测试**

`test/hehun-prompt.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "../src/hehun/prompt";
import { validRequest } from "./fixtures/hehun-request";

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
  it("includes both charts with pillars, day masters and element tallies", () => {
    const req = validRequest();
    const p = buildUserPrompt(req);
    expect(p).toContain("男方命盘");
    expect(p).toContain("女方命盘");
    expect(p).toContain("1996-02-19");
    expect(p).toContain("一九九六年正月初一 午时");
    expect(p).toContain("丙火");
    expect(p).toContain("庚金");
    expect(p).toContain("丙子");
    expect(p).toContain("庚戌");
    expect(p).toContain("金1 木2 水1 火3 土1");
    expect(p).toContain("六个部分");
  });

  it("includes pairing relations with branch/stem chars", () => {
    const req = validRequest();
    const p = buildUserPrompt(req);
    expect(p).toContain("年支关系：六合（子丑）");
    expect(p).toContain("日支关系：同支（戌戌）");
    expect(p).toContain("日干关系：无五合（丙庚）");
  });

  it("maps clash and stem five-union labels", () => {
    const req = validRequest();
    req.male.pillars.year.ganZhi = "甲子";
    req.female.pillars.year.ganZhi = "庚午";
    req.pairing.yearZhi = "chong";
    req.male.pillars.day.ganZhi = "丙戌";
    req.female.pillars.day.ganZhi = "辛未";
    req.pairing.dayGan = "wuhe";
    const p = buildUserPrompt(req);
    expect(p).toContain("年支关系：相冲（子午）");
    expect(p).toContain("日干关系：天干五合（丙辛）");
  });

  it("en prompt keeps chinese chart labels and asks for the six-part reading", () => {
    const req = validRequest();
    req.lang = "en";
    const p = buildUserPrompt(req);
    expect(p).toContain("男方命盘");
    expect(p).toContain("six parts");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npx vitest run test/hehun-prompt.test.ts
```

Expected: FAIL（Cannot find module `../src/hehun/prompt`）。

- [ ] **Step 3: 实现 prompt.ts**

`src/hehun/prompt.ts`：

```ts
import type { Lang } from "../config/site";
import type { BranchRelationValue, InterpretRequest, PersonChart, StemRelationValue } from "./types";

/** 地支关系枚举 → 中文标签（两语言共用中文标签，同 liuyao/bazi 模式） */
const BRANCH_LABEL: Record<BranchRelationValue, string> = {
  liuhe: "六合",
  sanhe: "三合",
  chong: "相冲",
  hai: "相害",
  same: "同支",
  none: "无特殊关系",
};

/** 天干关系枚举 → 中文标签 */
const STEM_LABEL: Record<StemRelationValue, string> = {
  wuhe: "天干五合",
  none: "无五合",
};

export function buildSystemPrompt(lang: Lang): string {
  if (lang === "zh") {
    return [
      "你是一位精通传统八字合婚的命理师，熟悉干支五行、六合三合六冲六害与配偶星论法。",
      "规则：",
      "1. 只基于用户提供的两人命盘与配对关系进行解读，不要重新排盘或质疑数据。",
      "2. 用 Markdown 输出（可用二三级标题、列表、粗体），不要输出代码块。",
      "3. 语气客观温和，多讲相处之道与磨合建议，避免绝对化断言，不下「必合/必离」的结论。",
      "4. 不提供医疗、法律、投资等专业建议；涉及婚恋决策只做泛化提醒。",
      "5. 全文使用中文。",
    ].join("\n");
  }
  return [
    "You are a seasoned BaZi marriage-compatibility reader, fluent in stems and branches, the five elements, the six harmonies and combinations, the six clashes and harms, and spouse-star theory.",
    "Rules:",
    "1. Interpret only the two charts and pairing relations provided by the user; never recast or question the data.",
    "2. Output Markdown (h2/h3 headings, lists, bold), no code blocks.",
    "3. Keep an objective, gentle tone: describe how the couple gets along and where to adapt; avoid absolute claims and never conclude the marriage is destined to succeed or fail.",
    "4. No medical, legal or investment advice; on marriage decisions give only general reminders.",
    "5. Respond entirely in English. Keep ganzhi terms in Chinese characters followed by a short gloss where helpful, e.g. 丙火 (Bing Fire).",
  ].join("\n");
}

function personBlock(title: string, p: PersonChart): string {
  const wx = Object.keys(p.wuxingCount)
    .map((k) => `${k}${p.wuxingCount[k]}`)
    .join(" ");
  return [
    `${title}：`,
    `公历：${p.solar}`,
    `农历：${p.lunar}`,
    `日主：${p.dayMaster}`,
    `年柱：${p.pillars.year.ganZhi}（藏干 ${p.pillars.year.hideGan}，纳音 ${p.pillars.year.naYin}）`,
    `月柱：${p.pillars.month.ganZhi}（藏干 ${p.pillars.month.hideGan}，纳音 ${p.pillars.month.naYin}）`,
    `日柱：${p.pillars.day.ganZhi}（藏干 ${p.pillars.day.hideGan}，纳音 ${p.pillars.day.naYin}）`,
    `时柱：${p.pillars.hour.ganZhi}（藏干 ${p.pillars.hour.hideGan}，纳音 ${p.pillars.hour.naYin}）`,
    `五行统计：${wx}`,
  ].join("\n");
}

export function buildUserPrompt(req: InterpretRequest): string {
  const m = req.male;
  const f = req.female;

  // 关系括号里的干支字符从两盘 ganZhi 截取（后端零重算，前端已保证自洽）
  const yearZhi = m.pillars.year.ganZhi.charAt(1) + f.pillars.year.ganZhi.charAt(1);
  const dayZhi = m.pillars.day.ganZhi.charAt(1) + f.pillars.day.ganZhi.charAt(1);
  const dayGan = m.pillars.day.ganZhi.charAt(0) + f.pillars.day.ganZhi.charAt(0);

  const blocks: string[] = [];
  blocks.push(personBlock("男方命盘", m));
  blocks.push(personBlock("女方命盘", f));
  blocks.push(
    [
      "配对关系：",
      `年支关系：${BRANCH_LABEL[req.pairing.yearZhi]}（${yearZhi}）`,
      `日支关系：${BRANCH_LABEL[req.pairing.dayZhi]}（${dayZhi}）`,
      `日干关系：${STEM_LABEL[req.pairing.dayGan]}（${dayGan}）`,
    ].join("\n"),
  );

  if (req.lang === "zh") {
    blocks.push(
      "请综合以上两人命盘与配对关系，写一段八字合婚解读，依次包含六个部分：①合婚总评 ②年支生肖配对 ③日柱配对 ④五行互补 ⑤配偶星简析（男命以财星为妻、女命以官杀为夫）⑥相处建议。700 字左右。",
    );
  } else {
    blocks.push(
      "Synthesise the two charts and pairing relations above into one BaZi marriage-compatibility reading with six parts in order: (1) overall compatibility, (2) year-branch (zodiac) pairing, (3) day-pillar pairing, (4) five-element complementarity, (5) spouse-star notes (the wealth star stands for the wife in the man's chart, the officer star for the husband in the woman's), (6) advice for getting along. About 550 words.",
    );
  }

  return blocks.join("\n\n");
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npx vitest run test/hehun-prompt.test.ts
```

Expected: PASS（6 个用例全绿）。

- [ ] **Step 5: 全量门禁 + 提交**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npm test && npm run typecheck
```

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && git add src/hehun/prompt.ts test/hehun-prompt.test.ts && git commit -m "feat(hehun): add system/user prompt builders"
```

---

### Task 3: hehun API 路由（routes/hehun.ts + api.ts 挂载 + wrangler 限流 + 单测）

**Files:**
- Create: `src/routes/hehun.ts`
- Modify: `src/routes/api.ts`（imports + Bindings 联合类型 + 注册调用）
- Modify: `wrangler.jsonc`（ratelimits 追加 namespace 1007）
- Create: `test/hehun-api.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `HehunEnv` / `validateInterpretRequest`、Task 2 的 `buildSystemPrompt` / `buildUserPrompt`、`src/llm.ts` 的 `callLlm`、`src/stats.ts` 的 `recordApiCall` / `StatsEnv`。
- Produces: `POST /api/hehun/interpret`（`registerHehunRoutes(api: Hono<{ Bindings: HehunEnv & StatsEnv }>): void`）。

- [ ] **Step 1: 写失败测试**

`test/hehun-api.test.ts`：

```ts
import { fetchMock } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { api } from "../src/routes/api";
import type { HehunEnv } from "../src/hehun/types";
import { validRequest } from "./fixtures/hehun-request";

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});
afterEach(() => {
  fetchMock.assertNoPendingInterceptors();
});

const baseEnv: HehunEnv = {
  LLM_BASE_URL: "https://apihub.agnes-ai.cn",
  LLM_MODEL: "agnes-2.0-flash",
  LLM_API_KEY: "test-key",
};

function allowLimiter(success: boolean): HehunEnv["HEHUN_RATE_LIMITER"] {
  return { limit: async () => ({ success }) };
}

function req(body: unknown): Request {
  return new Request("http://localhost/api/hehun/interpret", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "1.2.3.4" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/hehun/interpret", () => {
  it("returns markdown on success", async () => {
    fetchMock
      .get("https://apihub.agnes-ai.cn")
      .intercept({ path: "/v1/chat/completions", method: "POST" })
      .reply(200, { choices: [{ message: { content: "## 合婚解读\n内容" } }] });
    const res = await api.fetch(req(validRequest()), { ...baseEnv, HEHUN_RATE_LIMITER: allowLimiter(true) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; data: { markdown: string } };
    expect(json.ok).toBe(true);
    expect(json.data.markdown).toContain("合婚解读");
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
    const res = await api.fetch(req(validRequest()), { ...baseEnv, HEHUN_RATE_LIMITER: allowLimiter(false) });
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
    body.male.lunar = "secretTokenXYZ";
    (body.pairing as { yearZhi: string }).yearZhi = "bogus";
    const res = await api.fetch(req(body), baseEnv);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string; message: string } };
    expect(json.error.code).toBe("invalid_request");
    expect(json.error.message).not.toContain("secretTokenXYZ");
  });

  it("returns 413 when body exceeds 8KB", async () => {
    const body = validRequest();
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

- [ ] **Step 2: 跑测试确认失败**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npx vitest run test/hehun-api.test.ts
```

Expected: FAIL（路由未注册，`api.all("*")` 兜底返回 404 `not_found`，首用例拿到 404 ≠ 200）。

- [ ] **Step 3: 实现路由并挂载**

`src/routes/hehun.ts`（整文件，对齐 liuyao 路由模式）：

```ts
import type { Hono } from "hono";
import { callLlm } from "../llm";
import { buildSystemPrompt, buildUserPrompt } from "../hehun/prompt";
import type { HehunEnv } from "../hehun/types";
import { validateInterpretRequest } from "../hehun/validate";
import { recordApiCall } from "../stats";
import type { StatsEnv } from "../stats";

const MAX_BODY_BYTES = 8 * 1024;

function err(code: string, message: string) {
  return { ok: false as const, error: { code, message } };
}

/** 注册八字合婚解读路由（在 api 子应用内，basePath 已是 /api） */
export function registerHehunRoutes(api: Hono<{ Bindings: HehunEnv & StatsEnv }>): void {
  api.post("/hehun/interpret", async (c) => {
    // 0. 记录 API 调用（异步，不阻塞主流程）
    const db = c.env?.STATS_DB;
    if (db) {
      recordApiCall(db, "/api/hehun/interpret").catch(() => {});
    }

    // 1. 限流（绑定缺失则跳过，本地 dev / 测试环境可用）
    const limiter = c.env?.HEHUN_RATE_LIMITER;
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

`src/routes/api.ts` 修改（三处）：

import 区（`registerZiweiRoutes` 行后追加）：

```ts
import { registerHehunRoutes } from "./hehun";
```

import type 区（`ZiweiEnv` 行后追加）：

```ts
import type { HehunEnv } from "../hehun/types";
```

Bindings 联合类型（把 `ZiweiEnv & StatsEnv` 改为 `ZiweiEnv & HehunEnv & StatsEnv`）：

```ts
export const api = new Hono<{ Bindings: BaziEnv & LiuyaoEnv & MeihuaEnv & XiaoliurenEnv & ZejiEnv & ZiweiEnv & HehunEnv & StatsEnv }>().basePath("/api");
```

注册调用（`registerZiweiRoutes(api);` 行后追加）：

```ts
registerHehunRoutes(api);
```

`wrangler.jsonc` 修改：ratelimits 数组末尾（ZIWEI_RATE_LIMITER 对象之后）追加：

```jsonc
    ,
    {
      "name": "HEHUN_RATE_LIMITER",
      "namespace_id": "1007",
      "simple": { "limit": 10, "period": 60 }
    }
```

- [ ] **Step 4: 跑测试确认通过**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npx vitest run test/hehun-api.test.ts
```

Expected: PASS（8 个用例全绿）。

- [ ] **Step 5: 全量门禁 + 提交**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npm test && npm run typecheck
```

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && git add src/routes/hehun.ts src/routes/api.ts wrangler.jsonc test/hehun-api.test.ts && git commit -m "feat(hehun): add /api/hehun/interpret route with rate limiter 1007"
```

---

### Task 4: hehun 页面（内容片段 + registry 注册 + 集成/registry/sitemap 测试）

**Files:**
- Create: `src/content/hehun.zh.html`
- Create: `src/content/hehun.en.html`
- Modify: `src/pages/registry.ts`（imports + ziwei 条目后插入 hehun 条目）
- Modify: `test/registry.test.ts`（追加 hehun 用例）
- Modify: `test/sitemap.test.ts`（"lists every page in both languages" 追加断言）
- Modify: `test/integration.test.ts`（追加 "hehun page" describe）

**Interfaces:**
- Consumes: registry `PageEntry`（含 `faq?` 字段机制，SEO/sitemap 自动派生）。
- Produces: `findPage("hehun")`（Task 5 mingli CTA、Task 6 导航依赖）。

- [ ] **Step 1: 写失败测试**

`test/registry.test.ts` 在 "ziwei page exists..." 用例后追加：

```ts
  it("hehun page exists with bilingual faq of equal length", () => {
    const hehun = findPage("hehun");
    expect(hehun).toBeDefined();
    // 经「命理」下拉进入，不在平铺导航里
    expect(hehun!.inNav).toBe(false);
    expect(hehun!.faq!.zh.length).toBeGreaterThan(0);
    expect(hehun!.faq!.zh.length).toBe(hehun!.faq!.en.length);
  });
```

`test/sitemap.test.ts` 在 "lists every page in both languages" 用例的 divination 断言后追加：

```ts
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/zh/hehun/</loc>`);
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/en/hehun/</loc>`);
```

`test/integration.test.ts` 在 "mingli nav dropdown" describe 之前追加：

```ts
describe("hehun page", () => {
  it("serves /zh/hehun/ with form skeleton, FAQPage JSON-LD and scripts", async () => {
    const res = await SELF.fetch("http://localhost/zh/hehun/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('id="hehun-app"');
    expect(html).toContain('id="hehun-m-year"');
    expect(html).toContain('id="hehun-f-year"');
    expect(html).toContain("/assets/hehun.js");
    expect(html).toContain('"FAQPage"');
  });

  it("serves /en/hehun/ in English", async () => {
    const res = await SELF.fetch("http://localhost/en/hehun/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('data-lang="en"');
  });

  it("full-stack: invalid interpret request gets JSON 400", async () => {
    const res = await SELF.fetch("http://localhost/api/hehun/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang: "zh" }),
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(false);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npx vitest run test/registry.test.ts test/sitemap.test.ts test/integration.test.ts
```

Expected: FAIL（新增用例：`findPage("hehun")` undefined、`/zh/hehun/` 404）。

- [ ] **Step 3: 写内容片段并注册**

`src/content/hehun.zh.html`（整文件；表单默认值即 fixture 男女双方，便于快速验证）：

```html
<div class="hehun-app" id="hehun-app" data-lang="zh">
  <h1>八字合婚</h1>
  <p class="lead">输入男女双方出生时间，排出两人四柱，逐层对照年支生肖、日柱干支与五行互补，AI 智能解读婚配指数与相处建议。</p>

  <form class="bazi-form hehun-form" id="hehun-form">
    <div class="hehun-parties">
      <fieldset class="hehun-party">
        <legend>男方</legend>
        <fieldset class="bazi-field">
          <legend>历法</legend>
          <label><input type="radio" name="m-calendar" value="solar" checked> 公历</label>
          <label><input type="radio" name="m-calendar" value="lunar"> 农历</label>
          <label id="hehun-m-leap-wrap" hidden><input type="checkbox" id="hehun-m-leap"> 闰月</label>
        </fieldset>
        <div class="bazi-field">
          <label>年 <input type="number" id="hehun-m-year" min="1900" max="2100" value="1996" required></label>
          <label>月 <input type="number" id="hehun-m-month" min="1" max="12" value="2" required></label>
          <label>日 <input type="number" id="hehun-m-day" min="1" max="31" value="19" required></label>
          <label>时
            <select id="hehun-m-hour">
              <option value="0">早子时 23:00-00:59（归当日）</option>
              <option value="2">丑时 01:00-02:59</option>
              <option value="4">寅时 03:00-04:59</option>
              <option value="6">卯时 05:00-06:59</option>
              <option value="8">辰时 07:00-08:59</option>
              <option value="10">巳时 09:00-10:59</option>
              <option value="12" selected>午时 11:00-12:59</option>
              <option value="14">未时 13:00-14:59</option>
              <option value="16">申时 15:00-16:59</option>
              <option value="18">酉时 17:00-18:59</option>
              <option value="20">戌时 19:00-20:59</option>
              <option value="22">亥时 21:00-22:59</option>
              <option value="23">晚子时 23:00-23:59（归次日）</option>
            </select>
          </label>
        </div>
      </fieldset>
      <fieldset class="hehun-party">
        <legend>女方</legend>
        <fieldset class="bazi-field">
          <legend>历法</legend>
          <label><input type="radio" name="f-calendar" value="solar" checked> 公历</label>
          <label><input type="radio" name="f-calendar" value="lunar"> 农历</label>
          <label id="hehun-f-leap-wrap" hidden><input type="checkbox" id="hehun-f-leap"> 闰月</label>
        </fieldset>
        <div class="bazi-field">
          <label>年 <input type="number" id="hehun-f-year" min="1900" max="2100" value="1997" required></label>
          <label>月 <input type="number" id="hehun-f-month" min="1" max="12" value="7" required></label>
          <label>日 <input type="number" id="hehun-f-day" min="1" max="31" value="7" required></label>
          <label>时
            <select id="hehun-f-hour">
              <option value="0">早子时 23:00-00:59（归当日）</option>
              <option value="2">丑时 01:00-02:59</option>
              <option value="4">寅时 03:00-04:59</option>
              <option value="6">卯时 05:00-06:59</option>
              <option value="8">辰时 07:00-08:59</option>
              <option value="10">巳时 09:00-10:59</option>
              <option value="12">午时 11:00-12:59</option>
              <option value="14" selected>未时 13:00-14:59</option>
              <option value="16">申时 15:00-16:59</option>
              <option value="18">酉时 17:00-18:59</option>
              <option value="20">戌时 19:00-20:59</option>
              <option value="22">亥时 21:00-22:59</option>
              <option value="23">晚子时 23:00-23:59（归次日）</option>
            </select>
          </label>
        </div>
      </fieldset>
    </div>
    <button type="submit" class="bazi-submit">开始合婚</button>
    <p class="bazi-form-error" id="hehun-form-error" role="alert" hidden></p>
  </form>

  <section id="hehun-result" class="hehun-result" hidden aria-live="polite"></section>

  <section id="hehun-interpret" class="hehun-interpret" hidden>
    <h2>合婚解读</h2>
    <p class="bazi-disclaimer">以下解读基于传统八字合婚理论，仅供参考，请结合实际情况理性看待。</p>
    <article class="bazi-card" id="card-hehun"><h3>合婚详解</h3><div class="bazi-card-body"></div></article>
  </section>

  <section class="hehun-faq">
    <h2>常见问题</h2>
    <h3>八字合婚主要看什么？</h3>
    <p>传统合婚以年支（生肖）与日柱干支的配合为核心，再看两人五行是否互补：年支六合、三合为佳，相冲、相害需要更多磨合；日柱天干五合、地支相合情缘较深；一方所缺的五行恰是另一方的旺五行，相处起来更省力。本工具按这三层逐项对照。</p>
    <h3>合婚结果「不合」还能结婚吗？</h3>
    <p>合婚反映的是传统命理视角下的相处磨合点，不是判决书。年支相冲但日柱相合、五行互补的组合很常见，关键在于了解差异、用心经营。婚恋是重大人生决定，请结合现实情况综合判断。</p>
    <h3>需要准备什么信息？</h3>
    <p>男女双方的出生日期与时辰，公历、农历均可输入。时辰影响时柱与五行统计，越准确解读越贴切；时辰不确定时，可选最接近的时段。</p>
    <h3>AI 解读权威吗？</h3>
    <p>排盘遵循传统干支历法，解读由 AI 基于传统合婚文献整理生成，侧重文化推演，仅供参考，重要决策请结合自身情况。</p>
  </section>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/lunar-javascript/1.7.7/lunar.min.js" defer onerror="var s=document.createElement('script');s.src='https://cdn.staticfile.org/lunar-javascript/1.7.7/lunar.min.js';document.head.appendChild(s)"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js" defer></script>
<script src="/assets/hehun.js" defer></script>
```

`src/content/hehun.en.html`（整文件）：

```html
<div class="hehun-app" id="hehun-app" data-lang="en">
  <h1>BaZi Marriage Compatibility</h1>
  <p class="lead">Enter both persons' birth times to cast two Four-Pillars charts, compare year branches, day pillars and five elements layer by layer, and get an AI reading of your compatibility and how to get along.</p>

  <form class="bazi-form hehun-form" id="hehun-form">
    <div class="hehun-parties">
      <fieldset class="hehun-party">
        <legend>The Man</legend>
        <fieldset class="bazi-field">
          <legend>Calendar</legend>
          <label><input type="radio" name="m-calendar" value="solar" checked> Solar</label>
          <label><input type="radio" name="m-calendar" value="lunar"> Lunar</label>
          <label id="hehun-m-leap-wrap" hidden><input type="checkbox" id="hehun-m-leap"> Leap month</label>
        </fieldset>
        <div class="bazi-field">
          <label>Year <input type="number" id="hehun-m-year" min="1900" max="2100" value="1996" required></label>
          <label>Month <input type="number" id="hehun-m-month" min="1" max="12" value="2" required></label>
          <label>Day <input type="number" id="hehun-m-day" min="1" max="31" value="19" required></label>
          <label>Hour
            <select id="hehun-m-hour">
              <option value="0">早子 Early Zi 23:00-00:59 (same day)</option>
              <option value="2">丑 Chou 01:00-02:59</option>
              <option value="4">寅 Yin 03:00-04:59</option>
              <option value="6">卯 Mao 05:00-06:59</option>
              <option value="8">辰 Chen 07:00-08:59</option>
              <option value="10">巳 Si 09:00-10:59</option>
              <option value="12" selected>午 Wu 11:00-12:59</option>
              <option value="14">未 Wei 13:00-14:59</option>
              <option value="16">申 Shen 15:00-16:59</option>
              <option value="18">酉 You 17:00-18:59</option>
              <option value="20">戌 Xu 19:00-20:59</option>
              <option value="22">亥 Hai 21:00-22:59</option>
              <option value="23">晚子 Late Zi 23:00-23:59 (next day)</option>
            </select>
          </label>
        </div>
      </fieldset>
      <fieldset class="hehun-party">
        <legend>The Woman</legend>
        <fieldset class="bazi-field">
          <legend>Calendar</legend>
          <label><input type="radio" name="f-calendar" value="solar" checked> Solar</label>
          <label><input type="radio" name="f-calendar" value="lunar"> Lunar</label>
          <label id="hehun-f-leap-wrap" hidden><input type="checkbox" id="hehun-f-leap"> Leap month</label>
        </fieldset>
        <div class="bazi-field">
          <label>Year <input type="number" id="hehun-f-year" min="1900" max="2100" value="1997" required></label>
          <label>Month <input type="number" id="hehun-f-month" min="1" max="12" value="7" required></label>
          <label>Day <input type="number" id="hehun-f-day" min="1" max="31" value="7" required></label>
          <label>Hour
            <select id="hehun-f-hour">
              <option value="0">早子 Early Zi 23:00-00:59 (same day)</option>
              <option value="2">丑 Chou 01:00-02:59</option>
              <option value="4">寅 Yin 03:00-04:59</option>
              <option value="6">卯 Mao 05:00-06:59</option>
              <option value="8">辰 Chen 07:00-08:59</option>
              <option value="10">巳 Si 09:00-10:59</option>
              <option value="12">午 Wu 11:00-12:59</option>
              <option value="14" selected>未 Wei 13:00-14:59</option>
              <option value="16">申 Shen 15:00-16:59</option>
              <option value="18">酉 You 17:00-18:59</option>
              <option value="20">戌 Xu 19:00-20:59</option>
              <option value="22">亥 Hai 21:00-22:59</option>
              <option value="23">晚子 Late Zi 23:00-23:59 (next day)</option>
            </select>
          </label>
        </div>
      </fieldset>
    </div>
    <button type="submit" class="bazi-submit">Match Charts</button>
    <p class="bazi-form-error" id="hehun-form-error" role="alert" hidden></p>
  </form>

  <section id="hehun-result" class="hehun-result" hidden aria-live="polite"></section>

  <section id="hehun-interpret" class="hehun-interpret" hidden>
    <h2>Compatibility Reading</h2>
    <p class="bazi-disclaimer">The reading below is grounded in traditional BaZi compatibility theory — please apply it in light of your own circumstances.</p>
    <article class="bazi-card" id="card-hehun"><h3>Detailed Reading</h3><div class="bazi-card-body"></div></article>
  </section>

  <section class="hehun-faq">
    <h2>Frequently Asked Questions</h2>
    <h3>What does BaZi marriage compatibility look at?</h3>
    <p>Traditional compatibility reading centres on the pairing of the year branches (zodiac signs) and the day pillars, then on whether the two charts' five elements complement each other: six-harmony and three-harmony year branches bode well, while clashes and harms call for more patient adjustment; a five-union of day stems or harmonious day branches suggests a deep bond; an element one chart lacks but the other has in strength makes daily life easier. This tool compares all three layers one by one.</p>
    <h3>If the result says we are "not compatible", should we not marry?</h3>
    <p>The reading shows where the relationship needs patient adjustment from the traditional BaZi viewpoint — it is not a verdict. Charts with clashing year branches yet harmonious day pillars and complementary elements are common; what matters is understanding the differences and working on them. Marriage is a major life decision — please weigh it in light of your real circumstances.</p>
    <h3>What information do I need to prepare?</h3>
    <p>Both persons' birth dates and hours; solar or lunar input both work. The hour decides the hour pillar and the element tally, so the more precise, the closer the reading; if unsure of the hour, pick the closest slot.</p>
    <h3>Are the AI readings authoritative?</h3>
    <p>The chart casting follows the traditional stem-branch calendar; the reading is generated by AI drawing on classical compatibility literature and is offered as cultural reasoning for reference only. Please weigh important decisions in light of your own circumstances.</p>
  </section>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/lunar-javascript/1.7.7/lunar.min.js" defer onerror="var s=document.createElement('script');s.src='https://cdn.staticfile.org/lunar-javascript/1.7.7/lunar.min.js';document.head.appendChild(s)"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js" defer></script>
<script src="/assets/hehun.js" defer></script>
```

`src/pages/registry.ts` 修改（两处）：

import 区（`ziweiEn` 行后追加）：

```ts
import hehunZh from "../content/hehun.zh.html";
import hehunEn from "../content/hehun.en.html";
```

PAGES 数组：在 `ziwei` 条目的收尾 `},`（第 106 行）之后、`liuyao` 条目之前插入：

```ts
  {
    slug: "hehun",
    // 经「命理」下拉进入（见 layout/nav.ts），不在平铺导航里
    inNav: false,
    meta: {
      zh: { title: "八字合婚", description: "在线八字合婚：男女双方四柱排盘，年支生肖、日柱干支、五行互补逐层对照，AI 智能解读婚配指数与相处建议。" },
      en: { title: "BaZi Marriage Compatibility", description: "Free BaZi marriage compatibility matching for a couple — year-branch, day-pillar and five-element pairings with an AI reading of harmony and advice." },
    },
    content: { zh: hehunZh, en: hehunEn },
    faq: {
      zh: [
        {
          question: "八字合婚主要看什么？",
          answer: "传统合婚以年支（生肖）与日柱干支的配合为核心，再看两人五行是否互补：年支六合、三合为佳，相冲、相害需要更多磨合；日柱天干五合、地支相合情缘较深；一方所缺的五行恰是另一方的旺五行，相处起来更省力。本工具按这三层逐项对照。",
        },
        {
          question: "合婚结果「不合」还能结婚吗？",
          answer: "合婚反映的是传统命理视角下的相处磨合点，不是判决书。年支相冲但日柱相合、五行互补的组合很常见，关键在于了解差异、用心经营。婚恋是重大人生决定，请结合现实情况综合判断。",
        },
        {
          question: "需要准备什么信息？",
          answer: "男女双方的出生日期与时辰，公历、农历均可输入。时辰影响时柱与五行统计，越准确解读越贴切；时辰不确定时，可选最接近的时段。",
        },
        {
          question: "AI 解读权威吗？",
          answer: "排盘遵循传统干支历法，解读由 AI 基于传统合婚文献整理生成，侧重文化推演，仅供参考，重要决策请结合自身情况。",
        },
      ],
      en: [
        {
          question: "What does BaZi marriage compatibility look at?",
          answer: "Traditional compatibility reading centres on the pairing of the year branches (zodiac signs) and the day pillars, then on whether the two charts' five elements complement each other: six-harmony and three-harmony year branches bode well, while clashes and harms call for more patient adjustment; a five-union of day stems or harmonious day branches suggests a deep bond; an element one chart lacks but the other has in strength makes daily life easier. This tool compares all three layers one by one.",
        },
        {
          question: "If the result says we are \"not compatible\", should we not marry?",
          answer: "The reading shows where the relationship needs patient adjustment from the traditional BaZi viewpoint — it is not a verdict. Charts with clashing year branches yet harmonious day pillars and complementary elements are common; what matters is understanding the differences and working on them. Marriage is a major life decision — please weigh it in light of your real circumstances.",
        },
        {
          question: "What information do I need to prepare?",
          answer: "Both persons' birth dates and hours; solar or lunar input both work. The hour decides the hour pillar and the element tally, so the more precise, the closer the reading; if unsure of the hour, pick the closest slot.",
        },
        {
          question: "Are the AI readings authoritative?",
          answer: "The chart casting follows the traditional stem-branch calendar; the reading is generated by AI drawing on classical compatibility literature and is offered as cultural reasoning for reference only. Please weigh important decisions in light of your own circumstances.",
        },
      ],
    },
  },
```

- [ ] **Step 4: 跑测试确认通过**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npx vitest run test/registry.test.ts test/sitemap.test.ts test/integration.test.ts
```

Expected: PASS。

- [ ] **Step 5: 全量门禁 + 提交**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npm test && npm run typecheck
```

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && git add src/content/hehun.zh.html src/content/hehun.en.html src/pages/registry.ts test/registry.test.ts test/sitemap.test.ts test/integration.test.ts && git commit -m "feat(hehun): register hehun page with bilingual FAQ"
```

---

### Task 5: mingli 总览页（内容片段 + registry + style.css 分组选择器 + 测试）

**Files:**
- Create: `src/content/mingli.zh.html`
- Create: `src/content/mingli.en.html`
- Modify: `src/pages/registry.ts`（imports + hehun 条目后插入 mingli 条目）
- Modify: `public/assets/style.css`（占卜总览 CSS 段改为 divination/mingli/hehun-faq 分组选择器）
- Modify: `test/registry.test.ts`（追加 mingli 用例）
- Modify: `test/sitemap.test.ts`（追加 mingli loc 断言）
- Modify: `test/integration.test.ts`（追加 "mingli overview page" describe）

**Interfaces:**
- Consumes: Task 4 已注册的 `findPage("hehun")`（CTA 链接目标）、`.tool-card` 通用类。
- Produces: `findPage("mingli")`（Task 6 导航标题链接依赖）。

- [ ] **Step 1: 写失败测试**

`test/registry.test.ts` 在 hehun 用例后追加：

```ts
  it("mingli page exists with bilingual faq of equal length", () => {
    const mingli = findPage("mingli");
    expect(mingli).toBeDefined();
    // 经「命理」下拉标题进入，不在平铺导航里
    expect(mingli!.inNav).toBe(false);
    expect(mingli!.faq!.zh.length).toBeGreaterThan(0);
    expect(mingli!.faq!.zh.length).toBe(mingli!.faq!.en.length);
  });
```

`test/sitemap.test.ts` 在 hehun 断言后追加：

```ts
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/zh/mingli/</loc>`);
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/en/mingli/</loc>`);
```

`test/integration.test.ts` 在 "hehun page" describe 后追加：

```ts
describe("mingli overview page", () => {
  it("serves /zh/mingli/ with intro and CTA links of all three tools", async () => {
    const res = await fetchNoFollow("/zh/mingli/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<h1>命理工具</h1>");
    expect(html).toContain('class="tool-cta" href="/zh/bazi/"');
    expect(html).toContain('class="tool-cta" href="/zh/ziwei/"');
    expect(html).toContain('class="tool-cta" href="/zh/hehun/"');
  });

  it("zh overview page injects FAQPage JSON-LD and canonical", async () => {
    const res = await fetchNoFollow("/zh/mingli/");
    const html = await res.text();
    expect(html).toContain('"FAQPage"');
    expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/zh/mingli/">`);
  });

  it("serves /en/mingli/ in English", async () => {
    const res = await fetchNoFollow("/en/mingli/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<h1>Destiny Tools</h1>");
    expect(html).toContain('class="tool-cta" href="/en/hehun/"');
  });

  it("redirects /zh/mingli to trailing-slash", async () => {
    const res = await fetchNoFollow("/zh/mingli");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/zh/mingli/");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npx vitest run test/registry.test.ts test/sitemap.test.ts test/integration.test.ts
```

Expected: FAIL（mingli 用例未命中）。

- [ ] **Step 3: 写内容片段、注册、改 CSS**

`src/content/mingli.zh.html`（整文件）：

```html
<h1>命理工具</h1>
<p class="lead">八字排盘、紫微斗数与八字合婚同出传统命理，却各有各的看盘视角。先弄清区别，再选适合你的那一种。</p>

<div class="mingli-tools">
  <div class="tool-card">
    <h2><span class="tool-icon" aria-hidden="true">乾</span>八字排盘</h2>
    <p>输入出生时间排出四柱，看五行气势、十神格局与大运流年起伏，是传统命理的入门与根本。</p>
    <p class="tool-features">四柱排盘 · 大运流年 · 三段解读</p>
    <a class="tool-cta" href="/zh/bazi/">开始排盘</a>
  </div>
  <div class="tool-card">
    <h2><span class="tool-icon" aria-hidden="true">紫</span>紫微斗数</h2>
    <p>以出生时间安星布宫，十二宫星曜加四化飞星，逐宫细看事业、财帛、婚姻等人生领域。</p>
    <p class="tool-features">十二宫 · 主星四化 · 三段解读</p>
    <a class="tool-cta" href="/zh/ziwei/">开始排盘</a>
  </div>
  <div class="tool-card">
    <h2><span class="tool-icon" aria-hidden="true">囍</span>八字合婚</h2>
    <p>男女双方四柱对照：年支生肖配合、日柱干支合冲、五行互补，一段解读看清磨合点与相处之道。</p>
    <p class="tool-features">双人排盘 · 三层配对 · 单段解读</p>
    <a class="tool-cta" href="/zh/hehun/">开始合婚</a>
  </div>
</div>

<section class="mingli-choose">
  <h2>三者怎么选</h2>
  <p>三种工具都以出生时间为本，看的是先天命局与长期格局，区别在看盘视角与颗粒度：</p>
  <table class="mingli-compare">
    <thead>
      <tr><th>工具</th><th>看什么</th><th>适合的问题</th><th>特点</th></tr>
    </thead>
    <tbody>
      <tr>
        <th>八字排盘</th>
        <td>四柱干支与五行生克</td>
        <td>整体命局、大运流年走势</td>
        <td>传统命理之根，先排八字再看其他</td>
      </tr>
      <tr>
        <th>紫微斗数</th>
        <td>十二宫星曜与四化飞星</td>
        <td>事业、财帛、婚姻等分领域细看</td>
        <td>逐宫铺开，人生领域一目了然</td>
      </tr>
      <tr>
        <th>八字合婚</th>
        <td>两人八字逐层对照</td>
        <td>婚恋磨合点与相处建议</td>
        <td>年支、日柱、五行三层配对，一次看清</td>
      </tr>
    </tbody>
  </table>
  <p>若拿不准：想看自己一生的整体走势，从八字排盘开始；想分领域细看某一块，用紫微斗数；想了解两个人合不合，用八字合婚。</p>
</section>

<section class="mingli-faq">
  <h2>常见问题</h2>
  <h3>命理工具和占卜工具有什么区别？</h3>
  <p>命理工具（八字、紫微、合婚）以出生时间为本，看的是先天命局与长期格局；占卜工具（六爻、梅花、小六壬）针对具体事项问卦，看的是一时一事的吉凶趋势。想了解自身格局用命理，想问某件具体的事用占卜。</p>
  <h3>八字排盘和紫微斗数怎么选？</h3>
  <p>两者同出传统命理，视角不同：八字以四柱干支的五行生克见长，适合看五行气势与大运流年起伏；紫微以十二宫星曜见长，适合逐宫细看事业、财帛、婚姻等人生领域。想快速把握整体走势选八字，想分领域细看选紫微。</p>
  <h3>八字合婚适合什么场景？</h3>
  <p>婚恋前的参考了解：对两人年支生肖配合、日柱干支合冲、五行互补情况逐层对照，并给出相处建议。适合想了解彼此磨合点的情侣，以及婚前希望多一个传统视角参考的伴侣。</p>
  <h3>AI 解读权威吗？</h3>
  <p>排盘遵循传统历法与安星规则，解读由 AI 基于传统命理文献整理生成，侧重文化推演，仅供参考，重要决策请结合自身情况。</p>
</section>

<p class="mingli-note">命理解读侧重传统文化推演，仅供参考，具体应用请结合自身情况。</p>
```

`src/content/mingli.en.html`（整文件）：

```html
<h1>Destiny Tools</h1>
<p class="lead">BaZi charting, Zi Wei Dou Shu and BaZi marriage matching all grow from traditional Chinese destiny study, yet each reads the chart from its own angle. See what sets them apart, then pick the reading that fits you.</p>

<div class="mingli-tools">
  <div class="tool-card">
    <h2><span class="tool-icon" aria-hidden="true">乾</span>BaZi Chart</h2>
    <p>Cast the Four Pillars from your birth time and read the five elements, ten gods and the rise and fall of luck cycles — the root and gateway of traditional destiny study.</p>
    <p class="tool-features">Four Pillars · Luck cycles · Three-part reading</p>
    <a class="tool-cta" href="/en/bazi/">Cast chart</a>
  </div>
  <div class="tool-card">
    <h2><span class="tool-icon" aria-hidden="true">紫</span>Zi Wei Dou Shu</h2>
    <p>Place the stars into twelve palaces from your birth time and read career, wealth, marriage and every life area palace by palace, with four transformations flying through the chart.</p>
    <p class="tool-features">Twelve palaces · Major stars · Three-part reading</p>
    <a class="tool-cta" href="/en/ziwei/">Cast chart</a>
  </div>
  <div class="tool-card">
    <h2><span class="tool-icon" aria-hidden="true">囍</span>Marriage Compatibility</h2>
    <p>Set two charts side by side — year-branch pairing, day-pillar harmony or clash, five-element complementarity — and get one reading of your friction points and how to get along.</p>
    <p class="tool-features">Two charts · Three pairing layers · One reading</p>
    <a class="tool-cta" href="/en/hehun/">Match now</a>
  </div>
</div>

<section class="mingli-choose">
  <h2>How They Differ</h2>
  <p>All three take the birth time as their foundation and read the natal pattern over the long run; they differ in angle and granularity:</p>
  <table class="mingli-compare">
    <thead>
      <tr><th>Tool</th><th>What it reads</th><th>Best-fit questions</th><th>Character</th></tr>
    </thead>
    <tbody>
      <tr>
        <th>BaZi Chart</th>
        <td>Four Pillars and five-element interplay</td>
        <td>The overall chart and luck-cycle trends</td>
        <td>The root of destiny study — start here</td>
      </tr>
      <tr>
        <th>Zi Wei Dou Shu</th>
        <td>Twelve palaces, stars and transformations</td>
        <td>Area-by-area looks at career, wealth, marriage</td>
        <td>Palace by palace, every life area laid out</td>
      </tr>
      <tr>
        <th>Marriage Compatibility</th>
        <td>Two charts compared layer by layer</td>
        <td>Friction points and getting-along advice</td>
        <td>Year branch, day pillar, elements — all at once</td>
      </tr>
    </tbody>
  </table>
  <p>If in doubt: for the overall arc of your own life start with the BaZi chart; to zoom into one area use Zi Wei Dou Shu; to see how two people fit, use marriage matching.</p>
</section>

<section class="mingli-faq">
  <h2>Frequently Asked Questions</h2>
  <h3>How do destiny tools differ from divination tools?</h3>
  <p>Destiny tools (BaZi, Zi Wei Dou Shu, marriage matching) take the birth time as their foundation and read the natal pattern over the long run; divination tools (I Ching, Plum Blossom, Xiao Liu Ren) answer a specific matter at hand and read the trend of that one affair. To understand your own makeup, use destiny tools; to ask about a concrete matter, use divination.</p>
  <h3>BaZi chart or Zi Wei Dou Shu — which should I pick?</h3>
  <p>Both grow from traditional destiny study but look from different angles: BaZi excels at the five-element interplay of the Four Pillars, suiting a view of elemental momentum and the rise and fall of luck cycles; Zi Wei excels at its twelve palaces and stars, suiting a palace-by-palace look at career, wealth, marriage and other life areas. For a quick grasp of the overall arc choose BaZi; for area-by-area detail choose Zi Wei.</p>
  <h3>When is BaZi marriage matching useful?</h3>
  <p>As a reference before marriage or during courtship: it compares the couple's year-branch pairing, day-pillar harmony or clash and five-element complementarity layer by layer, with advice for getting along. It suits couples who want to understand their friction points, and partners who want one more traditional viewpoint before tying the knot.</p>
  <h3>Are the AI readings authoritative?</h3>
  <p>The chart casting follows traditional calendar and star-placement rules; the reading is generated by AI drawing on classical destiny literature and is offered as cultural reasoning for reference only. Please weigh important decisions in light of your own circumstances.</p>
</section>

<p class="mingli-note">Destiny readings are grounded in traditional culture and offered for reference only — please apply them in light of your own circumstances.</p>
```

`src/pages/registry.ts` 修改（两处）：

import 区（`hehunEn` 行后追加）：

```ts
import mingliZh from "../content/mingli.zh.html";
import mingliEn from "../content/mingli.en.html";
```

PAGES 数组：在 hehun 条目收尾 `},` 之后、`liuyao` 条目之前插入：

```ts
  {
    slug: "mingli",
    // 命理总览页：经「命理」下拉标题进入（见 layout/nav.ts），不在平铺导航里
    inNav: false,
    meta: {
      zh: { title: "命理工具", description: "三种在线命理工具怎么选：八字排盘、紫微斗数、八字合婚的看盘视角、适合问题与特点对比，AI 智能解读。" },
      en: { title: "Destiny Tools", description: "How to choose among three online destiny tools — BaZi charting, Zi Wei Dou Shu and BaZi marriage matching — compared by what they read, best-fit questions and style, with AI readings." },
    },
    content: { zh: mingliZh, en: mingliEn },
    faq: {
      zh: [
        {
          question: "命理工具和占卜工具有什么区别？",
          answer: "命理工具（八字、紫微、合婚）以出生时间为本，看的是先天命局与长期格局；占卜工具（六爻、梅花、小六壬）针对具体事项问卦，看的是一时一事的吉凶趋势。想了解自身格局用命理，想问某件具体的事用占卜。",
        },
        {
          question: "八字排盘和紫微斗数怎么选？",
          answer: "两者同出传统命理，视角不同：八字以四柱干支的五行生克见长，适合看五行气势与大运流年起伏；紫微以十二宫星曜见长，适合逐宫细看事业、财帛、婚姻等人生领域。想快速把握整体走势选八字，想分领域细看选紫微。",
        },
        {
          question: "八字合婚适合什么场景？",
          answer: "婚恋前的参考了解：对两人年支生肖配合、日柱干支合冲、五行互补情况逐层对照，并给出相处建议。适合想了解彼此磨合点的情侣，以及婚前希望多一个传统视角参考的伴侣。",
        },
        {
          question: "AI 解读权威吗？",
          answer: "排盘遵循传统历法与安星规则，解读由 AI 基于传统命理文献整理生成，侧重文化推演，仅供参考，重要决策请结合自身情况。",
        },
      ],
      en: [
        {
          question: "How do destiny tools differ from divination tools?",
          answer: "Destiny tools (BaZi, Zi Wei Dou Shu, marriage matching) take the birth time as their foundation and read the natal pattern over the long run; divination tools (I Ching, Plum Blossom, Xiao Liu Ren) answer a specific matter at hand and read the trend of that one affair. To understand your own makeup, use destiny tools; to ask about a concrete matter, use divination.",
        },
        {
          question: "BaZi chart or Zi Wei Dou Shu — which should I pick?",
          answer: "Both grow from traditional destiny study but look from different angles: BaZi excels at the five-element interplay of the Four Pillars, suiting a view of elemental momentum and the rise and fall of luck cycles; Zi Wei excels at its twelve palaces and stars, suiting a palace-by-palace look at career, wealth, marriage and other life areas. For a quick grasp of the overall arc choose BaZi; for area-by-area detail choose Zi Wei.",
        },
        {
          question: "When is BaZi marriage matching useful?",
          answer: "As a reference before marriage or during courtship: it compares the couple's year-branch pairing, day-pillar harmony or clash and five-element complementarity layer by layer, with advice for getting along. It suits couples who want to understand their friction points, and partners who want one more traditional viewpoint before tying the knot.",
        },
        {
          question: "Are the AI readings authoritative?",
          answer: "The chart casting follows traditional calendar and star-placement rules; the reading is generated by AI drawing on classical destiny literature and is offered as cultural reasoning for reference only. Please weigh important decisions in light of your own circumstances.",
        },
      ],
    },
  },
```

`public/assets/style.css` 修改：把「========== 占卜总览页 ==========」整段（`.divination-tools` 起，至该段两个媒体查询块止，即原 814–886 行）整段替换为下面的分组选择器版本（divination + mingli 共用布局类；hehun 页 FAQ 也挂进 FAQ 组，Task 7 不再重复定义）：

```css
/* ========== 占卜总览页 · 命理总览页（共用布局类） ========== */

/* 工具卡片网格：复用首页 .tool-card */
.divination-tools,
.mingli-tools {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin: 1.5rem 0 2.5rem;
}

/* 选择指南对比表 */
.divination-choose,
.mingli-choose { margin: 2.5rem 0; }

.divination-compare,
.mingli-compare {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
  margin: 1rem 0;
}

.divination-compare th,
.divination-compare td,
.mingli-compare th,
.mingli-compare td {
  border: 1px solid var(--border);
  padding: 0.5rem 0.6rem;
  text-align: left;
  vertical-align: top;
}

.divination-compare thead th,
.mingli-compare thead th {
  background: #f0e9df;
  font-weight: 600;
  white-space: nowrap;
}

.divination-compare tbody th,
.mingli-compare tbody th {
  white-space: nowrap;
  color: var(--accent);
}

/* 页内 FAQ（样式同择吉页；hehun 页 FAQ 同组复用） */
.divination-faq,
.mingli-faq,
.hehun-faq { margin: 2rem 0; }

.divination-faq h2,
.mingli-faq h2,
.hehun-faq h2 {
  font-size: 1.25rem;
  margin: 0 0 0.85rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px dashed var(--border);
}

.divination-faq h3,
.mingli-faq h3,
.hehun-faq h3 {
  font-size: 1rem;
  margin: 1.1rem 0 0.3rem;
  color: var(--accent-dark);
}

.divination-faq p,
.mingli-faq p,
.hehun-faq p {
  margin: 0.3rem 0 0;
  font-size: 0.93rem;
  line-height: 1.8;
  color: var(--fg);
}

.divination-note,
.mingli-note { color: var(--muted); font-size: 0.85rem; }

@media (max-width: 800px) {
  .divination-tools,
  .mingli-tools { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .divination-compare,
  .mingli-compare { font-size: 0.85rem; }
  .divination-compare th,
  .divination-compare td,
  .mingli-compare th,
  .mingli-compare td { padding: 0.4rem 0.45rem; }
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npx vitest run test/registry.test.ts test/sitemap.test.ts test/integration.test.ts
```

Expected: PASS。

- [ ] **Step 5: 全量门禁 + 提交**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npm test && npm run typecheck
```

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && git add src/content/mingli.zh.html src/content/mingli.en.html src/pages/registry.ts public/assets/style.css test/registry.test.ts test/sitemap.test.ts test/integration.test.ts && git commit -m "feat(mingli): add destiny overview page and shared overview styles"
```

---

### Task 6: 导航与页脚（命理下拉标题改链接 + 加合婚项 + 既有测试更新）

**Files:**
- Modify: `src/layout/nav.ts`（MINGLI_NAV_ITEMS 加 hehun；renderDropdown 传 "mingli"；注释更新）
- Modify: `src/layout/footer.ts`（toolLinks 加 "hehun"）
- Modify: `test/integration.test.ts`（"mingli nav dropdown" describe 整块更新）

**Interfaces:**
- Consumes: Task 4/5 的 `findPage("hehun")` / `findPage("mingli")`（标签取 registry 单一来源）。
- Produces: 导航「命理」标题链接 `/:lang/mingli/`，下拉含 bazi/ziwei/hehun；页脚工具列含合婚。

- [ ] **Step 1: 更新既有测试（先改断言使其失败）**

`test/integration.test.ts` 把整个 `describe("mingli nav dropdown", ...)` 块（约 574–630 行）替换为：

```ts
describe("mingli nav dropdown", () => {
  const count = (html: string, needle: string): number => html.split(needle).length - 1;

  it("zh home renders the 命理 dropdown as a link to the overview with bazi, ziwei and hehun links", async () => {
    const res = await fetchNoFollow("/zh/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('class="nav-dropdown-toggle" href="/zh/mingli/"');
    expect(html).toContain('href="/zh/bazi/"');
    expect(html).toContain('href="/zh/ziwei/"');
    expect(html).toContain('href="/zh/hehun/"');
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
    expect(html).toContain("nav-dropdown-toggle active");
    expect(html).toContain('href="/zh/bazi/" class="active" aria-current="page"');
  });

  it("ziwei page marks its dropdown link and toggle active", async () => {
    const res = await fetchNoFollow("/zh/ziwei/");
    const html = await res.text();
    expect(html).toContain("nav-dropdown-toggle active");
    expect(html).toContain('href="/zh/ziwei/" class="active" aria-current="page"');
  });

  it("hehun page marks its dropdown link and toggle active", async () => {
    const res = await fetchNoFollow("/zh/hehun/");
    const html = await res.text();
    expect(html).toContain("nav-dropdown-toggle active");
    expect(html).toContain('href="/zh/hehun/" class="active" aria-current="page"');
  });

  it("mingli overview page marks the nav toggle active and switches language", async () => {
    const res = await fetchNoFollow("/zh/mingli/");
    const html = await res.text();
    expect(html).toContain('class="nav-dropdown-toggle active" href="/zh/mingli/" aria-current="page"');
    expect(html).toContain('class="lang-switch" href="/en/mingli/"');
  });

  it("en home renders the Destiny dropdown with all three tool links", async () => {
    const res = await fetchNoFollow("/en/");
    const html = await res.text();
    expect(html).toContain(">Destiny<span");
    expect(html).toContain('class="nav-dropdown-toggle" href="/en/mingli/"');
    expect(html).toContain('href="/en/bazi/"');
    expect(html).toContain('href="/en/ziwei/"');
    expect(html).toContain('href="/en/hehun/"');
  });

  it("footer tools column carries the ziwei and hehun links", async () => {
    const res = await fetchNoFollow("/zh/");
    const html = await res.text();
    expect(html).toContain('aria-label="工具"');
    expect(html).toContain('href="/zh/ziwei/"');
    expect(html).toContain('href="/zh/hehun/"');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npx vitest run test/integration.test.ts
```

Expected: FAIL（标题仍是 button、下拉无 hehun 链接、页脚无合婚）。

- [ ] **Step 3: 实现 nav.ts 与 footer.ts**

`src/layout/nav.ts` 修改（三处）：

第 17–23 行（注释 + MINGLI_NAV_ITEMS）替换为：

```ts
/** 「命理」下拉菜单：标签直接取 registry 页面标题（单一来源），不重复维护文案；标题链接命理总览页（同「占卜」下拉） */
export const MINGLI_NAV_LABEL: Record<Lang, string> = { zh: "命理", en: "Destiny" };

export const MINGLI_NAV_ITEMS: readonly { slug: string; label: Record<Lang, string> }[] = [
  "bazi",
  "ziwei",
  "hehun",
].map((slug) => ({ slug, label: { zh: findPage(slug)!.meta.zh.title, en: findPage(slug)!.meta.en.title } }));
```

第 70–71 行导航顺序注释替换为：

```ts
  // 导航顺序（单一来源）：首页 · [命理 ▾] · [占卜 ▾] · 择吉日 · [运势 ▾]
  // 「命理」下拉占八字原平铺位置（首页之后），标题链接 mingli 总览页；八字/紫微/合婚均 inNav: false
```

第 77 行 renderDropdown 调用改为：

```ts
      chunks.push(renderDropdown(lang, currentSlug, MINGLI_NAV_LABEL, MINGLI_NAV_ITEMS, "mingli"));
```

`src/layout/footer.ts` 修改：toolLinks 一行改为：

```ts
  const toolLinks = ["bazi", "ziwei", "hehun", "liuyao", "meihua", "xiaoliuren"]
```

- [ ] **Step 4: 跑测试确认通过**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npx vitest run test/integration.test.ts
```

Expected: PASS。

- [ ] **Step 5: 全量门禁 + 提交**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npm test && npm run typecheck
```

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && git add src/layout/nav.ts src/layout/footer.ts test/integration.test.ts && git commit -m "feat(nav): link mingli dropdown title to overview and add hehun entry"
```

---

### Task 7: hehun.js 前端（双人排盘 + 配对徽章 + 单段解读）+ 合婚 CSS + 本地浏览器验证

**Files:**
- Create: `public/assets/hehun.js`
- Modify: `public/assets/style.css`（末尾追加「八字合婚页」段）

**Interfaces:**
- Consumes: Task 4 页面 DOM（`#hehun-app`/`#hehun-form`/`hehun-{m,f}-*`/`#hehun-result`/`#card-hehun`）、Task 3 的 `POST /api/hehun/interpret`、CDN 的 lunar-javascript/marked/DOMPurify。
- Produces: 无下游依赖（最终前端交付物）。

- [ ] **Step 1: 写 hehun.js**

`public/assets/hehun.js`（整文件）：

```js
/* 八字合婚页脚本：lunar-javascript 双人排盘 → 地支/天干关系查表 → 配对徽章 → 单次请求合婚解读 */
(function () {
  "use strict";

  var app = document.getElementById("hehun-app");
  if (!app) return;
  var LANG = app.dataset.lang === "en" ? "en" : "zh";

  /* ---------- 五行与关系查表（与 src/fortune/rules.ts 同值；rules.ts 是生成期专用不进运行时，此处自带） ---------- */

  var GAN_WX = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
  var ZHI_WX = { 子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水" };

  /* 六合：子丑 寅亥 卯戌 辰酉 巳申 午未 */
  var LIUHE = ["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"];
  /* 六冲：子午 丑未 寅申 卯酉 辰戌 巳亥 */
  var LIUCHONG = ["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"];
  /* 六害：子未 丑午 寅巳 卯辰 申亥 酉戌 */
  var LIUHAI = ["子未", "丑午", "寅巳", "卯辰", "申亥", "酉戌"];
  /* 三合局：申子辰(水) 寅午戌(火) 巳酉丑(金) 亥卯未(木) */
  var SANHE = ["申子辰", "寅午戌", "巳酉丑", "亥卯未"];
  /* 天干五合：甲己 乙庚 丙辛 丁壬 戊癸 */
  var WUHE = ["甲己", "乙庚", "丙辛", "丁壬", "戊癸"];

  function inPairs(pairs, a, b) {
    for (var i = 0; i < pairs.length; i++) {
      var p = pairs[i];
      if ((p.charAt(0) === a && p.charAt(1) === b) || (p.charAt(0) === b && p.charAt(1) === a)) return true;
    }
    return false;
  }

  /** 地支关系：same → liuhe → chong → hai → sanhe → none（判定顺序同 fortune/rules.ts） */
  function branchRelation(a, b) {
    if (a === b) return "same";
    if (inPairs(LIUHE, a, b)) return "liuhe";
    if (inPairs(LIUCHONG, a, b)) return "chong";
    if (inPairs(LIUHAI, a, b)) return "hai";
    for (var i = 0; i < SANHE.length; i++) {
      if (SANHE[i].indexOf(a) >= 0 && SANHE[i].indexOf(b) >= 0) return "sanhe";
    }
    return "none";
  }

  /** 天干关系：wuhe / none */
  function stemRelation(a, b) {
    return inPairs(WUHE, a, b) ? "wuhe" : "none";
  }

  /* ---------- 术语表 ---------- */

  var T = {
    zh: {
      male: "男方", female: "女方",
      cols: ["", "年柱", "月柱", "日柱", "时柱"],
      rows: ["天干", "地支", "藏干", "纳音"],
      chartTitle: "排盘结果", solar: "公历", lunar: "农历", dayMaster: "日主", wuxing: "五行统计",
      badgesTitle: "配对速览",
      dim: { yearZhi: "年支", dayZhi: "日支", dayGan: "日干" },
      relBranch: { liuhe: "六合", sanhe: "三合", chong: "相冲", hai: "相害", same: "同支", none: "无特殊关系" },
      relStem: { wuhe: "五合", none: "无五合" },
      maleSupply: "男方补", femaleSupply: "女方补",
      loading: "正在解读…", retry: "重试", failed: "解读失败：", invalidDate: "日期无效，请检查输入",
      libLoading: "历书没能送达，请刷新页面或检查网络",
      mdLibLoading: "解读组件未完全加载，请稍后重试",
      errMap: {
        rate_limited: "来合婚的人有点多，月老正在逐一牵线，请稍等片刻再来",
        upstream_timeout: "月老翻查姻缘簿超时了，请再试一次",
        upstream_error: "月老暂时不在，稍后再来问问吧",
        not_configured: "月老暂时不在，稍后再来问问吧",
        invalid_request: "庚帖写得不太对，请核对后再递上来",
        payload_too_large: "庚帖太长了，请精简后再递上来",
        invalid_json: "庚帖写得不太对，请核对后再递上来",
      },
    },
    en: {
      male: "The Man", female: "The Woman",
      cols: ["", "Year", "Month", "Day", "Hour"],
      rows: ["Stem", "Branch", "Hidden", "NaYin"],
      chartTitle: "Charts Result", solar: "Solar", lunar: "Lunar", dayMaster: "Day Master", wuxing: "Five Elements",
      badgesTitle: "Pairing at a Glance",
      dim: { yearZhi: "Year Branch ", dayZhi: "Day Branch ", dayGan: "Day Stems " },
      relBranch: { liuhe: "Six Harmony", sanhe: "Three Harmony", chong: "Clash", hai: "Harm", same: "Same Branch", none: "No Special Tie" },
      relStem: { wuhe: "Five Union", none: "No Union" },
      maleSupply: "He supplies ", femaleSupply: "She supplies ",
      loading: "Interpreting…", retry: "Retry", failed: "Reading failed: ", invalidDate: "Invalid date, please check input",
      libLoading: "The almanac failed to load — please refresh or check your connection.",
      mdLibLoading: "Reading components not fully loaded, please retry later",
      errMap: {
        rate_limited: "The matchmaker is seeing many couples right now — please return in a few moments.",
        upstream_timeout: "The matchmaker is still flipping through the records — please try again.",
        upstream_error: "The matchmaker is away right now — please check back later.",
        not_configured: "The matchmaker is away right now — please check back later.",
        invalid_request: "Something in your submission looks off — please double-check and try again.",
        payload_too_large: "Your submission is a bit too long — please trim it and try again.",
        invalid_json: "Something in your submission looks off — please double-check and try again.",
      },
    },
  }[LANG];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function wxSpan(ch, wx) {
    return '<span class="wx-' + wx + '">' + esc(ch) + "（" + wx + "）</span>";
  }

  /* ---------- 排盘（口径与 bazi.js 一致） ---------- */

  function buildPerson(input) {
    var solar;
    if (input.calendar === "solar") {
      // lunar-javascript 对公历溢出日期（如 2 月 30 日）不抛错，需自行往返校验
      var probe = new Date(input.year, input.month - 1, input.day);
      if (probe.getFullYear() !== input.year || probe.getMonth() !== input.month - 1 || probe.getDate() !== input.day) {
        throw new Error("invalid date");
      }
      solar = Solar.fromYmdHms(input.year, input.month, input.day, input.hour, 0, 0);
    } else {
      // 农历；闰月用负月份（lunar-javascript 约定）
      var lunarMonth = input.leap ? -input.month : input.month;
      solar = Lunar.fromYmdHms(input.year, lunarMonth, input.day, input.hour, 0, 0).getSolar();
    }
    var lunar = solar.getLunar();
    var ec = lunar.getEightChar();

    function pillar(part) {
      var gan = ec["get" + part + "Gan"]();
      var zhi = ec["get" + part + "Zhi"]();
      return {
        gan: gan,
        zhi: zhi,
        ganZhi: gan + zhi,
        hideGan: ec["get" + part + "HideGan"]().join(","),
        naYin: ec["get" + part + "NaYin"](),
      };
    }
    var pillars = {
      year: pillar("Year"),
      month: pillar("Month"),
      day: pillar("Day"),
      hour: pillar("Time"),
    };

    // 五行统计只数四柱明干明支 8 个（与 bazi.js 口径一致，不含藏干）
    var wx = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
    ["year", "month", "day", "hour"].forEach(function (k) {
      wx[GAN_WX[pillars[k].gan]]++;
      wx[ZHI_WX[pillars[k].zhi]]++;
    });

    function two(n) { return (n < 10 ? "0" : "") + n; }
    return {
      solar: solar.getYear() + "-" + two(solar.getMonth()) + "-" + two(solar.getDay()),
      lunar: lunar.toString() + " " + lunar.getTimeZhi() + "时",
      dayMaster: pillars.day.gan + GAN_WX[pillars.day.gan],
      pillars: pillars,
      wuxingCount: wx,
    };
  }

  /* API 只传校验所需字段子集 */
  function apiPillar(p) {
    return { ganZhi: p.ganZhi, hideGan: p.hideGan, naYin: p.naYin };
  }
  function apiPerson(p) {
    return {
      solar: p.solar, lunar: p.lunar, dayMaster: p.dayMaster,
      pillars: { year: apiPillar(p.pillars.year), month: apiPillar(p.pillars.month), day: apiPillar(p.pillars.day), hour: apiPillar(p.pillars.hour) },
      wuxingCount: p.wuxingCount,
    };
  }

  /* ---------- 结果渲染 ---------- */

  function renderPersonBlock(title, p) {
    var order = ["year", "month", "day", "hour"];
    function row(label, cell) {
      return "<tr><th>" + esc(label) + "</th>" + order.map(cell).join("") + "</tr>";
    }
    var html = '<div class="hehun-chart"><h3>' + esc(title) + "</h3>";
    html += "<p>" + esc(T.solar) + "：" + esc(p.solar) + "<br>" + esc(T.lunar) + "：" + esc(p.lunar) + "<br>" + esc(T.dayMaster) + "：" + esc(p.dayMaster) + "</p>";
    html += '<table class="bazi-table"><tr>' + T.cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr>";
    html += row(T.rows[0], function (k) { return '<td class="bazi-gan">' + wxSpan(p.pillars[k].gan, GAN_WX[p.pillars[k].gan]) + "</td>"; });
    html += row(T.rows[1], function (k) { return '<td class="bazi-gan">' + wxSpan(p.pillars[k].zhi, ZHI_WX[p.pillars[k].zhi]) + "</td>"; });
    html += row(T.rows[2], function (k) { return "<td>" + esc(p.pillars[k].hideGan) + "</td>"; });
    html += row(T.rows[3], function (k) { return "<td>" + esc(p.pillars[k].naYin) + "</td>"; });
    html += "</table>";
    var wxText = ["金", "木", "水", "火", "土"].map(function (k) { return k + p.wuxingCount[k]; }).join(" ");
    html += "<p>" + esc(T.wuxing) + "：" + esc(wxText) + "</p></div>";
    return html;
  }

  /* 徽章配色：六合/三合/五合=吉(绿)，冲/害=凶(红)，同支/无=中性 */
  function badgeClass(v) {
    if (v === "liuhe" || v === "sanhe" || v === "wuhe") return "ji";
    if (v === "chong" || v === "hai") return "xiong";
    return "zhong";
  }

  function renderBadges(m, f, pairing) {
    var yzM = m.pillars.year.ganZhi.charAt(1);
    var yzF = f.pillars.year.ganZhi.charAt(1);
    var dzM = m.pillars.day.ganZhi.charAt(1);
    var dzF = f.pillars.day.ganZhi.charAt(1);
    var dgM = m.pillars.day.ganZhi.charAt(0);
    var dgF = f.pillars.day.ganZhi.charAt(0);
    var html = "<h3>" + esc(T.badgesTitle) + '</h3><div class="hehun-badges">';
    html += '<span class="hehun-badge ' + badgeClass(pairing.yearZhi) + '">' + esc(T.dim.yearZhi + T.relBranch[pairing.yearZhi]) + "（" + esc(yzM + yzF) + "）</span>";
    html += '<span class="hehun-badge ' + badgeClass(pairing.dayZhi) + '">' + esc(T.dim.dayZhi + T.relBranch[pairing.dayZhi]) + "（" + esc(dzM + dzF) + "）</span>";
    html += '<span class="hehun-badge ' + badgeClass(pairing.dayGan) + '">' + esc(T.dim.dayGan + T.relStem[pairing.dayGan]) + "（" + esc(dgM + dgF) + "）</span>";
    // 五行互补：一方缺（0 个）且另一方旺（≥3 个）
    ["金", "木", "水", "火", "土"].forEach(function (k) {
      if (f.wuxingCount[k] === 0 && m.wuxingCount[k] >= 3) {
        html += '<span class="hehun-badge ji">' + esc(T.maleSupply + k) + "</span>";
      }
      if (m.wuxingCount[k] === 0 && f.wuxingCount[k] >= 3) {
        html += '<span class="hehun-badge ji">' + esc(T.femaleSupply + k) + "</span>";
      }
    });
    html += "</div>";
    return html;
  }

  function renderResult(male, female, pairing) {
    var box = document.getElementById("hehun-result");
    var html = "<h2>" + esc(T.chartTitle) + "</h2>";
    html += '<div class="hehun-charts">';
    html += renderPersonBlock(T.male, male);
    html += renderPersonBlock(T.female, female);
    html += "</div>";
    html += renderBadges(male, female, pairing);
    box.innerHTML = html;
    box.hidden = false;
  }

  /* ---------- 解读请求（单次，失败可重试） ---------- */

  function setStatus(cls, text, withRetry, retryFn) {
    var body = document.querySelector("#card-hehun .bazi-card-body");
    body.innerHTML = "";
    var p = document.createElement("p");
    p.className = "status " + cls;
    p.textContent = text;
    body.appendChild(p);
    if (withRetry) {
      var btn = document.createElement("button");
      btn.className = "bazi-retry";
      btn.textContent = T.retry;
      btn.addEventListener("click", retryFn);
      body.appendChild(btn);
    }
  }

  function renderMarkdown(md) {
    // marked/DOMPurify 由 CDN 异步加载，未就绪时抛友好文案（走 catch/重试路径）
    if (typeof DOMPurify === "undefined" || typeof marked === "undefined") {
      throw new Error(T.mdLibLoading);
    }
    document.querySelector("#card-hehun .bazi-card-body").innerHTML = DOMPurify.sanitize(marked.parse(md));
  }

  function requestInterpret(payload) {
    return fetch("/api/hehun/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
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

  function runInterpret(payload) {
    setStatus("loading", T.loading, false);
    requestInterpret(payload).then(renderMarkdown).catch(function (e) {
      setStatus("error", e.message, true, function () { runInterpret(payload); });
    });
  }

  /* ---------- 表单 ---------- */

  var form = document.getElementById("hehun-form");

  function wireLeap(prefix) {
    var wrap = document.getElementById("hehun-" + prefix + "-leap-wrap");
    Array.prototype.forEach.call(form.elements[prefix + "-calendar"], function (r) {
      r.addEventListener("change", function () {
        wrap.hidden = form.elements[prefix + "-calendar"].value !== "lunar";
      });
    });
  }
  wireLeap("m");
  wireLeap("f");

  function readParty(prefix) {
    return {
      calendar: form.elements[prefix + "-calendar"].value,
      leap: document.getElementById("hehun-" + prefix + "-leap").checked,
      year: parseInt(document.getElementById("hehun-" + prefix + "-year").value, 10),
      month: parseInt(document.getElementById("hehun-" + prefix + "-month").value, 10),
      day: parseInt(document.getElementById("hehun-" + prefix + "-day").value, 10),
      hour: parseInt(document.getElementById("hehun-" + prefix + "-hour").value, 10),
    };
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var errBox = document.getElementById("hehun-form-error");
    errBox.hidden = true;
    if (typeof Lunar === "undefined" || typeof Solar === "undefined") {
      errBox.textContent = T.libLoading;
      errBox.hidden = false;
      return;
    }
    var male, female;
    try {
      male = buildPerson(readParty("m"));
      female = buildPerson(readParty("f"));
    } catch (e) {
      // lunar-javascript 对非法日期（如农历无此闰月、2月30日）直接抛异常
      errBox.textContent = T.invalidDate;
      errBox.hidden = false;
      return;
    }
    var pairing = {
      yearZhi: branchRelation(male.pillars.year.zhi, female.pillars.year.zhi),
      dayZhi: branchRelation(male.pillars.day.zhi, female.pillars.day.zhi),
      dayGan: stemRelation(male.pillars.day.gan, female.pillars.day.gan),
    };
    renderResult(male, female, pairing);
    var payload = { lang: LANG, male: apiPerson(male), female: apiPerson(female), pairing: pairing };
    document.getElementById("hehun-interpret").hidden = false;
    runInterpret(payload);
    document.getElementById("hehun-result").scrollIntoView({ behavior: "smooth" });
  });
})();
```

- [ ] **Step 2: 追加合婚 CSS**

`public/assets/style.css` 文件末尾追加：

```css

/* ========== 八字合婚页 ========== */

/* 双人表单与双盘并排（移动端单栏） */
.hehun-parties,
.hehun-charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.hehun-party {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  margin: 0 0 0.5rem;
}

.hehun-party legend {
  color: var(--accent-dark);
  font-weight: 600;
  padding: 0 0.35rem;
}

.hehun-chart h3 { margin: 0 0 0.5rem; }

.hehun-chart p { font-size: 0.92rem; margin: 0.25rem 0; }

/* 配对速览徽章：吉绿 / 凶红 / 中性 */
.hehun-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.5rem 0 1rem;
}

.hehun-badge {
  display: inline-block;
  border-radius: 999px;
  padding: 0.15rem 0.8rem;
  font-size: 0.85rem;
  border: 1px solid var(--border);
  background: #fff;
}

.hehun-badge.ji { color: #2e7d32; border-color: #2e7d32; }
.hehun-badge.xiong { color: #c62828; border-color: #c62828; }
.hehun-badge.zhong { color: var(--muted); }

@media (max-width: 720px) {
  .hehun-parties,
  .hehun-charts { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: 本地浏览器验证（npm run dev）**

后台启动 dev 服务：

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npm run dev
```

浏览器（builtin_browser）依次验证：

1. 打开 `http://localhost:8787/zh/hehun/`：表单双栏（男方/女方）、历法单选、时辰下拉正常。
2. 保持默认值（男 1996-02-19 午时 / 女 1997-07-07 未时）点「开始合婚」：
   - 双盘表格渲染：男方 丙子/庚寅/**丙戌**/甲午、女方 丁丑/**丁未**/**庚戌**/癸未（与本计划 fixture 一致）；
   - 徽章显示：年支六合（子丑）·日支同支（戌戌）·日干无五合（丙庚）；
   - 「合婚详解」卡片出现 AI 解读 Markdown（六部分结构）。
3. 男方历法切「农历」：闰月勾选框出现；再切回「公历」隐藏。
4. 打开 `http://localhost:8787/en/hehun/`：英文表单可提交、英文解读返回。
5. 打开 `http://localhost:8787/zh/mingli/`：三工具卡 + 对比表 + FAQ 渲染正常，导航「命理」标题是链接且高亮。
6. 首页导航：悬停「命理」出现八字排盘/紫微斗数/八字合婚三项。

- [ ] **Step 4: 关闭 dev 并验证端口释放**

```bash
powershell.exe -Command 'Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*suanming-zhanbu-workers*" -and $_.Name -in @("node.exe","workerd.exe") } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }'
netstat -ano | grep 8787
```

Expected: netstat 无 8787 监听行（外层单引号防 bash 展开 `$_`；须杀整棵树防 workerd 自动重启）。

- [ ] **Step 5: 全量门禁 + 提交**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npm test && npm run typecheck
```

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && git add public/assets/hehun.js public/assets/style.css && git commit -m "feat(hehun): add dual-chart frontend with pairing badges"
```

---

### Task 8: 文档收尾 + 全量门禁 + 推送 + 生产验证

**Files:**
- Modify: `AGENTS.md`（目录树、导航描述、API 列表、FAQ 使用计数、测试计数、CDN 页面清单）
- Modify: `docs/2026-08-17-tool-candidates-design.md`（第 103 行勾选八字合婚）

**Interfaces:**
- Consumes: Task 1–7 全部产出。
- Produces: 生产部署（git push → Cloudflare 自动构建）。

- [ ] **Step 1: 更新 AGENTS.md（六处）**

1. 目录树 `ziwei/` 行后追加一行：

```text
  hehun/              八字合婚解读模块：validate 请求校验 / prompt 提示词 / types 共享类型（零重算，双人命盘与配对关系由前端算好传入）
```

2. `  routes/ziwei.ts     POST /api/ziwei/interpret：限流→校验→LLM→Markdown 返回` 行后追加：

```text
  routes/hehun.ts     POST /api/hehun/interpret：限流→校验→LLM→Markdown 返回
```

3. `  ziwei.js            前端 iztro 排盘 + 4×4 盘格渲染 + 三段串行解读渲染` 行后追加：

```text
  hehun.js            前端 lunar-javascript 双人排盘 + 地支/天干关系查表（与 fortune/rules.ts 同值）+ 配对徽章 + 单段解读渲染
```

4. `layout/nav.ts` 一行中「命理」下拉描述改为（只改命理部分，占卜/运势描述不动）：

```text
  layout/nav.ts       品牌块（logo.png + 站名）+ 导航（含「命理」下拉：MINGLI_NAV_LABEL/MINGLI_NAV_ITEMS，八字排盘/紫微斗数/八字合婚，标题链接 mingli 总览页；「占卜」下拉：DIVINATION_NAV_LABEL/DIVINATION_NAV_ITEMS，六爻起卦/梅花易数/小六壬，标题链接 divination 总览页；「运势」下拉：FORTUNE_NAV_LABEL/FORTUNE_NAV_ITEMS，每日/每周/每月运势；三个下拉均纯 CSS）+ 语言切换
```

5. 「API 形状」第 6 条已落地实例列表末尾（ziwei 之后）追加：

```text
；`POST /api/hehun/interpret`（见 `src/routes/hehun.ts`，错误码同 liuyao）
```

6. FAQ 页面一节中「（择吉页首个使用，占卜总览页第二例，紫微斗数页第三例，上线后宜用 Google Rich Results Test 验证）」改为：

```text
（择吉页首个使用，占卜总览页第二例，紫微斗数页第三例，八字合婚页与命理总览页第四、五例，上线后宜用 Google Rich Results Test 验证）
```

7. `public/assets/` 说明行中「bazi/liuyao/meihua/xiaoliuren/zeji 页面经 CDN 统一加载 lunar-javascript 1.7.7」改为：

```text
bazi/liuyao/meihua/xiaoliuren/zeji/hehun 页面经 CDN 统一加载 lunar-javascript 1.7.7
```

8. `  test/                 33 个测试文件、390 个测试（SELF.fetch 集成测试 + 单元测试）` 行：跑完 `npm test` 后按实际输出把「文件数/测试数」改为真实数字（预计 36 个文件；输出行 `Test Files  N passed` 与 `Tests  M passed`）。

- [ ] **Step 2: 勾选候选清单**

`docs/2026-08-17-tool-candidates-design.md` 第 103 行：

```text
- [ ] 八字合婚
```

改为：

```text
- [x] 八字合婚
```

- [ ] **Step 3: 全量门禁（最终）**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && npm test && npm run typecheck
```

Expected: 全绿。

- [ ] **Step 4: 提交文档**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && git add AGENTS.md docs/2026-08-17-tool-candidates-design.md && git commit -m "docs: update agents guide for hehun rollout and tick candidate"
```

- [ ] **Step 5: 推送（唯一一次 push）**

```bash
cd "D:\Projects\study\suanming-zhanbu-workers" && git push
```

Expected: Cloudflare Workers Builds 自动执行 `npx wrangler deploy`；等待 2–3 分钟部署完成。

- [ ] **Step 6: 生产环境浏览器验证（https://suanming-zhanbu.com/）**

浏览器（builtin_browser）逐项验证：

1. `/zh/` 首页导航：「命理」标题是链接（指向 `/zh/mingli/`）；悬停出现八字排盘/紫微斗数/八字合婚。
2. `/zh/mingli/`：三工具卡（乾/紫/囍图标）+ 对比表 + FAQ；点「开始合婚」进入合婚页。
3. `/zh/hehun/`：默认值提交 → 双盘 + 三枚徽章（年支六合（子丑）/日支同支（戌戌）/日干无五合）+ AI 合婚解读。
4. `/en/hehun/`：英文表单提交 → 英文解读。
5. 页脚工具列出现「八字合婚」链接。
6. `https://suanming-zhanbu.com/sitemap.xml` 含 `/zh/hehun/`、`/en/hehun/`、`/zh/mingli/`、`/en/mingli/`。
7. （可选抽查）Google Rich Results Test 验证 hehun/mingli 页 FAQPage JSON-LD。

---

## 任务依赖图

```
Task 1 (types/validate) ─→ Task 2 (prompt) ─→ Task 3 (route) ─→ Task 4 (hehun 页) ─→ Task 5 (mingli 页) ─→ Task 6 (导航/页脚) ─→ Task 7 (hehun.js) ─→ Task 8 (文档/推送/生产验证)
```

严格顺序执行；Task 5 依赖 Task 4 的 `findPage("hehun")`（CTA 链接），Task 6 依赖 Task 4/5 的 registry 条目，Task 7 依赖 Task 4 的页面 DOM 与 Task 3 的 API。
