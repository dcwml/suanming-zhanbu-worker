# 历法数据 API 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `npm run almanac` / `fortune:week` / `fortune:month` 的确定性历法计算做成线上 GET API（`/api/almanac`、`/api/fortune/week`、`/api/fortune/month`），与本地 CLI 共享同一实现，输出结构完全一致。

**Architecture:** 计算核心（`compute()` / `buildWeek()` / `buildMonth()`）从 `scripts/` 下沉到 `src/`，scripts 变薄壳（argv 解析 + 打印），新路由 `src/routes/almanac.ts` 挂三个 GET 端点，`x-api-key` 头与 secret `ALMANAC_API_KEY` 比对鉴权，未配置 secret 时 503 `not_configured`。零 LLM、零缓存、零 ratelimit。

**Tech Stack:** Hono（现有 `/api/*` 子应用）、lunar-javascript 1.7.7（纯计算历法库，移入 dependencies）、TypeScript strict、@cloudflare/vitest-pool-workers（真实 Workers 运行时测试）。

**设计文档:** `docs/superpowers/specs/2026-08-27-almanac-api-design.md`

## Global Constraints

- Shell 是 Windows PowerShell 5.1：语句分隔用 `;`，不用 `&&`；curl 必须用 `curl.exe`。
- 提交前必须通过：`npm run typecheck` + `npm test`（Windows 上测试结束时 miniflare EBUSY 警告是无害噪音）。
- `/api/*` 统一响应壳：`{ ok: true, data }` / `{ ok: false, error: { code, message } }`。
- 错误响应回显用户输入必须截断（本项目现有惯例 `slice(0, 128)`）。
- tsconfig `include` 是 `["src", "test", "vitest.config.ts"]`：**移入 src/ 的代码会进入 typecheck**；lunar-javascript 无类型声明，需补 ambient `.d.ts`（先例：`src/html.d.ts`）。
- 时间处理纪律：日期字符串运算一律走 UTC 纯函数（`addDays`），「今天」用 `toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" })`；禁止裸用 `new Date()` 当地时间拼日期（Workers 是 UTC，早 8 点前差一天）。
- 本计划全程在 main 分支直接提交（项目惯例，见 Zeji 工作流决策）。
- 每个任务结束时只 `git add` 该任务列出的文件，commit message 用任务里给定的文本。

---

### Task 1: 下沉 compute() 到 src/almanac/，CLI 薄壳化

**Files:**
- Create: `src/almanac/compute.ts`
- Create: `src/lunar-javascript.d.ts`
- Rewrite: `scripts/almanac.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: 无（纯搬运）
- Produces: `compute(dateStr: string)`（`src/almanac/compute.ts` 导出，返回结构与今日 CLI stdout 的 JSON 对象完全相同）——Task 2 的 `skeleton.ts` 与 Task 3/4 的路由依赖它。

- [ ] **Step 1: 捕获改动前的黄金输出（字节级）**

```powershell
cmd /c "npx tsx scripts/almanac.ts 2026-08-17 > tmp\almanac-0817-before.json 2>&1"
```

说明：用 `cmd /c` 重定向拿原始字节（PowerShell 管道会转码）；`tmp\` 已存在且不入库。此文件是 Task 1/5 的比对基准。

- [ ] **Step 2: 创建 `src/lunar-javascript.d.ts`**

lunar-javascript 1.7.7 无类型声明，进 typecheck 范围会报 TS7016。只声明 `compute()` 用到的 API 面：

```ts
// lunar-javascript 1.7.7 未附带类型声明；此处只声明 src/almanac/compute.ts 用到的 API 面。
// 升级 lunar-javascript 或新增调用时同步扩充。
declare module "lunar-javascript" {
  export interface JieQiNode {
    getName(): string;
    getSolar(): { toYmd(): string };
  }

  export interface Lunar {
    getDayInGanZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getDayShengXiao(): string;
    getDayChong(): string;
    getDayChongShengXiao(): string;
    getDayNaYin(): string;
    getDayTianShen(): string;
    getDayTianShenLuck(): string;
    getDayYi(): string[];
    getDayJi(): string[];
    getDayJiShen(): string[];
    getDayXiongSha(): string[];
    getDayPositionXiDesc(): string;
    getDayPositionCaiDesc(): string;
    getDayPositionFuDesc(): string;
    getJieQi(): string;
    getPrevJieQi(includeEnd: boolean): JieQiNode;
    getNextJieQi(includeEnd: boolean): JieQiNode;
    getYearInGanZhi(): string;
    getMonthInGanZhi(): string;
    toString(): string;
  }

  export interface Solar {
    getLunar(): Lunar;
  }

  export const Solar: {
    fromYmd(y: number, m: number, d: number): Solar;
  };
}
```

- [ ] **Step 3: 创建 `src/almanac/compute.ts`（自 scripts/almanac.ts 原样搬入，函数体零改动）**

```ts
// 历法计算核心：单日黄历数据（四柱干支、五行纳音、冲煞、方位神、节气、宜忌、吉神凶煞）。
// Worker 运行时（/api/almanac）与本地 CLI（scripts/almanac.ts）共用同一实现，
// 保证线上 API 与 npm run almanac 的输出完全一致。
// 底层历法来自 lunar-javascript（纯计算、无第三方依赖，类型声明见 src/lunar-javascript.d.ts）。
import { Solar } from "lunar-javascript";

/** 天干 → 五行 */
const GAN_WUXING: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

export function compute(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const solar = Solar.fromYmd(y, m, d);
  const lunar = solar.getLunar();
  const dayGanZhi = lunar.getDayInGanZhi();
  const dayGan = lunar.getDayGan();
  const dayZhi = lunar.getDayZhi();
  const wuxing = GAN_WUXING[dayGan] ?? "?";
  const zodiac = lunar.getDayShengXiao(); // 当日地支生肖
  const chongZhi = lunar.getDayChong(); // 被冲地支
  const chongZodiac = lunar.getDayChongShengXiao(); // 被冲生肖
  const naYin = lunar.getDayNaYin(); // 纳音
  const tianShen = lunar.getDayTianShen(); // 天神（黄黑道）
  const tianShenLuck = lunar.getDayTianShenLuck(); // 吉/凶
  const yi = lunar.getDayYi(); // 宜（库自带权威宜忌）
  const ji = lunar.getDayJi(); // 忌
  const jiShen = lunar.getDayJiShen(); // 吉神
  const xiongSha = lunar.getDayXiongSha(); // 凶煞

  // 方位神（喜神/财神/福神）
  const xiShen = lunar.getDayPositionXiDesc(); // 喜神方位
  const caiShen = lunar.getDayPositionCaiDesc(); // 财神方位
  const fuShen = lunar.getDayPositionFuDesc(); // 福神方位

  // 节气：当日节气（空串 = 非节气日）+ 前后最近节气
  const jieQi = lunar.getJieQi();
  const prevJieQiNode = lunar.getPrevJieQi(true); // includeEnd=true：节气日当天该节气即为"上一节气"
  const nextJieQiNode = lunar.getNextJieQi(true);
  const prevJieQi = { name: prevJieQiNode.getName(), solar: prevJieQiNode.getSolar().toYmd() };
  const nextJieQi = { name: nextJieQiNode.getName(), solar: nextJieQiNode.getSolar().toYmd() };

  // 四柱
  const yearGanZhi = lunar.getYearInGanZhi(); // 年柱
  const monthGanZhi = lunar.getMonthInGanZhi(); // 月柱
  // 时柱：以子时（23:00-01:00）为例，由日干起"五鼠遁"推算时干
  const hourGanZhi = computeHourGanZhi(dayGan, "子"); // 时柱（子时）

  return {
    solar: `${y}年${m}月${d}日`,
    lunar: lunar.toString(),
    // 四柱
    yearGanZhi,
    monthGanZhi,
    dayGanZhi,
    hourGanZhi,
    // 日柱详情
    dayGan,
    dayZhi,
    wuxing,
    zodiac,
    chongZhi,
    chongZodiac,
    naYin,
    tianShen,
    tianShenLuck,
    yi,
    ji,
    jiShen,
    xiongSha,
    // 方位神
    xiShen,
    caiShen,
    fuShen,
    // 节气（jieQi 为空串表示当日非节气日）
    jieQi,
    prevJieQi,
    nextJieQi,
  };
}

/** 五鼠遁：根据日干推算子时的天干 */
function computeHourGanZhi(dayGan: string, hourZhi: string): string {
  // 日干 → 子时天干映射（五鼠遁日起）
  const ZI_GAN: Record<string, string> = {
    甲: "甲", 己: "甲",   // 甲己还加甲
    乙: "丙", 庚: "丙",   // 乙庚丙作初
    丙: "戊", 辛: "戊",   // 丙辛从戊起
    丁: "庚", 壬: "庚",   // 丁壬庚子居
    戊: "壬", 癸: "壬",   // 戊癸何方发，壬子是真途
  };
  const gan = ZI_GAN[dayGan] ?? "?";
  return `${gan}${hourZhi}`;
}
```

- [ ] **Step 4: 重写 `scripts/almanac.ts` 为薄壳（CLI 行为不变）**

```ts
/* eslint-disable */
// 生成期 CLI 薄壳：参数解析 + 输出。计算核心在 src/almanac/compute.ts（与线上 /api/almanac 共用）。
// 仅在本地 Node 运行，不入 Worker 运行时。
// 用法：npm run almanac -- 2026-08-03
import { compute } from "../src/almanac/compute";

const arg = process.argv[2];
const today = new Date();
const dateStr = arg ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
  console.error(`Invalid date: ${dateStr} (expected YYYY-MM-DD)`);
  process.exit(1);
}

console.log(JSON.stringify(compute(dateStr), null, 2));
```

说明：原文件的 `isDirectRun` 守卫删除——`fortune.ts` 改为 import `src/` 核心后，不再有模块引用 `scripts/almanac.ts`，它只作为 CLI 被直接执行。

- [ ] **Step 5: `package.json` 把 lunar-javascript 移到 dependencies**

`devDependencies` 中删除 `"lunar-javascript": "^1.7.7",` 一行；`dependencies` 改为：

```json
  "dependencies": {
    "hono": "^4.6.0",
    "lunar-javascript": "^1.7.7"
  },
```

不需要重装/重锁（包已在 node_modules，仅声明位置变化；`npm install` 会同步 lockfile 的 dev 标记，跑一次 `npm install` 即可）。

- [ ] **Step 6: 验证输出零漂移 + typecheck**

```powershell
cmd /c "npx tsx scripts/almanac.ts 2026-08-17 > tmp\almanac-0817-after.json 2>&1"
cmd /c "fc /b tmp\almanac-0817-before.json tmp\almanac-0817-after.json"
npm run almanac -- 2026-08-27
npm run almanac -- bad-date; echo "exit=$LASTEXITCODE"
npm run typecheck
```

预期：`fc /b` 输出 `no differences encountered`；`npm run almanac -- 2026-08-27`（或当天日期）正常打印 JSON；`bad-date` 打印 `Invalid date: bad-date (expected YYYY-MM-DD)` 且 `exit=1`；typecheck 零错误。

- [ ] **Step 7: Commit**

```powershell
git add src/almanac/compute.ts src/lunar-javascript.d.ts scripts/almanac.ts package.json package-lock.json
git commit -m "refactor(almanac): move compute() into src/ for CLI/API sharing"
```

---

### Task 2: 下沉 buildWeek/buildMonth 到 src/fortune/skeleton.ts，CLI 薄壳化

**Files:**
- Create: `src/fortune/skeleton.ts`
- Rewrite: `scripts/fortune.ts`
- Modify: `src/fortune/rules.ts`（仅头注释）

**Interfaces:**
- Consumes: `compute(dateStr)`（Task 1）；`src/fortune/rules.ts` 现有导出（`ZODIACS`、`ZODIAC_EN`、`ZODIAC_OF_BRANCH`、`BRANCH_OF_ZODIAC`、`branchRelation`、`liuchongOf`、`liuhaiOf`、`liuheOf`、`pickFortuneRanks`、`sanhePartners`、`shaDirection`、`weekZodiacScores`、`Branch`、`Zodiac`）。
- Produces: `buildWeek(monday: string)`、`buildMonth(month: string)`、`addDays(iso: string, n: number): string`（均自 `src/fortune/skeleton.ts` 导出）。非法参数由 `throw new Error(...)` 表达（不再 `process.exit`），message 文案与今日 CLI 一致——Task 4 的路由 catch 后转 400。

- [ ] **Step 1: 捕获改动前的黄金输出（字节级）**

```powershell
cmd /c "npx tsx scripts/fortune.ts week 2026-08-17 > tmp\week-0817-before.json 2>&1"
cmd /c "npx tsx scripts/fortune.ts month 2026-08 > tmp\month-08-before.json 2>&1"
```

- [ ] **Step 2: 创建 `src/fortune/skeleton.ts`（自 scripts/fortune.ts 原样搬入；仅两处适配：校验失败从 console.error+exit 改为 throw；导出 addDays）**

```ts
// 周/月运数据骨架核心：Worker 运行时（/api/fortune/week、/api/fortune/month）
// 与本地 CLI（scripts/fortune.ts）共用同一实现。
// 历法数据一律来自 lunar-javascript（经 src/almanac/compute.ts 的 compute()），
// 地支关系与评分规则来自 src/fortune/rules.ts（有单测）。
// 非法参数以 throw Error 表达：CLI 壳 catch 后打印 + exit(1)，API 层 catch 后转 400。
import {
  ZODIACS,
  ZODIAC_EN,
  ZODIAC_OF_BRANCH,
  BRANCH_OF_ZODIAC,
  branchRelation,
  liuchongOf,
  liuhaiOf,
  liuheOf,
  pickFortuneRanks,
  sanhePartners,
  shaDirection,
  weekZodiacScores,
  type Branch,
  type Zodiac,
} from "./rules";
import { compute } from "../almanac/compute";

const WEEKDAY_ZH = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const WEEKDAY_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** ISO 日期加 n 天（纯 UTC 运算，无时区歧义；CLI 与 API 的缺省参数推导共用） */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function validateIsoDate(s: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error(`Invalid date: ${s} (expected YYYY-MM-DD)`);
  }
}

/** 年支 → 生肖（由年柱干支第二字推导） */
function yearZodiacOf(yearGanZhi: string): Zodiac {
  return ZODIAC_OF_BRANCH[yearGanZhi.slice(-1) as Branch];
}

export function buildWeek(monday: string) {
  validateIsoDate(monday);
  const [y, m, d] = monday.split("-").map(Number);
  if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() !== 1) {
    const dt = new Date(Date.UTC(y, m - 1, d));
    const offset = (dt.getUTCDay() + 6) % 7;
    throw new Error(`${monday} 不是周一；该周周一为 ${addDays(monday, -offset)}`);
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const c = compute(date);
    const dayZhi = c.dayZhi as Branch;
    return {
      date,
      weekdayZh: WEEKDAY_ZH[i],
      weekdayEn: WEEKDAY_EN[i],
      lunar: c.lunar,
      dayGanZhi: c.dayGanZhi,
      dayGan: c.dayGan,
      dayZhi,
      wuxing: c.wuxing,
      zodiac: c.zodiac,
      chongZhi: c.chongZhi,
      chongZodiac: c.chongZodiac,
      sha: shaDirection(dayZhi),
      naYin: c.naYin,
      tianShen: c.tianShen,
      tianShenLuck: c.tianShenLuck,
      yi: c.yi,
      ji: c.ji,
      jieQi: c.jieQi,
    };
  });

  const first = compute(monday);
  const yearZodiac = yearZodiacOf(first.yearGanZhi);
  const scores = weekZodiacScores(
    days.map((day, i) => ({ date: day.date, weekday: i + 1, dayZhi: day.dayZhi })),
  );
  const ranks = pickFortuneRanks(scores, yearZodiac);

  return {
    mode: "week",
    week: { monday, sunday: addDays(monday, 6) },
    yearGanZhi: first.yearGanZhi,
    yearZodiac,
    monthGanZhi: first.monthGanZhi,
    days,
    zodiacs: scores.map((s) => ({
      zodiac: s.zodiac,
      en: ZODIAC_EN[s.zodiac],
      branch: s.branch,
      score: s.score,
      negatives: s.negatives,
      relations: s.relations.map((r) => ({
        date: r.date,
        weekdayZh: WEEKDAY_ZH[r.weekday - 1],
        weekdayEn: WEEKDAY_EN[r.weekday - 1],
        kind: r.kind,
      })),
    })),
    ranks: {
      teJi: ranks.teJi.map((z) => ({ zodiac: z, en: ZODIAC_EN[z] })),
      ciJi: ranks.ciJi.map((z) => ({ zodiac: z, en: ZODIAC_EN[z] })),
      zhonggao: { zodiac: ranks.zhonggao, en: ZODIAC_EN[ranks.zhonggao] },
    },
  };
}

/** 吉日速查分类：类别 → 宜项关键词 */
const LUCKY_CATEGORIES: ReadonlyArray<{ key: string; zh: string; en: string; keywords: string[] }> = [
  { key: "marriage", zh: "嫁娶订婚", en: "Marriage & engagement", keywords: ["嫁娶", "纳采", "订盟"] },
  { key: "moving", zh: "入宅搬家", en: "Moving & relocation", keywords: ["入宅", "移徙", "安床"] },
  { key: "business", zh: "开业求财", en: "Business & wealth", keywords: ["开市", "交易", "立券", "纳财"] },
  { key: "travel", zh: "出行", en: "Travel", keywords: ["出行"] },
  { key: "building", zh: "修造动土", en: "Construction", keywords: ["修造", "动土", "竖柱", "上梁", "盖屋"] },
];

export function buildMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error(`Invalid month: ${month} (expected YYYY-MM)`);
  }
  const [y, m] = month.split("-").map(Number);
  const dayCount = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const dates = Array.from({ length: dayCount }, (_, i) =>
    `${month}-${String(i + 1).padStart(2, "0")}`,
  );
  const computed = dates.map((date) => ({ date, ...compute(date) }));

  // 月柱分段（月柱在节气交接处变化）
  const monthPillarSegments: { monthGanZhi: string; from: string; to: string }[] = [];
  for (const c of computed) {
    const last = monthPillarSegments[monthPillarSegments.length - 1];
    if (last && last.monthGanZhi === c.monthGanZhi) last.to = c.date;
    else monthPillarSegments.push({ monthGanZhi: c.monthGanZhi, from: c.date, to: c.date });
  }

  // 月中（15 日）月柱作为本月代表
  const mid = computed[14];
  const monthBranch = mid.monthGanZhi.slice(-1) as Branch;

  const jieQiInMonth = computed
    .filter((c) => c.jieQi !== "")
    .map((c) => ({ name: c.jieQi, date: c.date }));

  // 生肖与本月月支的关系
  const zodiacs = ZODIACS.map((zodiac) => {
    const branch = BRANCH_OF_ZODIAC[zodiac];
    const rel = branchRelation(monthBranch, branch);
    return {
      zodiac,
      en: ZODIAC_EN[zodiac],
      branch,
      monthRelation: rel === "值日" ? "值月" : rel,
    };
  });

  // 吉日速查：分类扫描（仅黄道吉日，且该事项不在当日忌列）
  const luckyDays = LUCKY_CATEGORIES.map((cat) => {
    const hits = computed
      .map((c) => {
        const matchedYi = c.yi.filter((term: string) =>
          cat.keywords.some((kw) => term.includes(kw)),
        );
        const blocked = matchedYi.filter((term: string) => c.ji.includes(term));
        const ok = matchedYi.filter((term: string) => !blocked.includes(term));
        if (ok.length === 0 || c.tianShenLuck !== "吉") return null;
        const [yy, mm, dd] = c.date.split("-").map(Number);
        const wd = new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay();
        return {
          date: c.date,
          weekdayZh: WEEKDAY_ZH[(wd + 6) % 7],
          weekdayEn: WEEKDAY_EN[(wd + 6) % 7],
          lunar: c.lunar,
          dayGanZhi: c.dayGanZhi,
          tianShen: c.tianShen,
          chongZodiac: c.chongZodiac,
          sha: shaDirection(c.dayZhi as Branch),
          matched: ok,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    return { key: cat.key, zh: cat.zh, en: cat.en, days: hits };
  }).filter((cat) => cat.days.length > 0);

  return {
    mode: "month",
    month,
    yearGanZhi: mid.yearGanZhi,
    yearZodiac: yearZodiacOf(mid.yearGanZhi),
    monthGanZhi: mid.monthGanZhi,
    monthBranch,
    monthPillarSegments,
    jieQiInMonth,
    monthBranchHelpers: {
      liuhe: ZODIAC_OF_BRANCH[liuheOf(monthBranch)],
      liuchong: ZODIAC_OF_BRANCH[liuchongOf(monthBranch)],
      liuhai: ZODIAC_OF_BRANCH[liuhaiOf(monthBranch)],
      sanhe: sanhePartners(monthBranch).map((b) => ZODIAC_OF_BRANCH[b]),
    },
    zodiacs,
    luckyDays,
  };
}
```

- [ ] **Step 3: 重写 `scripts/fortune.ts` 为薄壳（CLI 行为不变，错误经 catch 呈现）**

```ts
/* eslint-disable */
// 生成期 CLI 薄壳：参数解析 + 输出。计算核心在 src/fortune/skeleton.ts（与线上 /api/fortune/* 共用）。
// 仅在本地 Node 运行，不入 Worker 运行时。
//
// 用法：
//   npm run fortune:week -- 2026-08-17     # 参数必须是周一，输出该周 7 天骨架 + 生肖评分 + 吉运排序
//   npm run fortune:month -- 2026-08       # 输出该月月柱分段、节气、生肖月关系、吉日速查
import { buildWeek, buildMonth } from "../src/fortune/skeleton";

const mode = process.argv[2];
const target = process.argv[3];

try {
  if (mode === "week" && target) {
    console.log(JSON.stringify(buildWeek(target), null, 2));
  } else if (mode === "month" && target) {
    console.log(JSON.stringify(buildMonth(target), null, 2));
  } else {
    console.error("用法：npm run fortune:week -- YYYY-MM-DD（周一） | npm run fortune:month -- YYYY-MM");
    process.exit(1);
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
```

- [ ] **Step 4: 修正 `src/fortune/rules.ts` 头注释（原文声明已过时）**

把文件头三行注释：

```ts
/* 生成期规则表：地支关系（六合/三合/相冲/相害）与生肖周运评分。
 * 仅供 scripts/fortune.ts 在生成期引用，不接入任何 Worker 运行时路由；
 * 放在 src/ 下是为了纳入 typecheck 与 vitest 单测（纯函数，零运行时依赖）。 */
```

替换为：

```ts
/* 生成期与线上 API 共用的规则表：地支关系（六合/三合/相冲/相害）与生肖周运评分。
 * 引用方：src/fortune/skeleton.ts（→ scripts/fortune.ts CLI 与 /api/fortune/* 路由）；
 * 纯函数、零运行时依赖，放 src/ 下纳入 typecheck 与 vitest 单测。 */
```

- [ ] **Step 5: 验证输出零漂移 + 错误路径 + typecheck + 相关单测**

```powershell
cmd /c "npx tsx scripts/fortune.ts week 2026-08-17 > tmp\week-0817-after.json 2>&1"
cmd /c "fc /b tmp\week-0817-before.json tmp\week-0817-after.json"
cmd /c "npx tsx scripts/fortune.ts month 2026-08 > tmp\month-08-after.json 2>&1"
cmd /c "fc /b tmp\month-08-before.json tmp\month-08-after.json"
npm run fortune:week -- 2026-08-19; echo "exit=$LASTEXITCODE"
npm run typecheck
npx vitest run test/fortune-rules.test.ts
```

预期：两个 `fc /b` 均 `no differences encountered`；`2026-08-19`（周三）打印 `2026-08-19 不是周一；该周周一为 2026-08-17` 且 `exit=1`；typecheck 零错误；fortune-rules 单测全绿。

- [ ] **Step 6: Commit**

```powershell
git add src/fortune/skeleton.ts src/fortune/rules.ts scripts/fortune.ts
git commit -m "refactor(fortune): move week/month builders into src/fortune/skeleton"
```

---

### Task 3: GET /api/almanac 端点（TDD）

**Files:**
- Create: `test/almanac-api.test.ts`
- Create: `src/routes/almanac.ts`
- Modify: `src/routes/api.ts`

**Interfaces:**
- Consumes: `compute(dateStr)`（Task 1）；`recordApiCall(db: D1Database, apiPath: string)`、`StatsEnv { STATS_DB?: D1Database }`（`src/stats.ts` 现有导出）。
- Produces: `AlmanacEnv { ALMANAC_API_KEY?: string }` 与 `registerAlmanacRoutes(api: Hono<{ Bindings: AlmanacEnv & StatsEnv }>): void`（`src/routes/almanac.ts` 导出）——Task 4 在同文件追加两个端点；`src/routes/api.ts` 的 Bindings 并入 `AlmanacEnv`。

- [ ] **Step 1: 写失败测试 `test/almanac-api.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { api } from "../src/routes/api";
import type { AlmanacEnv } from "../src/routes/almanac";

const baseEnv: AlmanacEnv = { ALMANAC_API_KEY: "test-key" };

function req(path: string, key?: string): Request {
  const headers: Record<string, string> = {};
  if (key !== undefined) headers["x-api-key"] = key;
  return new Request(`http://localhost${path}`, { headers });
}

type ApiJson = {
  ok: boolean;
  data?: any;
  error?: { code: string; message?: string };
};

describe("GET /api/almanac", () => {
  it("returns 503 not_configured when ALMANAC_API_KEY is not set", async () => {
    const res = await api.fetch(req("/api/almanac", "any"), {});
    expect(res.status).toBe(503);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("not_configured");
  });

  it("returns 401 unauthorized without x-api-key", async () => {
    const res = await api.fetch(req("/api/almanac"), baseEnv);
    expect(res.status).toBe(401);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("unauthorized");
  });

  it("returns 401 unauthorized with wrong key", async () => {
    const res = await api.fetch(req("/api/almanac", "wrong"), baseEnv);
    expect(res.status).toBe(401);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("unauthorized");
  });

  it("returns 400 invalid_request on malformed date", async () => {
    const res = await api.fetch(req("/api/almanac?date=2026/08/17", "test-key"), baseEnv);
    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("invalid_request");
  });

  it("returns known-day data matching local CLI output (2026-08-17)", async () => {
    // 锚点值来自 npm run almanac -- 2026-08-17 的实际输出（黄金文件 tmp/almanac-0817-before.json）
    const res = await api.fetch(req("/api/almanac?date=2026-08-17", "test-key"), baseEnv);
    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiJson;
    expect(json.ok).toBe(true);
    expect(json.data).toMatchObject({
      yearGanZhi: "丙午",
      monthGanZhi: "丙申",
      dayGanZhi: "癸亥",
      lunar: "二〇二六年七月初五",
      tianShen: "勾陈",
    });
    expect(json.data.yi).toContain("祭祀");
    expect(json.data.ji).toContain("嫁娶");
  });

  it("defaults to today (Shanghai) when date is omitted", async () => {
    const res = await api.fetch(req("/api/almanac", "test-key"), baseEnv);
    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiJson;
    expect(json.ok).toBe(true);
    expect(json.data.dayGanZhi).toMatch(/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```powershell
npx vitest run test/almanac-api.test.ts
```

预期：FAIL——`../src/routes/almanac` 模块尚不存在（Cannot find module）；若先建了空模块，则请求落到 `/api/*` 兜底返回 404 `not_found`（第一个用例期望 503，实际 404）。

- [ ] **Step 3: 创建 `src/routes/almanac.ts`（本任务先实现 /almanac 一个端点；week/month 端点 Task 4 追加）**

```ts
import type { Hono } from "hono";
import { compute } from "../almanac/compute";
import { recordApiCall } from "../stats";
import type { StatsEnv } from "../stats";

/** 历法数据 API 环境变量（鉴权 secret：生产 wrangler secret put / 本地 .dev.vars） */
export interface AlmanacEnv {
  ALMANAC_API_KEY?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

function err(code: string, message: string) {
  return { ok: false as const, error: { code, message } };
}

/** 鉴权：未配置 secret → 503（防忘配裸奔）；key 缺失/不匹配 → 401 */
function authProblem(
  env: AlmanacEnv | undefined,
  apiKeyHeader: string | undefined,
): { code: string; message: string; status: number } | null {
  const expected = env?.ALMANAC_API_KEY;
  if (!expected) return { code: "not_configured", message: "Almanac API is not configured.", status: 503 };
  if (apiKeyHeader !== expected) return { code: "unauthorized", message: "Invalid or missing x-api-key header.", status: 401 };
  return null;
}

/** 上海时区今天的 ISO 日期（Workers 的 new Date() 是 UTC，不换算的话早 8 点前会差一天） */
function shanghaiToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
}

/** 注册历法数据路由（在 api 子应用内，basePath 已是 /api） */
export function registerAlmanacRoutes(api: Hono<{ Bindings: AlmanacEnv & StatsEnv }>): void {
  api.get("/almanac", async (c) => {
    // 0. 记录 API 调用（异步，不阻塞主流程；与 zeji 等现有路由一致）
    const db = c.env?.STATS_DB;
    if (db) {
      recordApiCall(db, "/api/almanac").catch(() => {});
    }

    // 1. 鉴权
    const denied = authProblem(c.env, c.req.header("x-api-key"));
    if (denied) return c.json(err(denied.code, denied.message), denied.status);

    // 2. 参数校验（回显截断，同 404 兜底惯例）
    const raw = c.req.query("date");
    if (raw !== undefined && !DATE_RE.test(raw)) {
      return c.json(err("invalid_request", `Invalid date: ${raw.slice(0, 128)} (expected YYYY-MM-DD)`), 400);
    }

    // 3. 计算（与 npm run almanac 同一核心）
    return c.json({ ok: true, data: compute(raw ?? shanghaiToday()) });
  });
}
```

说明：`MONTH_RE` 本任务先定义（Task 4 的 month 端点使用），避免下个任务再动文件头。

- [ ] **Step 4: 在 `src/routes/api.ts` 注册**

三处修改（保持现有 import/注册顺序风格）：

函数 import 区，在 `import { registerBaziRoutes } from "./bazi";` 之前（字母序 `./almanac` 排最前）加：

```ts
import { registerAlmanacRoutes } from "./almanac";
```

类型 import 区（各 `import type { ... }` 处），在 `import type { BaziEnv } from "../bazi/types";` 之前加：

```ts
import type { AlmanacEnv } from "./almanac";
```

Bindings 类型（第 23 行）追加 `& AlmanacEnv`：

```ts
export const api = new Hono<{ Bindings: BaziEnv & LiuyaoEnv & MeihuaEnv & XiaoliurenEnv & ZejiEnv & ZiweiEnv & HehunEnv & AlmanacEnv & StatsEnv }>().basePath("/api");
```

import 区补类型：

```ts
import type { AlmanacEnv } from "./almanac";
```

注册（`registerHehunRoutes(api);` 之后、`api.all("*")` 之前）：

```ts
registerAlmanacRoutes(api);
```

- [ ] **Step 5: 运行测试确认通过 + typecheck**

```powershell
npx vitest run test/almanac-api.test.ts
npm run typecheck
```

预期：6 个用例全绿；typecheck 零错误。

- [ ] **Step 6: Commit**

```powershell
git add test/almanac-api.test.ts src/routes/almanac.ts src/routes/api.ts
git commit -m "feat(api): add GET /api/almanac with x-api-key auth"
```

---

### Task 4: GET /api/fortune/week 与 /api/fortune/month 端点（TDD）

**Files:**
- Modify: `test/almanac-api.test.ts`（追加两个 describe）
- Modify: `src/routes/almanac.ts`（追加两个端点 + shanghaiMonday）

**Interfaces:**
- Consumes: `buildWeek(monday)`、`buildMonth(month)`、`addDays(iso, n)`（Task 2）；`authProblem`、`err`、`shanghaiToday`、`DATE_RE`、`MONTH_RE`（Task 3，同文件内）。
- Produces: 无新增对外接口（三个端点齐备）。

- [ ] **Step 1: 追加失败测试到 `test/almanac-api.test.ts`**

```ts
describe("GET /api/fortune/week", () => {
  it("returns 503 not_configured when ALMANAC_API_KEY is not set", async () => {
    const res = await api.fetch(req("/api/fortune/week", "any"), {});
    expect(res.status).toBe(503);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("not_configured");
  });

  it("returns 401 unauthorized without x-api-key", async () => {
    const res = await api.fetch(req("/api/fortune/week"), baseEnv);
    expect(res.status).toBe(401);
  });

  it("returns 400 invalid_request on malformed monday", async () => {
    const res = await api.fetch(req("/api/fortune/week?monday=20260817", "test-key"), baseEnv);
    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("invalid_request");
  });

  it("returns 400 with correct-monday hint when monday is not a Monday", async () => {
    // 2026-08-19 是周三；buildWeek 抛错的 message 含该周正确周一 2026-08-17
    const res = await api.fetch(req("/api/fortune/week?monday=2026-08-19", "test-key"), baseEnv);
    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("invalid_request");
    expect(json.error?.message).toContain("2026-08-17");
  });

  it("reproduces the backtested 2026-08-17 week ranks", async () => {
    // 名次锚点来自 test/fortune-rules.test.ts 的黄大仙祠 2026-08-17 周回归用例
    const res = await api.fetch(req("/api/fortune/week?monday=2026-08-17", "test-key"), baseEnv);
    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiJson;
    expect(json.ok).toBe(true);
    expect(json.data.week).toEqual({ monday: "2026-08-17", sunday: "2026-08-23" });
    expect(json.data.days).toHaveLength(7);
    expect(json.data.days[0].date).toBe("2026-08-17");
    expect(json.data.zodiacs).toHaveLength(12);
    expect(json.data.ranks.teJi.map((z: { zodiac: string }) => z.zodiac)).toEqual(["鸡", "鼠", "牛"]);
    expect(json.data.ranks.ciJi.map((z: { zodiac: string }) => z.zodiac)).toEqual(["猴", "狗", "猪"]);
    expect(json.data.ranks.zhonggao.zodiac).toBe("马");
  });

  it("defaults to this week's Monday (Shanghai) when monday is omitted", async () => {
    const res = await api.fetch(req("/api/fortune/week", "test-key"), baseEnv);
    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiJson;
    const [y, m, d] = (json.data.week.monday as string).split("-").map(Number);
    expect(new Date(Date.UTC(y, m - 1, d)).getUTCDay()).toBe(1);
  });
});

describe("GET /api/fortune/month", () => {
  it("returns 503 not_configured when ALMANAC_API_KEY is not set", async () => {
    const res = await api.fetch(req("/api/fortune/month", "any"), {});
    expect(res.status).toBe(503);
  });

  it("returns 400 invalid_request on malformed month", async () => {
    const res = await api.fetch(req("/api/fortune/month?month=2026-8", "test-key"), baseEnv);
    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("invalid_request");
  });

  it("returns deterministic 2026-08 month skeleton", async () => {
    // 2026-08 月中月柱丙申（立秋 8/7 后）；月支申：蛇六合、鼠三合、虎相冲、猪相害、猴值月
    const res = await api.fetch(req("/api/fortune/month?month=2026-08", "test-key"), baseEnv);
    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiJson;
    expect(json.ok).toBe(true);
    expect(json.data.month).toBe("2026-08");
    expect(json.data.monthGanZhi).toBe("丙申");
    expect(json.data.jieQiInMonth.map((j: { name: string }) => j.name)).toContain("立秋");
    const rel = (z: string) =>
      json.data.zodiacs.find((x: { zodiac: string }) => x.zodiac === z).monthRelation;
    expect(rel("蛇")).toBe("六合");
    expect(rel("鼠")).toBe("三合");
    expect(rel("虎")).toBe("相冲");
    expect(rel("猪")).toBe("相害");
    expect(rel("猴")).toBe("值月");
    expect(Array.isArray(json.data.luckyDays)).toBe(true);
    expect(json.data.monthPillarSegments.length).toBeGreaterThanOrEqual(1);
  });

  it("defaults to current month (Shanghai) when month is omitted", async () => {
    const res = await api.fetch(req("/api/fortune/month", "test-key"), baseEnv);
    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiJson;
    expect(json.data.month).toMatch(/^\d{4}-\d{2}$/);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```powershell
npx vitest run test/almanac-api.test.ts
```

预期：新增的 week/month 用例 FAIL（404 not_found），Task 3 的 almanac 用例仍绿。

- [ ] **Step 3: 在 `src/routes/almanac.ts` 追加实现**

import 区补两行（`compute` 导入之后）：

```ts
import { addDays, buildMonth, buildWeek } from "../fortune/skeleton";
```

`shanghaiToday` 函数之后追加：

```ts
/** 上海时区本周周一 */
function shanghaiMonday(): string {
  const today = shanghaiToday();
  const [y, m, d] = today.split("-").map(Number);
  const daysSinceMonday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return addDays(today, -daysSinceMonday);
}
```

`registerAlmanacRoutes` 内 `/almanac` 端点之后追加两个端点：

```ts
  api.get("/fortune/week", async (c) => {
    const db = c.env?.STATS_DB;
    if (db) {
      recordApiCall(db, "/api/fortune/week").catch(() => {});
    }

    const denied = authProblem(c.env, c.req.header("x-api-key"));
    if (denied) return c.json(err(denied.code, denied.message), denied.status);

    const raw = c.req.query("monday");
    if (raw !== undefined && !DATE_RE.test(raw)) {
      return c.json(err("invalid_request", `Invalid date: ${raw.slice(0, 128)} (expected YYYY-MM-DD)`), 400);
    }
    try {
      return c.json({ ok: true, data: buildWeek(raw ?? shanghaiMonday()) });
    } catch (e) {
      // buildWeek 对非周一参数抛错，message 含该周正确周一
      return c.json(err("invalid_request", e instanceof Error ? e.message : "Invalid monday date."), 400);
    }
  });

  api.get("/fortune/month", async (c) => {
    const db = c.env?.STATS_DB;
    if (db) {
      recordApiCall(db, "/api/fortune/month").catch(() => {});
    }

    const denied = authProblem(c.env, c.req.header("x-api-key"));
    if (denied) return c.json(err(denied.code, denied.message), denied.status);

    const raw = c.req.query("month");
    if (raw !== undefined && !MONTH_RE.test(raw)) {
      return c.json(err("invalid_request", `Invalid month: ${raw.slice(0, 128)} (expected YYYY-MM)`), 400);
    }
    try {
      return c.json({ ok: true, data: buildMonth(raw ?? shanghaiToday().slice(0, 7)) });
    } catch (e) {
      return c.json(err("invalid_request", e instanceof Error ? e.message : "Invalid month."), 400);
    }
  });
```

- [ ] **Step 4: 运行测试确认通过 + typecheck**

```powershell
npx vitest run test/almanac-api.test.ts
npm run typecheck
```

预期：全部用例绿；typecheck 零错误。

- [ ] **Step 5: Commit**

```powershell
git add test/almanac-api.test.ts src/routes/almanac.ts
git commit -m "feat(api): add fortune week/month skeleton endpoints"
```

---

### Task 5: 本地端到端验证、API↔CLI 一致性比对、文档同步

**Files:**
- Create: `tmp/compare-almanac-api.cjs`（临时验证脚本，tmp/ 不入库）
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `.dev.vars`（本地文件，不入库；无则创建）

**Interfaces:**
- Consumes: 三个端点（Task 3/4）；`.dev.vars` 的 `ALMANAC_API_KEY`（`npm run dev` 会注入）。

- [ ] **Step 1: `.dev.vars` 加本地密钥**

在 `.dev.vars` 追加一行（值任选，仅本地 dev/联调用）：

```
ALMANAC_API_KEY=dev-local-key
```

- [ ] **Step 2: 写 API↔CLI 一致性比对脚本 `tmp/compare-almanac-api.cjs`**

```js
// 用法：node tmp/compare-almanac-api.cjs [date]（默认 2026-08-17；需先 npm run dev 于 :8787）
const date = process.argv[2] ?? "2026-08-17";
const KEY = "dev-local-key";
(async () => {
  const res = await fetch(`http://localhost:8787/api/almanac?date=${date}`, {
    headers: { "x-api-key": KEY },
  });
  const json = await res.json();
  if (!json.ok) {
    console.error("API error:", JSON.stringify(json));
    process.exit(1);
  }
  const { execSync } = require("child_process");
  const cli = execSync(`npx tsx scripts/almanac.ts ${date}`, { encoding: "utf8" });
  const same = JSON.stringify(json.data) === JSON.stringify(JSON.parse(cli));
  console.log(same ? `MATCH: /api/almanac data identical to CLI output for ${date}` : "MISMATCH");
  process.exit(same ? 0 : 1);
})();
```

- [ ] **Step 3: 启动本地 dev 并跑端到端验证**

```powershell
npm run dev
```

（后台运行，等 `Ready on http://localhost:8787` 后另开终端执行：）

```powershell
curl.exe -s -H "x-api-key: dev-local-key" "http://localhost:8787/api/almanac?date=2026-08-27"
curl.exe -s -H "x-api-key: dev-local-key" "http://localhost:8787/api/fortune/week?monday=2026-08-24"
curl.exe -s -H "x-api-key: dev-local-key" "http://localhost:8787/api/fortune/month?month=2026-08"
curl.exe -s "http://localhost:8787/api/almanac"
curl.exe -s -H "x-api-key: wrong" "http://localhost:8787/api/almanac"
node tmp\compare-almanac-api.cjs 2026-08-17
```

预期：前三条返回 `{"ok":true,"data":{...}}` 且内容与 CLI 黄金输出一致；无 key 返回 401 `unauthorized`；错 key 返回 401；比对脚本输出 `MATCH`。验证完停掉 dev。

- [ ] **Step 4: 更新 `AGENTS.md`**

目录树 `src/` 段（`bazi/` 之前）插入：

```
  almanac/            历法计算核心：compute() 单日黄历（scripts/almanac.ts CLI 与 /api/almanac 共用；lunar-javascript 类型声明见 src/lunar-javascript.d.ts）
```

`fortune/` 行后插入：

```
  fortune/skeleton.ts 周/月骨架核心：buildWeek/buildMonth（scripts/fortune.ts CLI 与 /api/fortune/* 共用；非法参数 throw，CLI 壳转 exit(1)、API 层转 400）
```

`routes/hehun.ts` 行后插入：

```
  routes/almanac.ts   GET /api/almanac、/api/fortune/week、/api/fortune/month：鉴权（x-api-key + ALMANAC_API_KEY secret，未配置 503 not_configured）→ 校验 → 计算 → JSON；缺省参数按 Asia/Shanghai 取今天/本周一/本月
```

`scripts/` 段两行说明改为薄壳口径：

```
  almanac.ts          生成期 CLI 薄壳：参数解析 + 输出（计算核心在 src/almanac/compute.ts）
  fortune.ts          生成期 CLI 薄壳：周/月骨架输出（计算核心在 src/fortune/skeleton.ts）
```

「核心约定」第 6 条（API 形状）的已落地实例清单末尾追加：

```
；GET /api/almanac、/api/fortune/week、/api/fortune/month（见 src/routes/almanac.ts，x-api-key 鉴权，错误码 unauthorized/invalid_request/not_configured，零 LLM 纯计算）
```

LLM 密钥段落（「LLM 密钥：本地开发在 .dev.vars 配置 LLM_API_KEY…」）之后补一句：

```
历法数据 API（/api/almanac 等）用 x-api-key 鉴权：本地 .dev.vars 配 ALMANAC_API_KEY，生产 wrangler secret put ALMANAC_API_KEY（未配置时端点 503）。
```

- [ ] **Step 5: 更新 `README.md`**

「运势栏目」段首句（`三个纯静态、零运行时 LLM 的内容栏目：正文烘焙进仓库内 HTML 片段，历法数据一律来自 lunar-javascript（生成期运行 npm run almanac / fortune:week / fortune:month 获取）。`）末尾追加：

```
同一计算核心也提供线上 API：`GET /api/almanac`、`/api/fortune/week`、`/api/fortune/month`（`x-api-key` 鉴权）。
```

LLM 解读接口段（第 16 行）之后插入一行：

```
历法数据 API（`/api/almanac` 等）使用 `x-api-key` 鉴权：本地 `.dev.vars` 配 `ALMANAC_API_KEY`，生产 `wrangler secret put ALMANAC_API_KEY`（未配置时返回 503）。
```

- [ ] **Step 6: 全量回归**

```powershell
npm run typecheck
npm test
```

预期：typecheck 零错误；全部测试通过（新增 almanac-api 一组；EBUSY 警告无害）。

- [ ] **Step 7: Commit**

```powershell
git add AGENTS.md README.md
git commit -m "docs: document almanac data API endpoints"
```

- [ ] **Step 8: 部署提醒（用户操作，不代执行）**

向用户转达：push 到 main 触发自动部署后，需执行一次 `wrangler secret put ALMANAC_API_KEY`（否则三条端点按设计返回 503 `not_configured`）；建议密钥用 32+ 字符随机串。线上冒烟：

```powershell
curl.exe -s -H "x-api-key: <KEY>" "https://suanming-zhanbu.com/api/almanac?date=2026-09-01"
```
