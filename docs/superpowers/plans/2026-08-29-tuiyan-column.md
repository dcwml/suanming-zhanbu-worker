# 时辰推演（tuiyan）栏目实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增第四个内容栏目「时辰推演」（`/:lang/tuiyan/`），每个农历月发布一篇特殊时辰榜单；本期交付 scan 核心 + CLI + 栏目接线 + 2026 农历七月首篇（中英双语）。

**Architecture:** 完全复刻 monthly 栏目模式：`src/tuiyan/scan.ts` 生成期核心（lunar-javascript 排四柱 + 规则表打标记 + 分级）→ `scripts/tuiyan.ts` CLI 壳 → 内容片段烘焙进 git → `src/pages/tuiyan.ts` 聚合模块 → 路由/SEO/渲染自动派生。Worker 运行时零 LLM、零历法计算。

**Tech Stack:** Cloudflare Workers (Hono + TypeScript)、lunar-javascript 1.7.7、vitest (@cloudflare/vitest-pool-workers)、tsx（CLI）。

**Spec:** `docs/superpowers/specs/2026-08-29-tuiyan-column-design.md`（数据基准见其 §5）

## Global Constraints

- 提交前 `npm test` + `npm run typecheck` 必须通过；Windows 上测试结束时的 miniflare EBUSY 警告是无害噪音，不代表失败
- PowerShell 用 `;` 不用 `&&`
- 文案红线：页面可见文本（正文/meta）一律不出现「AI」字样
- 双语对称：zh 与 en 内容一一对应
- 所有绝对 URL 经 `absoluteUrl(pagePath(...))` 生成；测试断言基于 `SITE_ORIGIN` 常量
- 时辰口径：取每时辰中点排盘（子时取 0 点早子时）；月柱分段以每日午时（12:00）月柱为代表
- 扫描数据基准（2026 农历七月）：348 时辰、纯阴 0、纯阳 78、一级大格 20、魁罡日 9月3日庚辰、月柱分段 [丙申 8-13~9-07, 丁酉 9-08~9-10]

## File Structure

| 文件 | 职责 | 动作 |
|---|---|---|
| `src/lunar-javascript.d.ts` | 类型声明，扩充 EightChar / fromYmdHms / 农历月日 API | 修改 |
| `src/tuiyan/scan.ts` | 格局规则表 + `scanLunarMonth` 核心 + 输出类型 | 创建 |
| `test/tuiyan-scan.test.ts` | scan 单测（锚定数据基准） | 创建 |
| `scripts/tuiyan.ts` | CLI 薄壳 | 创建 |
| `package.json` | 加 `npm run tuiyan` | 修改 |
| `src/content/tuiyan/2026-08-13.zh.html` | 首篇中文正文 | 创建 |
| `src/content/tuiyan/2026-08-13.en.html` | 首篇英文正文 | 创建 |
| `src/pages/tuiyan.ts` | 聚合模块（TUIYAN_POSTS 等） | 创建 |
| `test/tuiyan.test.ts` | 聚合模块单测 | 创建 |
| `src/seo/jsonld.ts` | 加 `tuiyanArticleJsonLd` | 修改 |
| `src/seo/meta.ts` | 加 `buildTuiyanPostHead` / `buildTuiyanArchiveHead` | 修改 |
| `src/seo/sitemap.ts` | 加 tuiyan 归档+单篇 URL | 修改 |
| `test/sitemap.test.ts` | 加 tuiyan 用例 | 修改 |
| `src/layout/render.ts` | 加 `renderTuiyanPost` / `renderTuiyanArchive` | 修改 |
| `src/routes/pages.ts` | 加 4 条 tuiyan 路由（在 `/:lang/:slug` 之前） | 修改 |
| `src/layout/nav.ts` | FORTUNE_NAV_ITEMS 加「时辰推演」 | 修改 |
| `test/integration.test.ts` | 加 describe("tuiyan") + 导航断言 | 修改 |
| `public/assets/style.css` | `.tuiyan-*` 样式 | 修改 |
| `AGENTS.md` | 目录结构 + 命令 + 栏目章节 | 修改 |

注：`src/layout/footer.ts` 无需修改——运势列直接复用 `FORTUNE_NAV_ITEMS`，nav 加项后 footer 自动跟随。

---

### Task 1: scan 核心 + 类型声明扩充 + 单测

**Files:**
- Modify: `src/lunar-javascript.d.ts`
- Create: `src/tuiyan/scan.ts`
- Test: `test/tuiyan-scan.test.ts`

**Interfaces:**
- Consumes: `lunar-javascript` 的 `Solar.fromYmdHms` / `getLunar` / `getEightChar`（Task 1 内扩充声明）
- Produces: `scanLunarMonth(day: string): TuiyanScanResult`；类型 `HourSlot` / `KuigangDay` / `DailyHighlight` / `TuiyanScanResult`（Task 2 CLI 与 Task 3/4 写作直接消费其 JSON 输出）

- [ ] **Step 1: 扩充 `src/lunar-javascript.d.ts`**

在 `declare module "lunar-javascript"` 内（保持现有声明不动，追加）：

```typescript
  export interface EightChar {
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
  }

  // Lunar 接口内追加（并入现有 interface Lunar，不要重复声明）：
  //   getEightChar(): EightChar;
  //   getMonth(): number;            // 农历月数字，闰月为负
  //   getMonthInChinese(): string;   // 如 "七"
  //   getDay(): number;              // 农历日数字
  //   getDayInChinese(): string;     // 如 "初一"

  // Solar 声明追加：
  //   fromYmdHms(y: number, m: number, d: number, hour: number, minute: number, second: number): Solar;
```

同时更新文件头注释（"升级 lunar-javascript 或新增调用时同步扩充" 下补一句：tuiyan/scan.ts 亦依赖此声明）。

- [ ] **Step 2: 写失败的单测 `test/tuiyan-scan.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { scanLunarMonth } from "../src/tuiyan/scan";

describe("scanLunarMonth — 2026 农历七月数据基准", () => {
  const r = scanLunarMonth("2026-08-13");

  it("covers 29 days x 12 hours = 348 slots", () => {
    expect(r.days).toBe(29);
    expect(r.totalHours).toBe(348);
    expect(r.firstDay).toBe("2026-08-13");
    expect(r.lastDay).toBe("2026-09-10");
    expect(r.lunarMonthLabel).toBe("七月");
  });

  it("has zero pure-yin and 78 pure-yang slots", () => {
    expect(r.stats.pureYin).toBe(0);
    expect(r.stats.pureYang).toBe(78);
  });

  it("lists exactly 20 grand slots", () => {
    expect(r.grand.length).toBe(20);
  });

  it("includes 2026-09-03 酉时 with 5 markers", () => {
    const slot = r.grand.find((s) => s.date === "2026-09-03" && s.hourZhi === "酉");
    expect(slot).toBeDefined();
    expect(slot!.tags.length).toBe(5);
    expect(slot!.tags).toContain("羊刃时");
    expect(slot!.tags).toContain("桃花时");
  });

  it("has one Kui Gang day: 2026-09-03, 庚辰, all 12 hours", () => {
    expect(r.kuigangDays.length).toBe(1);
    expect(r.kuigangDays[0].date).toBe("2026-09-03");
    expect(r.kuigangDays[0].dayGanZhi).toBe("庚辰");
    expect(r.kuigangDays[0].hours.length).toBe(12);
  });

  it("splits month pillars at White Dew (Bailu)", () => {
    expect(r.monthPillarSegments).toEqual([
      { monthGanZhi: "丙申", from: "2026-08-13", to: "2026-09-07" },
      { monthGanZhi: "丁酉", from: "2026-09-08", to: "2026-09-10" },
    ]);
    expect(r.jieQiInMonth).toContainEqual({ name: "白露", date: "2026-09-07" });
  });

  it("marks 2026-08-18 辰时 as a water-trine grand slot", () => {
    const slot = r.grand.find((s) => s.date === "2026-08-18" && s.hourZhi === "辰");
    expect(slot?.tags).toContain("三合申子辰局");
  });

  it("daily rows carry hour-level highlights", () => {
    const day = r.daily.find((d) => d.date === "2026-08-14");
    expect(day?.dayGanZhi).toBe("庚申");
    expect(day?.pureYangDay).toBe(true);
    expect(day?.tianyiHours).toEqual(["丑", "未"]);
    expect(day?.yangrenHour).toBe("酉");
  });
});

describe("scanLunarMonth — 输入归一与校验", () => {
  it("accepts any day within the lunar month and normalizes to its first day", () => {
    expect(scanLunarMonth("2026-08-20").firstDay).toBe("2026-08-13");
    expect(scanLunarMonth("2026-09-10").days).toBe(29);
  });

  it("throws on invalid date format", () => {
    expect(() => scanLunarMonth("not-a-date")).toThrow();
    expect(() => scanLunarMonth("2026-8-13")).toThrow();
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npm test -- test/tuiyan-scan.test.ts`
Expected: FAIL（`Cannot find module '../src/tuiyan/scan'`）

- [ ] **Step 4: 实现 `src/tuiyan/scan.ts`**

```typescript
// 时辰推演核心：扫描一个农历月每天 × 12 时辰的四柱，识别特殊格局并分级输出。
// 生成期 CLI（scripts/tuiyan.ts）与单测共用；非法参数 throw Error（CLI 壳 catch 后转 exit(1)）。
// 历法来自 lunar-javascript（类型声明见 src/lunar-javascript.d.ts）。
// 时辰口径：取每时辰中点排盘（子时取 0 点早子时）；月柱分段以每日午时（12:00）月柱为代表。
import { Solar } from "lunar-javascript";

const GAN_YANG = new Set(["甲", "丙", "戊", "庚", "壬"]);
const ZHI_YANG = new Set(["子", "寅", "辰", "午", "申", "戌"]);
const ZHI_NAMES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
const HOUR_RANGES = ["23-1", "1-3", "3-5", "5-7", "7-9", "9-11", "11-13", "13-15", "15-17", "17-19", "19-21", "21-23"];

/** 天乙贵人（日干 → 贵人时支） */
const TIANYI: Record<string, string[]> = {
  甲: ["丑", "未"], 戊: ["丑", "未"], 庚: ["丑", "未"],
  乙: ["子", "申"], 己: ["子", "申"],
  丙: ["亥", "酉"], 丁: ["亥", "酉"],
  壬: ["卯", "巳"], 癸: ["卯", "巳"], 辛: ["午", "寅"],
};
/** 羊刃（阳日干 → 刃支；阴干不论刃） */
const YANGREN: Record<string, string> = { 甲: "卯", 丙: "午", 戊: "午", 庚: "酉", 壬: "子" };
/** 日支三合局 → 桃花 / 驿马 / 将星 / 华盖支 */
const SANHE_GROUP: Record<string, "水" | "火" | "金" | "木"> = {
  申: "水", 子: "水", 辰: "水", 寅: "火", 午: "火", 戌: "火",
  巳: "金", 酉: "金", 丑: "金", 亥: "木", 卯: "木", 未: "木",
};
const TAOHUA = { 水: "酉", 火: "卯", 金: "午", 木: "子" } as const;
const YIMA = { 水: "寅", 火: "申", 金: "亥", 木: "巳" } as const;
const JIANGXING = { 水: "子", 火: "午", 金: "酉", 木: "卯" } as const;
const HUAGAI = { 水: "辰", 火: "戌", 金: "丑", 木: "未" } as const;
/** 魁罡日柱 */
const KUIGANG = new Set(["庚辰", "庚戌", "壬辰", "戊戌"]);
/** 三合局与三合方会（四支凑齐即成） */
const SANHE_JU: readonly (readonly string[])[] = [["申", "子", "辰"], ["寅", "午", "戌"], ["巳", "酉", "丑"], ["亥", "卯", "未"]];
const SANHE_FANG: readonly (readonly string[])[] = [["申", "酉", "戌"], ["亥", "子", "丑"], ["寅", "卯", "辰"], ["巳", "午", "未"]];
/** 天干五合 / 地支六合 */
const GAN_WUHE: Record<string, string> = { 甲: "己", 己: "甲", 乙: "庚", 庚: "乙", 丙: "辛", 辛: "丙", 丁: "壬", 壬: "丁", 戊: "癸", 癸: "戊" };
const ZHI_LIUHE: Record<string, string> = { 子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯", 辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午" };

export interface HourSlot {
  date: string;
  hourZhi: string;
  hourRange: string;
  /** 四柱，空格分隔，如 "丙午 丙申 庚辰 乙酉" */
  bazi: string;
  tags: string[];
}

export interface KuigangDay {
  date: string;
  dayGanZhi: string;
  lunarLabel: string;
  hours: HourSlot[];
}

export interface DailyHighlight {
  date: string;
  lunarLabel: string;
  dayGanZhi: string;
  /** 日柱干支全阳（该日子/寅/辰/午/申/戌六时为纯阳八字） */
  pureYangDay: boolean;
  tianyiHours: string[];
  taohuaHour: string;
  yimaHour: string;
  jiangxingHour: string;
  yangrenHour: string;
  huagaiHour: string;
}

export interface TuiyanScanResult {
  mode: "tuiyan";
  firstDay: string;
  lastDay: string;
  /** 农历月名，闰月带"闰"前缀，如 "七月" / "闰六月" */
  lunarMonthLabel: string;
  days: number;
  totalHours: number;
  monthPillarSegments: { monthGanZhi: string; from: string; to: string }[];
  jieQiInMonth: { name: string; date: string }[];
  /** 一级·大格：三合成局 ∨ 三合方会 ∨ 标记总数 ≥ 4 */
  grand: HourSlot[];
  kuigangDays: KuigangDay[];
  daily: DailyHighlight[];
  stats: {
    pureYang: number;
    pureYin: number;
    tianyiHours: number;
    taohuaHours: number;
    yimaHours: number;
    jiangxingHours: number;
    yangrenHours: number;
    huagaiHours: number;
  };
}

function validateIsoDate(s: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error(`Invalid date: ${s} (expected YYYY-MM-DD)`);
  }
}

/** ISO 日期加 n 天（纯 UTC 运算，无时区歧义） */
function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function solarOf(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return Solar.fromYmd(y, m, d);
}

/** 农历标签，如 "七月初一"、"闰六月初三" */
function lunarLabelOf(iso: string): string {
  const l = solarOf(iso).getLunar();
  return `${l.getMonth() < 0 ? "闰" : ""}${l.getMonthInChinese()}月${l.getDayInChinese()}`;
}

/** 某天第 h 个时辰（0=子 … 11=亥，取中点 h*2 点）的四柱与标记 */
function scanHour(date: string, h: number): HourSlot {
  const [y, m, d] = date.split("-").map(Number);
  const ec = Solar.fromYmdHms(y, m, d, h * 2, 0, 0).getLunar().getEightChar();
  const yG = ec.getYearGan(), yZ = ec.getYearZhi();
  const mG = ec.getMonthGan(), mZ = ec.getMonthZhi();
  const dG = ec.getDayGan(), dZ = ec.getDayZhi();
  const tG = ec.getTimeGan(), tZ = ec.getTimeZhi();
  const gans = [yG, mG, dG, tG];
  const zhis = [yZ, mZ, dZ, tZ];
  const tags: string[] = [];

  if (gans.every((g) => GAN_YANG.has(g)) && zhis.every((z) => ZHI_YANG.has(z))) tags.push("纯阳");
  if (!gans.some((g) => GAN_YANG.has(g)) && !zhis.some((z) => ZHI_YANG.has(z))) tags.push("纯阴");
  if (KUIGANG.has(dG + dZ)) tags.push("魁罡日");
  if (TIANYI[dG]?.includes(tZ)) tags.push("天乙贵人时");
  if (YANGREN[dG] === tZ) tags.push("羊刃时");
  const group = SANHE_GROUP[dZ];
  if (group) {
    if (TAOHUA[group] === tZ) tags.push("桃花时");
    if (YIMA[group] === tZ) tags.push("驿马时");
    if (JIANGXING[group] === tZ) tags.push("将星时");
    if (HUAGAI[group] === tZ) tags.push("华盖时");
  }
  for (const ju of SANHE_JU) if (ju.every((z) => zhis.includes(z))) tags.push(`三合${ju.join("")}局`);
  for (const f of SANHE_FANG) if (f.every((z) => zhis.includes(z))) tags.push(`方会${f.join("")}`);
  if (GAN_WUHE[dG] === tG) tags.push("日时干五合");
  if (ZHI_LIUHE[dZ] === tZ) tags.push("日时支六合");

  return { date, hourZhi: ZHI_NAMES[h], hourRange: HOUR_RANGES[h], bazi: `${yG}${yZ} ${mG}${mZ} ${dG}${dZ} ${tG}${tZ}`, tags };
}

/** 扫描一个农历月：入参为该月内任意一天（自动归一到农历月首日） */
export function scanLunarMonth(day: string): TuiyanScanResult {
  validateIsoDate(day);

  // 回退到农历月首日（最多 29 步）
  let firstDay = day;
  while (solarOf(firstDay).getLunar().getDay() !== 1) firstDay = addDays(firstDay, -1);

  // 圈定农历月：getMonth() 闰月为负，同月（含闰月语义）连续
  const monthKey = solarOf(firstDay).getLunar().getMonth();
  const dates: string[] = [];
  for (let cur = firstDay; ; cur = addDays(cur, 1)) {
    if (solarOf(cur).getLunar().getMonth() !== monthKey) break;
    dates.push(cur);
  }

  const allSlots: HourSlot[] = [];
  const daily: DailyHighlight[] = [];
  const kuigangDays: KuigangDay[] = [];
  const stats = { pureYang: 0, pureYin: 0, tianyiHours: 0, taohuaHours: 0, yimaHours: 0, jiangxingHours: 0, yangrenHours: 0, huagaiHours: 0 };

  for (const date of dates) {
    const slots = Array.from({ length: 12 }, (_, h) => scanHour(date, h));
    allSlots.push(...slots);

    const dayGanZhi = slots[6].bazi.split(" ")[2]; // 午时第三柱
    const lunar = solarOf(date).getLunar();
    const dayGan = dayGanZhi[0];
    const dayZhi = dayGanZhi[1];

    daily.push({
      date,
      lunarLabel: lunarLabelOf(date),
      dayGanZhi,
      pureYangDay: GAN_YANG.has(dayGan) && ZHI_YANG.has(dayZhi),
      tianyiHours: slots.filter((s) => s.tags.includes("天乙贵人时")).map((s) => s.hourZhi),
      taohuaHour: slots.find((s) => s.tags.includes("桃花时"))?.hourZhi ?? "",
      yimaHour: slots.find((s) => s.tags.includes("驿马时"))?.hourZhi ?? "",
      jiangxingHour: slots.find((s) => s.tags.includes("将星时"))?.hourZhi ?? "",
      yangrenHour: slots.find((s) => s.tags.includes("羊刃时"))?.hourZhi ?? "",
      huagaiHour: slots.find((s) => s.tags.includes("华盖时"))?.hourZhi ?? "",
    });

    if (KUIGANG.has(dayGanZhi)) {
      kuigangDays.push({ date, dayGanZhi, lunarLabel: lunarLabelOf(date), hours: slots });
    }

    for (const s of slots) {
      if (s.tags.includes("纯阳")) stats.pureYang++;
      if (s.tags.includes("纯阴")) stats.pureYin++;
      if (s.tags.includes("天乙贵人时")) stats.tianyiHours++;
      if (s.tags.includes("桃花时")) stats.taohuaHours++;
      if (s.tags.includes("驿马时")) stats.yimaHours++;
      if (s.tags.includes("将星时")) stats.jiangxingHours++;
      if (s.tags.includes("羊刃时")) stats.yangrenHours++;
      if (s.tags.includes("华盖时")) stats.huagaiHours++;
    }
  }

  // 一级·大格
  const grand = allSlots.filter(
    (s) => s.tags.some((t) => t.startsWith("三合") || t.startsWith("方会")) || s.tags.length >= 4,
  );

  // 月柱分段（每日午时月柱，相邻合并；白露 9-07 交节在夜，午时采样正确归段 8-13~9-07 = 丙申）
  const monthPillarSegments: { monthGanZhi: string; from: string; to: string }[] = [];
  for (const date of dates) {
    const [y, m, d] = date.split("-").map(Number);
    const monthGanZhi = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getMonthInGanZhi();
    const last = monthPillarSegments[monthPillarSegments.length - 1];
    if (last && last.monthGanZhi === monthGanZhi) last.to = date;
    else monthPillarSegments.push({ monthGanZhi, from: date, to: date });
  }

  const jieQiInMonth = dates
    .filter((date) => solarOf(date).getLunar().getJieQi() !== "")
    .map((date) => ({ name: solarOf(date).getLunar().getJieQi(), date }));

  const firstLunar = solarOf(firstDay).getLunar();
  return {
    mode: "tuiyan",
    firstDay,
    lastDay: dates[dates.length - 1],
    lunarMonthLabel: `${firstLunar.getMonth() < 0 ? "闰" : ""}${firstLunar.getMonthInChinese()}月`,
    days: dates.length,
    totalHours: allSlots.length,
    monthPillarSegments,
    jieQiInMonth,
    grand,
    kuigangDays,
    daily,
    stats,
  };
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- test/tuiyan-scan.test.ts`
Expected: PASS（全部用例绿。若 `daily` 行的 `tianyiHours` 断言失败，检查 TIANYI 表是否与 spec §4 一致；若月柱分段断言失败，确认用的是 `getMonthInGanZhi()`（Lunar 接口现有声明，勿改用 EightChar）；若 `jieQiInMonth` 数组异常膨胀（非节气日 getJieQi() 未返回空串），改为 `node -e "const {Solar}=require('lunar-javascript');console.log(JSON.stringify(Solar.fromYmd(2026,9,6).getLunar().getJieQi()))"` 验证——预期空串；若非空，用 `getJieQiTable()` 精确比对当天替代直接 getJieQi，并同步修正 scan.ts 注释）

- [ ] **Step 6: typecheck + 提交**

Run: `npm run typecheck`
Expected: 无错误

```powershell
git add src/lunar-javascript.d.ts src/tuiyan/scan.ts test/tuiyan-scan.test.ts
git commit -m "feat(tuiyan): add scan core with anchored tests for lunar July 2026"
```

---

### Task 2: CLI 壳 + npm script

**Files:**
- Create: `scripts/tuiyan.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `scanLunarMonth`（Task 1）
- Produces: `npm run tuiyan -- YYYY-MM-DD` → stdout JSON（Task 3/4 写作、Task 8 验证的数据来源）

- [ ] **Step 1: 创建 `scripts/tuiyan.ts`**

```typescript
/* eslint-disable */
// 生成期 CLI 薄壳：参数解析 + 输出。计算核心在 src/tuiyan/scan.ts。
// 仅在本地 Node 运行，不入 Worker 运行时。
//
// 用法：
//   npm run tuiyan -- 2026-08-13   # 参数 = 农历月首日（月内任意一天亦可，自动归一到首日）
import { scanLunarMonth } from "../src/tuiyan/scan";

const target = process.argv[2];

if (!target) {
  console.error("用法：npm run tuiyan -- YYYY-MM-DD（农历月首日）");
  process.exit(1);
}

try {
  console.log(JSON.stringify(scanLunarMonth(target), null, 2));
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
```

- [ ] **Step 2: `package.json` scripts 加一行**

在 `"qian:validate"` 之前（fortune 系列 之后）加：

```json
    "tuiyan": "tsx scripts/tuiyan.ts",
```

- [ ] **Step 3: 跑 CLI 对照基准**

Run: `npm run tuiyan -- 2026-08-13 > tmp/tuiyan-2026-08-13.json ; node -e "const r=require('./tmp/tuiyan-2026-08-13.json');console.log(r.days,r.totalHours,r.stats.pureYin,r.stats.pureYang,r.grand.length,r.kuigangDays.length,JSON.stringify(r.monthPillarSegments))"`
Expected: `29 348 0 78 20 1 [{"monthGanZhi":"丙申","from":"2026-08-13","to":"2026-09-07"},{"monthGanZhi":"丁酉","from":"2026-09-08","to":"2026-09-10"}]`

Run: `npm run tuiyan -- not-a-date`
Expected: stderr 输出错误信息、exit code 1

- [ ] **Step 4: 提交**

```powershell
git add scripts/tuiyan.ts package.json
git commit -m "feat(tuiyan): add npm run tuiyan CLI shell"
```

---

### Task 3: 首篇中文内容片段（2026-08-13.zh.html）

**Files:**
- Create: `src/content/tuiyan/2026-08-13.zh.html`

**Interfaces:**
- Consumes: Task 2 CLI 输出 `tmp/tuiyan-2026-08-13.json`（`grand` 数组核对四柱、`daily` 数组抄速查表）
- Produces: 中文正文片段（Task 5 聚合模块 import；正文自带 `<h1>`，与 weekly/monthly 一致；无 html/head/body 外壳）

- [ ] **Step 1: 写入完整中文正文**

以下为完整文件内容。唯速查表仅示例 3 行，其余 26 行按 Step 2 映射规则从 `daily` 数组抄录（在 `<!-- 其余 26 行见 Step 2 -->` 处插入，插完删除该注释）：

```html
<h1>2026农历七月特殊时辰推演：纯阳、三合局与魁罡时辰榜</h1>
<p class="tuiyan-lead">农历七月，民间称鬼月，自公历八月十三日（七月初一）始，至九月十日（七月廿九）止，凡二十九日、三百四十八时辰。本篇以四柱干支逐时推演，专录格局特殊之时辰——三合成局、方会连珠、纯阳之体、魁罡坐日，仿古批语附白话细解，聊备一格。本篇为全月推演总录：发布时七月已过半，已过时辰供回看印证，未至时辰聊备一说。</p>

<section class="tuiyan-summary">
  <h2>本月总览</h2>
  <p>丙午年七月，月柱先丙申、后丁酉（白露九月七日交节）。全月三百四十八个时辰中——</p>
  <ul>
    <li><strong>纯阴之体为零</strong>：年柱丙午、月柱丙申干支皆阳，四柱纯阴于此月结构性不可得，此亦命理常识之一斑；</li>
    <li><strong>纯阳之体七十八</strong>：约占全月时辰两成，故不单独成批，仅于速查表以「纯阳日」标注；</li>
    <li><strong>一级大格二十局</strong>：三合成局九、三合方会十，另有九月三日酉时五标记汇聚，逐条批断于下；</li>
    <li><strong>魁罡日一日</strong>：九月三日庚辰日全天十二时辰皆带魁罡，另立专节。</li>
  </ul>
</section>

<section class="tuiyan-grand">
  <h2>一级·大格二十局</h2>

  <article class="tuiyan-item">
    <h3>第一局 · 七月初一巳时（8月13日 9–11时）</h3>
    <p class="tuiyan-pillars">四柱：丙午 丙申 己未 己巳</p>
    <p class="tuiyan-tags">格局：三合方会巳午未</p>
    <blockquote class="tuiyan-verdict">初一巳时，南方火土会方，主生文思清逸之人，宜南地而居，笔墨传名。</blockquote>
    <p class="tuiyan-note">巳午未三支齐聚，火势成方。己未日己巳时，火土同气相生，主聪明儒雅、以文立足，南方最利。</p>
  </article>

  <article class="tuiyan-item">
    <h3>第二局 · 七月初三戌时（8月15日 19–21时）</h3>
    <p class="tuiyan-pillars">四柱：丙午 丙申 辛酉 戊戌</p>
    <p class="tuiyan-tags">格局：三合方会申酉戌</p>
    <blockquote class="tuiyan-verdict">初三戌时，西方金气连珠，申酉戌会成金方，主出果决之士，刀笔如锋，利西北。</blockquote>
    <p class="tuiyan-note">月支申、日支酉、时支戌，西方金方三支连气。辛金日主坐酉得地，主性刚果决，宜行西北，武职、法务、外科诸业皆有可为。</p>
  </article>

  <article class="tuiyan-item">
    <h3>第三局 · 七月初四寅时（8月16日 3–5时）</h3>
    <p class="tuiyan-pillars">四柱：丙午 丙申 壬戌 壬寅</p>
    <p class="tuiyan-tags">格局：纯阳之体、三合寅午戌局</p>
    <blockquote class="tuiyan-verdict">初四寅时，干支纯阳，支成寅午戌火局，主生豪迈刚断之人，将相之器，宜东。</blockquote>
    <p class="tuiyan-note">年支午、日支戌、时支寅，火局三合；四干四支无一阴字，阳刚至极。此局气魄过人，然刚极易折，须以静水深流为戒。</p>
  </article>

  <article class="tuiyan-item">
    <h3>第四局 · 七月初四酉时（8月16日 17–19时）</h3>
    <p class="tuiyan-pillars">四柱：丙午 丙申 壬戌 己酉</p>
    <p class="tuiyan-tags">格局：三合方会申酉戌</p>
    <blockquote class="tuiyan-verdict">同日酉时，金方会齐，壬水临戌，主生外柔内刚、谋定后动之人，晚岁聚财。</blockquote>
    <p class="tuiyan-note">与寅时同日而取金方：申酉戌全而火局不成。一日之内，晨火暮金，两局并立，本月仅此一日。</p>
  </article>

  <article class="tuiyan-item">
    <h3>第五局 · 七月初六辰时（8月18日 7–9时）</h3>
    <p class="tuiyan-pillars">四柱：丙午 丙申 甲子 戊辰</p>
    <p class="tuiyan-tags">格局：纯阳之体、华盖、三合申子辰局</p>
    <blockquote class="tuiyan-verdict">初六辰时，纯阳会水局，华盖临门，主生智谋深沉、孤高近道之人，宜北地。</blockquote>
    <p class="tuiyan-note">申子辰三合水局，火年水局相激；辰为华盖，主聪明孤介、近宗教玄学。甲木得水而荣，智虑过人，北方水地最宜其才。</p>
  </article>

  <article class="tuiyan-item">
    <h3>第六局 · 七月初八戌时（8月20日 19–21时）</h3>
    <p class="tuiyan-pillars">四柱：丙午 丙申 丙寅 戊戌</p>
    <p class="tuiyan-tags">格局：纯阳之体、华盖、三合寅午戌局</p>
    <blockquote class="tuiyan-verdict">初八戌时，三丙并透，支全火局，华盖镇戌，主生光明磊落、执掌文印之人，威名南扬。</blockquote>
    <p class="tuiyan-note">年月日三丙相连，寅午戌火局全，戌又为华盖。火明则礼盛，主仪表堂堂、声名远播，南方火地如鱼得水。</p>
  </article>

  <article class="tuiyan-item">
    <h3>第七局 · 七月初十子时（8月22日 0–1时早子时）</h3>
    <p class="tuiyan-pillars">四柱：丙午 丙申 戊辰 壬子</p>
    <p class="tuiyan-tags">格局：纯阳之体、将星、三合申子辰局</p>
    <blockquote class="tuiyan-verdict">初十子时，纯阳会水，将星坐子，主生出将入相、执掌兵符之人，功名在北。</blockquote>
    <p class="tuiyan-note">申子辰水局会于夜半，子为将星——三合局之旺支即将星，主统御之才。戊土日主堤防水势，刚柔相济，成就往往在北方。</p>
  </article>

  <article class="tuiyan-item">
    <h3>第八局 · 七月十一未时（8月23日 13–15时）</h3>
    <p class="tuiyan-pillars">四柱：丙午 丙申 己巳 乙未</p>
    <p class="tuiyan-tags">格局：三合方会巳午未</p>
    <blockquote class="tuiyan-verdict">十一未时，巳午未连气，火方再临，主生温厚宏达之人，田园广置，利南。</blockquote>
    <p class="tuiyan-note">日支巳、年支午、时支未，南方火方复聚。己土日主得火而暖，主性情宽厚、家业丰隆，置业南方尤佳。</p>
  </article>

  <article class="tuiyan-item">
    <h3>第九局 · 七月十三巳时（8月25日 9–11时）</h3>
    <p class="tuiyan-pillars">四柱：丙午 丙申 辛未 癸巳</p>
    <p class="tuiyan-tags">格局：三合方会巳午未</p>
    <blockquote class="tuiyan-verdict">十三巳时，火方复聚，辛金坐未，火炼真金，主生百炼成钢、大器晚成之人。</blockquote>
    <p class="tuiyan-note">本月火方第三次成局。辛金日主生于火地，如金在炉，早年磨砺、中年成器，愈挫愈坚之象。</p>
  </article>

  <article class="tuiyan-item">
    <h3>第十局 · 七月十五戌时（8月27日 19–21时）中元节</h3>
    <p class="tuiyan-pillars">四柱：丙午 丙申 癸酉 壬戌</p>
    <p class="tuiyan-tags">格局：三合方会申酉戌</p>
    <blockquote class="tuiyan-verdict">中元十五戌时，金方既成而水气渐生，盂兰之夜得此局者，主通幽明之变，医卜之才，宜西。</blockquote>
    <p class="tuiyan-note">七月十五中元节，民俗谓地官赦罪、幽明相通之日。此局金方会齐、金白水清，日主癸水生于金月，古谓水主智、通玄冥，故有医卜星相之才一说，西方金地最利。</p>
  </article>

  <article class="tuiyan-item">
    <h3>第十一局 · 七月十六寅时（8月28日 3–5时）</h3>
    <p class="tuiyan-pillars">四柱：丙午 丙申 甲戌 丙寅</p>
    <p class="tuiyan-tags">格局：纯阳之体、三合寅午戌局</p>
    <blockquote class="tuiyan-verdict">十六寅时，纯阳复见火局，甲木参天而得火吐秀，主生文采飞扬、领袖群伦之人。</blockquote>
    <p class="tuiyan-note">甲木日主，得三丙吐秀，木火通明之象，主文章华彩、众望所归。寅为甲禄，根基深厚。</p>
  </article>

  <article class="tuiyan-item">
    <h3>第十二局 · 七月十六酉时（8月28日 17–19时）</h3>
    <p class="tuiyan-pillars">四柱：丙午 丙申 甲戌 癸酉</p>
    <p class="tuiyan-tags">格局：三合方会申酉戌</p>
    <blockquote class="tuiyan-verdict">同日酉时，金方会齐，甲木临金，主生刚正不阿、法度严明之人，官威显赫。</blockquote>
    <p class="tuiyan-note">与寅时同日晨昏对峙：晨得火局、暮得金方。酉为甲之正官，官星得方局之力，主仕途可观、执法如山。</p>
  </article>

  <article class="tuiyan-item">
    <h3>第十三局 · 七月十八辰时（8月30日 7–9时）</h3>
    <p class="tuiyan-pillars">四柱：丙午 丙申 丙子 壬辰</p>
    <p class="tuiyan-tags">格局：纯阳之体、华盖、三合申子辰局</p>
    <blockquote class="tuiyan-verdict">十八辰时，三丙照水局，水火既济，华盖覆辰，主生智勇双全、静水深流之人。</blockquote>
    <p class="tuiyan-note">申子辰水局与三丙天干相映，水火既济而不相射。辰为华盖，智虑深藏不露，属大智若愚之格。</p>
  </article>

  <article class="tuiyan-item">
    <h3>第十四局 · 七月二十戌时（9月1日 19–21时）</h3>
    <p class="tuiyan-pillars">四柱：丙午 丙申 戊寅 壬戌</p>
    <p class="tuiyan-tags">格局：纯阳之体、华盖、三合寅午戌局</p>
    <blockquote class="tuiyan-verdict">二十戌时，厚土载火局，华盖归垣，主生稳重如山、福泽绵长之人，晚岁荣昌。</blockquote>
    <p class="tuiyan-note">戊土日主承载火局，火土相生，根基极厚；戌为华盖又为火库，主信仰笃定、晚运丰隆。</p>
  </article>

  <article class="tuiyan-item">
    <h3>第十五局 · 七月廿二子时（9月3日 0–1时早子时）</h3>
    <p class="tuiyan-pillars">四柱：丙午 丙申 庚辰 丙子</p>
    <p class="tuiyan-tags">格局：纯阳之体、魁罡日、将星、三合申子辰局</p>
    <blockquote class="tuiyan-verdict">廿二子时，魁罡坐日而将星归子，纯阳会水，刚柔并济，主生杀伐决断、统御一方之才。</blockquote>
    <p class="tuiyan-note">庚辰魁罡之日本已果决，又得申子辰水局泄秀、将星坐镇，智勇兼备。此日全天十二时辰皆带魁罡，详见下节。</p>
  </article>

  <article class="tuiyan-item">
    <h3>第十六局 · 七月廿二酉时（9月3日 17–19时）本月之最</h3>
    <p class="tuiyan-pillars">四柱：丙午 丙申 庚辰 乙酉</p>
    <p class="tuiyan-tags">格局：魁罡日、羊刃、桃花、日时干五合、日时支六合（五标记汇聚）</p>
    <blockquote class="tuiyan-verdict">魁罡坐日，羊刃桃花并见，乙庚干合、辰酉支融——刚烈与柔媚同体，将才亦是情种，宜西。</blockquote>
    <p class="tuiyan-note">本局五标记齐临，为三百四十八时辰之最：庚辰魁罡主刚断，酉为羊刃主锋锐、又为桃花主风流，日干庚与时干乙五合、日支辰与时支酉六合，主内外交融。刚柔两端集于一身，善用则为儒将，失度则为情困。</p>
  </article>

  <article class="tuiyan-item">
    <h3>第十七局 · 七月廿三未时（9月4日 13–15时）</h3>
    <p class="tuiyan-pillars">四柱：丙午 丙申 辛巳 辛未</p>
    <p class="tuiyan-tags">格局：三合方会巳午未</p>
    <blockquote class="tuiyan-verdict">廿三未时，火方三现于本月，辛金遇火炼，主生玉汝于成、声名远播之人。</blockquote>
    <p class="tuiyan-note">巳午未南方火方本月第四次成局（初一、十一、十三、廿三）。双辛并立，如金石受锻，主历磨砺而成大名。</p>
  </article>

  <article class="tuiyan-item">
    <h3>第十八局 · 七月廿五巳时（9月6日 9–11时）</h3>
    <p class="tuiyan-pillars">四柱：丙午 丙申 癸未 丁巳</p>
    <p class="tuiyan-tags">格局：天乙贵人、驿马、三合方会巳午未</p>
    <blockquote class="tuiyan-verdict">廿五巳时，贵人驿马同临，火方又全，主生远行得贵、商贾巨富之人，东南大利。</blockquote>
    <p class="tuiyan-note">癸日贵人在卯巳，巳时既为天乙又为驿马（亥卯未局马在巳），更兼巳午未方会。贵人与驿马同宫，主奔波中遇贵、他乡立业，行商走贾最宜。</p>
  </article>

  <article class="tuiyan-item">
    <h3>第十九局 · 七月廿八寅时（9月9日 3–5时）丁酉月</h3>
    <p class="tuiyan-pillars">四柱：丙午 丁酉 丙戌 庚寅</p>
    <p class="tuiyan-tags">格局：三合寅午戌局</p>
    <blockquote class="tuiyan-verdict">廿八寅时，月柱已易丁酉，火局犹成，主生逆境崛起、越挫越勇之人。</blockquote>
    <p class="tuiyan-note">白露后月柱换丁酉，金气当令，而寅午戌火局仍全——火局生于金月，如逆水行舟，主一生不服输，屡败屡战终成大器。</p>
  </article>

  <article class="tuiyan-item">
    <h3>第二十局 · 七月廿八申时（9月9日 15–17时）丁酉月</h3>
    <p class="tuiyan-pillars">四柱：丙午 丁酉 丙戌 丙申</p>
    <p class="tuiyan-tags">格局：驿马、三合方会申酉戌</p>
    <blockquote class="tuiyan-verdict">同日申时，月柱丁酉而申酉戌再全，火金铸剑，主生胆识过人、开辟基业之人，宜西行。</blockquote>
    <p class="tuiyan-note">月支酉、日支戌、时支申，金方于酉月得令而聚；申又为丙日驿马。火炼秋金，铸剑之象，主开拓之才，西方建功。</p>
  </article>
</section>

<section class="tuiyan-kuigang">
  <h2>二级·魁罡专节：九月三日庚辰日</h2>
  <p>魁罡者，庚辰、庚戌、壬辰、戊戌四日之谓，古谓「魁罡性严，有操持而果决」。本农历月恰逢一日——九月三日（七月廿二）庚辰日，全天十二时辰皆带魁罡标记，逐时列之（「并见格局」列不含魁罡本体）：</p>
  <table class="tuiyan-table">
    <thead><tr><th>时辰</th><th>时柱</th><th>并见格局</th></tr></thead>
    <tbody>
      <tr><td>子时（0–1时早子时）</td><td>丙子</td><td>纯阳、将星、三合申子辰局（见第十五局）</td></tr>
      <tr><td>丑时（1–3时）</td><td>丁丑</td><td>天乙贵人</td></tr>
      <tr><td>寅时（3–5时）</td><td>戊寅</td><td>纯阳、驿马</td></tr>
      <tr><td>卯时（5–7时）</td><td>己卯</td><td>—</td></tr>
      <tr><td>辰时（7–9时）</td><td>庚辰</td><td>纯阳、华盖</td></tr>
      <tr><td>巳时（9–11时）</td><td>辛巳</td><td>—</td></tr>
      <tr><td>午时（11–13时）</td><td>壬午</td><td>纯阳</td></tr>
      <tr><td>未时（13–15时）</td><td>癸未</td><td>天乙贵人</td></tr>
      <tr><td>申时（15–17时）</td><td>甲申</td><td>纯阳</td></tr>
      <tr><td>酉时（17–19时）</td><td>乙酉</td><td>羊刃、桃花、干五合、支六合（见第十六局详批）</td></tr>
      <tr><td>戌时（19–21时）</td><td>丙戌</td><td>纯阳</td></tr>
      <tr><td>亥时（21–23时）</td><td>丁亥</td><td>—</td></tr>
    </tbody>
  </table>
  <p>十二时辰中，子时纯阳会水局而将星同临、酉时五标记汇聚，二者已入一级详批（第十五、十六局），此处交叉引用不赘；辰时华盖、寅时驿马、丑未二时天乙贵人亦各有可观。庚金日主坐辰，魁罡之刚得辰土相生，古谓「运行身旺则贵」，可为一参。</p>
</section>

<section class="tuiyan-daily">
  <h2>三级·每日亮点速查</h2>
  <p>每日一行：「纯阳日」指日柱干支皆阳，该日六个阳干阳支时辰（子、寅、辰、午、申、戌）四柱皆阳，为纯阳之体；九月八日之后月柱换丁酉（阴柱），纵是纯阳日亦不成纯阳四柱。天乙贵人、桃花、驿马、将星、羊刃、华盖各列其所在时辰，「—」表示该日无此格。</p>
  <table class="tuiyan-table">
    <thead><tr><th>公历</th><th>农历</th><th>日柱</th><th>纯阳日</th><th>天乙贵人</th><th>桃花</th><th>驿马</th><th>将星</th><th>羊刃</th><th>华盖</th></tr></thead>
    <tbody>
      <tr><td>8月13日</td><td>七月初一</td><td>己未</td><td>否</td><td>子、申</td><td>子</td><td>巳</td><td>卯</td><td>—</td><td>未</td></tr>
      <tr><td>8月14日</td><td>七月初二</td><td>庚申</td><td>是</td><td>丑、未</td><td>酉</td><td>寅</td><td>子</td><td>酉</td><td>辰</td></tr>
      <tr><td>8月15日</td><td>七月初三</td><td>辛酉</td><td>否</td><td>午、寅</td><td>午</td><td>亥</td><td>酉</td><td>—</td><td>丑</td></tr>
      <!-- 其余 26 行见 Step 2 -->
    </tbody>
  </table>
</section>

<section class="tuiyan-disclaimer">
  <h2>推演之说，聊备一格</h2>
  <p>时辰格局之说，源于干支五行生克之理，是古人观察时间与命运关系的一种文化框架。本篇批语仿古人口吻而作，意在存录传统命理的推演之趣，非谓定数；人生成就，终究系于自身之修为与际遇。读者阅之一乐，取其勉励可也。</p>
</section>
```

- [ ] **Step 2: 从 CLI 输出补全速查表其余 26 行**

数据源：`tmp/tuiyan-2026-08-13.json` 的 `daily` 数组（29 个元素，date 升序，跳过已抄的前 3 个）。逐元素转一行 `<tr>`，映射规则：

| JSON 字段 | 表格列 | 转换 |
|---|---|---|
| `date` `"2026-08-16"` | 公历 | 月日去前置零：`8月16日` / `9月6日` |
| `lunarLabel` `"七月初四"` | 农历 | 原样 |
| `dayGanZhi` `"壬戌"` | 日柱 | 原样 |
| `pureYangDay` | 纯阳日 | `true` → `是`，`false` → `否` |
| `tianyiHours` `["丑","未"]` | 天乙贵人 | `join("、")`；空数组 → `—` |
| `taohuaHour` / `yimaHour` / `jiangxingHour` / `yangrenHour` / `huagaiHour` | 桃花/驿马/将星/羊刃/华盖 | 原样；`""` → `—` |

抄录后核对锚点：`9月3日` 行日柱 `庚辰`、天乙贵人 `丑、未`、羊刃 `酉`；`9月9日` 行（丙戌）纯阳日为 `是`（其六阳时不成纯阳四柱，月柱丁酉已阴——文案说明已涵盖此点）；行数总计 29。

- [ ] **Step 3: 数据一致性核对**

Run: `node -e "const r=require('./tmp/tuiyan-2026-08-13.json'); for (const g of r.grand) console.log(g.date, g.hourZhi, g.bazi, g.tags.join(','))"`

对照正文 20 条 `tuiyan-item`：每条的日期/时辰/四柱/格局标签必须与输出逐条一致（正文「格局：」行为可读性微调措辞，语义须等价）。再核对 `r.kuigangDays[0].hours` 的 12 行时柱干支与魁罡专节表格一致。

- [ ] **Step 4: 提交**

```powershell
git add src/content/tuiyan/2026-08-13.zh.html
git commit -m "content(tuiyan): add lunar July 2026 zh essay"
```

---

### Task 4: 首篇英文内容片段（2026-08-13.en.html）

**Files:**
- Create: `src/content/tuiyan/2026-08-13.en.html`

**Interfaces:**
- Consumes: Task 3 的 zh 正文（结构逐段对应）
- Produces: 英文正文片段（Task 5 聚合模块 import）

- [ ] **Step 1: 掌握术语译法基准**

全文统一使用以下译法（时辰首次出现时括注时间范围，干支柱保留汉字）：

| 中文 | 英文 |
|---|---|
| 时辰 | double-hour |
| 子/丑/寅/卯/辰/巳/午/未/申/酉/戌/亥 | Zi (Rat, 23:00–01:00) / Chou (Ox, 01:00–03:00) / Yin (Tiger, 03:00–05:00) / Mao (Rabbit, 05:00–07:00) / Chen (Dragon, 07:00–09:00) / Si (Snake, 09:00–11:00) / Wu (Horse, 11:00–13:00) / Wei (Goat, 13:00–15:00) / Shen (Monkey, 15:00–17:00) / You (Rooster, 17:00–19:00) / Xu (Dog, 19:00–21:00) / Hai (Pig, 21:00–23:00) |
| 正文中的时辰表述 | the Tiger hour (3–5 a.m.) 体例（生肖+钟点） |
| 纯阳之体 / 纯阴之体 | all-yang chart / all-yin chart |
| 三合寅午戌局 | the Tiger-Horse-Dog fire trine |
| 三合申子辰局 | the Monkey-Rat-Dragon water trine |
| 三合方会巳午未 | the Snake-Horse-Goat southern union |
| 三合方会申酉戌 | the Monkey-Rooster-Dog western union |
| 魁罡 | Kui Gang |
| 天乙贵人 | Tianyi, the Heavenly Noble |
| 羊刃 | Yang Blade |
| 桃花 | Peach Blossom |
| 驿马 | Traveling Horse |
| 将星 | General Star |
| 华盖 | Canopy Star |
| 日时干五合 / 日时支六合 | day-hour stem pairing / day-hour branch union |
| 批语方位「宜西」 | the west favors them |
| 中元节 | the Zhongyuan Festival |

- [ ] **Step 2: 写入完整英文正文**

结构与 zh 逐段对应（同名 section、同条数 article、同表格行数）。以下给出全部骨架与三条代表性批语全文（第三、第十、第十六局），其余 17 条批语按 zh 版逐条对应翻译：批语保持 imperial astrologer 口吻（"On the fourth day in the Tiger hour, …"），白话解析两三句；速查表日期用 `Aug 13` 格式、时辰用拼音（Zi / Chou / …，首行前加一次性括号说明）、「—」保留。

```html
<h1>Hour Omens of Lunar July 2026: All-Yang Charts, Trine Hours and Kui Gang</h1>
<p class="tuiyan-lead">Lunar July — the "Ghost Month" of folklore — runs from August 13 to September 10, 2026: twenty-nine days, three hundred and forty-eight double-hours. This essay charts them one by one, recording only the extraordinary: completed trines, directional unions, all-yang bodies and the Kui Gang day — each verdict cast in an imperial astrologer's antique voice, then explained in plain words. Published mid-month, it is a record of the whole month: hours already past are offered for hindsight, hours to come as folklore.</p>

<section class="tuiyan-summary">
  <h2>The Month at a Glance</h2>
  <p>In the year of Bing Wu (the Fire Horse), the month pillar runs Bing Shen, then Ding You after White Dew on September 7. Across all 348 double-hours —</p>
  <ul>
    <li><strong>Not one all-yin chart</strong>: the year and month pillars are wholly yang, so an all-yin chart is structurally impossible this month — a small lesson in how the calendar works;</li>
    <li><strong>Seventy-eight all-yang hours</strong>: roughly one hour in five, so they are marked in the quick-reference table rather than written up individually;</li>
    <li><strong>Twenty grand configurations</strong>: nine trines, ten directional unions, plus the five-marker hour of September 3 at 5–7 p.m., each with its verdict below;</li>
    <li><strong>One Kui Gang day</strong>: September 3, a Geng Chen day — all twelve double-hours carry the Kui Gang mark, with a dedicated section.</li>
  </ul>
</section>

<section class="tuiyan-grand">
  <h2>The Twenty Grand Configurations</h2>

  <!-- Items 1, 2: translate from zh 第一、二局 (same structure as below) -->

  <article class="tuiyan-item">
    <h3>3rd · Day 4, Tiger hour (Aug 16, 3–5 a.m.)</h3>
    <p class="tuiyan-pillars">Four pillars: 丙午 丙申 壬戌 壬寅</p>
    <p class="tuiyan-tags">Configuration: all-yang chart, Tiger-Horse-Dog fire trine</p>
    <blockquote class="tuiyan-verdict">On the fourth day in the Tiger hour, stems and branches stand all yang and the fire trine completes — one born here carries a commander's boldness, a minister's reach; the east favors them.</blockquote>
    <p class="tuiyan-note">Not one yin character among the eight — pure yang at its peak. Great force of character, and a temper to match; still water would serve it best.</p>
  </article>

  <!-- Items 4 through 9: translate from zh 第四至九局 -->

  <article class="tuiyan-item">
    <h3>10th · Day 15, Rooster hour (Aug 27, 7–9 p.m.) — Zhongyuan</h3>
    <p class="tuiyan-pillars">Four pillars: 丙午 丙申 癸酉 壬戌</p>
    <p class="tuiyan-tags">Configuration: Monkey-Rooster-Dog western union</p>
    <blockquote class="tuiyan-verdict">On Zhongyuan night, the fifteenth, in the Rooster hour, the western metal union completes as water begins to rise — one born in this hour walks between two worlds, gifted in medicine and divination; the west favors them.</blockquote>
    <p class="tuiyan-note">The fifteenth of the seventh month is the Zhongyuan Festival, when folk belief says the gates between the seen and unseen stand open. Metal runs clear and water quickens; the old texts read such a chart as a talent for the healing and diviner's arts.</p>
  </article>

  <!-- Items 11 through 15: translate from zh 第十一至十五局 -->

  <article class="tuiyan-item">
    <h3>16th · Day 22, Rooster hour (Sep 3, 5–7 p.m.) — Peak of the Month</h3>
    <p class="tuiyan-pillars">Four pillars: 丙午 丙申 庚辰 乙酉</p>
    <p class="tuiyan-tags">Configuration: Kui Gang day, Yang Blade, Peach Blossom, day-hour stem pairing, day-hour branch union (five markers)</p>
    <blockquote class="tuiyan-verdict">Kui Gang commands the day while Yang Blade and Peach Blossom arrive together, stems pair and branches embrace — iron will and tender heart in one body; a general who is also a romantic; the west favors them.</blockquote>
    <p class="tuiyan-note">Five markers converge on this single hour, more than any other in the month: the Kui Gang day pillar, the Yang Blade's edge, the Peach Blossom's charm, and both a stem pairing and a branch union between day and hour. Strength and sweetness in equal measure — wielded well, a scholar-general; indulged, a slave to romance.</p>
  </article>

  <!-- Items 17 through 20: translate from zh 第十七至二十局 -->
</section>

<section class="tuiyan-kuigang">
  <h2>Kui Gang: The Day of September 3</h2>
  <p>Kui Gang names four day pillars — 庚辰, 庚戌, 壬辰, 戊戌 — of which the classics say: "severe in nature, firm of grip, decisive." This lunar month holds exactly one: September 3 (day 22), a 庚辰 day. All twelve double-hours carry the mark (the "also seen" column omits Kui Gang itself):</p>
  <table class="tuiyan-table">
    <thead><tr><th>Double-hour</th><th>Hour pillar</th><th>Also seen</th></tr></thead>
    <tbody>
      <tr><td>Zi (Rat, 0–1 a.m. early-Zi)</td><td>丙子</td><td>all-yang, General Star, Monkey-Rat-Dragon water trine (see 15th)</td></tr>
      <tr><td>Chou (Ox, 1–3 a.m.)</td><td>丁丑</td><td>Heavenly Noble</td></tr>
      <tr><td>Yin (Tiger, 3–5 a.m.)</td><td>戊寅</td><td>all-yang, Traveling Horse</td></tr>
      <tr><td>Mao (Rabbit, 5–7 a.m.)</td><td>己卯</td><td>—</td></tr>
      <tr><td>Chen (Dragon, 7–9 a.m.)</td><td>庚辰</td><td>all-yang, Canopy Star</td></tr>
      <tr><td>Si (Snake, 9–11 a.m.)</td><td>辛巳</td><td>—</td></tr>
      <tr><td>Wu (Horse, 11 a.m.–1 p.m.)</td><td>壬午</td><td>all-yang</td></tr>
      <tr><td>Wei (Goat, 1–3 p.m.)</td><td>癸未</td><td>Heavenly Noble</td></tr>
      <tr><td>Shen (Monkey, 3–5 p.m.)</td><td>甲申</td><td>all-yang</td></tr>
      <tr><td>You (Rooster, 5–7 p.m.)</td><td>乙酉</td><td>Yang Blade, Peach Blossom, stem pairing, branch union (see 16th)</td></tr>
      <tr><td>Xu (Dog, 7–9 p.m.)</td><td>丙戌</td><td>all-yang</td></tr>
      <tr><td>Hai (Pig, 9–11 p.m.)</td><td>丁亥</td><td>—</td></tr>
    </tbody>
  </table>
  <p>Of the twelve, the Zi hour's all-yang water trine and the Rooster hour's five markers are written up in the main list above (15th and 16th); the rest — Canopy Star at Chen, Traveling Horse at Yin, the Heavenly Noble at Chou and Wei — each has its own interest.</p>
</section>

<section class="tuiyan-daily">
  <h2>Day-by-Day Quick Reference</h2>
  <p>One row per day. "All-yang day" marks days whose day pillar is wholly yang: on such days the six double-hours with yang stem and branch (Zi, Yin, Chen, Wu, Shen, Xu) yield all-yang charts. After September 8 the month pillar turns Ding You — a yin pillar — so even all-yang days no longer produce all-yang charts. Hours are given in pinyin (Zi = Rat, Chou = Ox, Yin = Tiger, Mao = Rabbit, Chen = Dragon, Si = Snake, Wu = Horse, Wei = Goat, Shen = Monkey, You = Rooster, Xu = Dog, Hai = Pig); lunar dates as month/day of the lunar calendar (7/1 = first day of the 7th lunar month, 7/29 = the 29th); "—" means the day has none.</p>
  <table class="tuiyan-table">
    <thead><tr><th>Date</th><th>Lunar</th><th>Day pillar</th><th>All-yang day</th><th>Heavenly Noble</th><th>Peach Blossom</th><th>Travel Horse</th><th>General Star</th><th>Yang Blade</th><th>Canopy Star</th></tr></thead>
    <tbody>
      <tr><td>Aug 13</td><td>7/1</td><td>己未</td><td>No</td><td>Zi, Shen</td><td>Zi</td><td>Si</td><td>Mao</td><td>—</td><td>Wei</td></tr>
      <tr><td>Aug 14</td><td>7/2</td><td>庚申</td><td>Yes</td><td>Chou, Wei</td><td>You</td><td>Yin</td><td>Zi</td><td>You</td><td>Chen</td></tr>
      <tr><td>Aug 15</td><td>7/3</td><td>辛酉</td><td>No</td><td>Wu, Yin</td><td>Wu</td><td>Hai</td><td>You</td><td>—</td><td>Chou</td></tr>
      <!-- 其余 26 行与 zh 版逐行同源（同 Task 3 Step 2 的 daily 数组），日期转 Aug 16/Sep 6 格式，农历转 7/4、7/22、…、8/12（廿九用 8/29 阈值内的当月序号），时辰转拼音，插完删除本注释 -->
    </tbody>
  </table>
</section>

<section class="tuiyan-disclaimer">
  <h2>A Word on Method</h2>
  <p>Birth-hour configurations draw on the classical logic of stems, branches and the five elements — a cultural framework ancient observers used to relate time and destiny. The verdicts above are written in an astrologer's antique voice for the pleasure of the tradition; they are not fate. What a life becomes still rests on one's own conduct and circumstance. Read, enjoy, and take from it what encourages you.</p>
</section>
```

注：`<!-- Items … -->` 与 `<!-- 其余 26 行 … -->` 是写作指引注释，翻译完插入实际内容后删除注释本身，交付文件中不留任何 HTML 注释。

- [ ] **Step 3: 对应完整性自查**

条目数：`tuiyan-item` 20、魁罡表行 12、速查表行 29、六个 section 与 zh 同名同序；每条 h3 的日期/钟点与 zh 版一致。

- [ ] **Step 4: 提交**

```powershell
git add src/content/tuiyan/2026-08-13.en.html
git commit -m "content(tuiyan): add lunar July 2026 en essay"
```

---

### Task 5: 聚合模块 + 单测（src/pages/tuiyan.ts）

**Files:**
- Create: `src/pages/tuiyan.ts`
- Test: `test/tuiyan.test.ts`

**Interfaces:**
- Consumes: Task 3/4 的内容片段；`PageMeta`（src/pages/registry）；`Lang`（src/config/site）
- Produces: `TuiyanPost { firstDay: string; meta: Record<Lang, PageMeta>; content: Record<Lang, string> }`、`TuiyanArchiveItem { firstDay: string; title: Record<Lang, string> }`、`TUIYAN_ARCHIVE_META { title: Record<Lang, string>; slug: "tuiyan" }`、`TUIYAN_POSTS`、`findTuiyanPost(firstDay: string): TuiyanPost | undefined`、`tuiyanArchive(): TuiyanArchiveItem[]`（Task 6/7 消费）

- [ ] **Step 1: 写失败的测试 `test/tuiyan.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { TUIYAN_ARCHIVE_META, TUIYAN_POSTS, findTuiyanPost, tuiyanArchive } from "../src/pages/tuiyan";

describe("tuiyan archive module", () => {
  it("registers the lunar July 2026 post in both languages", () => {
    expect(TUIYAN_POSTS.length).toBe(1);
    const post = TUIYAN_POSTS[0];
    expect(post.firstDay).toBe("2026-08-13");
    expect(post.meta.zh.title).toContain("七月");
    expect(post.meta.en.title).toContain("Hour Omens");
    expect(post.content.zh).toContain('class="tuiyan-grand"');
    expect(post.content.zh).toContain('class="tuiyan-daily"');
    expect(post.content.en).toContain('class="tuiyan-grand"');
    expect(post.content.zh).toContain("<h1>");
    expect(post.content.en).toContain("<h1>");
  });

  it("finds a post by lunar-month first day", () => {
    expect(findTuiyanPost("2026-08-13")?.firstDay).toBe("2026-08-13");
    expect(findTuiyanPost("2026-09-11")).toBeUndefined();
  });

  it("returns newest-first archive items", () => {
    const items = tuiyanArchive();
    expect(items[0].firstDay).toBe("2026-08-13");
    expect(items[0].title.zh).toContain("七月");
    expect(items[0].title.en).toContain("Hour Omens");
  });

  it("exposes archive meta for nav and footer", () => {
    expect(TUIYAN_ARCHIVE_META.slug).toBe("tuiyan");
    expect(TUIYAN_ARCHIVE_META.title.zh).toBe("时辰推演");
    expect(TUIYAN_ARCHIVE_META.title.en).toBe("Hour Omens");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- test/tuiyan.test.ts`
Expected: FAIL（`Cannot find module '../src/pages/tuiyan'`）

- [ ] **Step 3: 实现 `src/pages/tuiyan.ts`**

```typescript
import type { Lang } from "../config/site";
import type { PageMeta } from "./registry";
import tuiyan20260813Zh from "../content/tuiyan/2026-08-13.zh.html";
import tuiyan20260813En from "../content/tuiyan/2026-08-13.en.html";

export interface TuiyanPost {
  /** 农历月首日公历日期 "YYYY-MM-DD"（URL 键） */
  firstDay: string;
  meta: Record<Lang, PageMeta>;
  content: Record<Lang, string>;
}

export interface TuiyanArchiveItem {
  firstDay: string;
  title: Record<Lang, string>;
}

/** 归档页元信息：供 nav.ts / footer.ts 引用（不进 registry） */
export const TUIYAN_ARCHIVE_META = {
  title: { zh: "时辰推演", en: "Hour Omens" } as Record<Lang, string>,
  slug: "tuiyan",
} as const;

export const TUIYAN_POSTS: readonly TuiyanPost[] = [
  {
    firstDay: "2026-08-13",
    meta: {
      zh: {
        title: "2026农历七月特殊时辰推演：纯阳、三合局与魁罡时辰榜",
        description:
          "农历七月348个时辰逐时推演：20个一级大格、魁罡日九月三日全天12时辰、纯阳78格与每日亮点速查。",
      },
      en: {
        title: "Hour Omens of Lunar July 2026: All-Yang Charts, Trine Hours and Kui Gang",
        description:
          "All 348 double-hours of lunar July 2026 charted one by one: twenty grand configurations, the Kui Gang day of September 3, seventy-eight all-yang hours and a day-by-day quick reference.",
      },
    },
    content: { zh: tuiyan20260813Zh, en: tuiyan20260813En },
  },
];

export function findTuiyanPost(firstDay: string): TuiyanPost | undefined {
  return TUIYAN_POSTS.find((p) => p.firstDay === firstDay);
}

export function tuiyanArchive(): TuiyanArchiveItem[] {
  return [...TUIYAN_POSTS]
    .sort((a, b) => b.firstDay.localeCompare(a.firstDay))
    .map((p) => ({ firstDay: p.firstDay, title: { zh: p.meta.zh.title, en: p.meta.en.title } }));
}
```

注：若 html import 报「无法找到模块」声明错误，检查 `wrangler.jsonc` 的 Text rules globs 是否覆盖 `src/content/tuiyan/`（现有 `src/content/**/*.html` 类通配会自动覆盖新子目录，正常无需改动）。

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- test/tuiyan.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```powershell
git add src/pages/tuiyan.ts test/tuiyan.test.ts
git commit -m "feat(tuiyan): add aggregation module with tests"
```

---

### Task 6: SEO 接线（jsonld + meta + sitemap）

**Files:**
- Modify: `src/seo/jsonld.ts`
- Modify: `src/seo/meta.ts`
- Modify: `src/seo/sitemap.ts`
- Test: `test/sitemap.test.ts`

**Interfaces:**
- Consumes: `TuiyanPost` / `TUIYAN_POSTS`（Task 5）
- Produces: `tuiyanArticleJsonLd(post: TuiyanPost, lang: Lang): Record<string, unknown>`、`buildTuiyanPostHead(post: TuiyanPost, lang: Lang): string`、`buildTuiyanArchiveHead(lang: Lang): string`（Task 7 渲染层消费）；sitemap 自动含 `/{lang}/tuiyan/` 与 `/{lang}/tuiyan/{firstDay}/`

- [ ] **Step 1: 写失败的 sitemap 测试**

`test/sitemap.test.ts` 的 `describe("buildSitemapXml")` 内、monthly 用例之后加：

```typescript
  it("includes tuiyan archive and posts with bilingual alternates", () => {
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/zh/tuiyan/</loc>`);
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/en/tuiyan/</loc>`);
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/zh/tuiyan/2026-08-13/</loc>`);
    expect(xml).toContain(
      `<xhtml:link rel="alternate" hreflang="zh-CN" href="${SITE_ORIGIN}/zh/tuiyan/2026-08-13/"/>`,
    );
    expect(xml).toContain(
      `<xhtml:link rel="alternate" hreflang="en" href="${SITE_ORIGIN}/en/tuiyan/2026-08-13/"/>`,
    );
  });
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- test/sitemap.test.ts`
Expected: FAIL（tuiyan 用例红：`/zh/tuiyan/` 尚不在 sitemap）

- [ ] **Step 3: 实现 `src/seo/sitemap.ts`（三处）**

1. import 区 monthly 之后加：`import { TUIYAN_POSTS } from "../pages/tuiyan";`
2. `monthlyPostUrls` 定义之后加：

```typescript
  const tuiyanArchiveUrls = LANGS.map((lang) => ({ lang, slug: "tuiyan" }));

  const tuiyanPostUrls = TUIYAN_POSTS.flatMap((post) =>
    LANGS.map((lang) => ({ lang, slug: `tuiyan/${post.firstDay}` })),
  );
```

3. `allUrls` 数组末尾（`...monthlyPostUrls` 之后）追加 `...tuiyanArchiveUrls,` 与 `...tuiyanPostUrls,` 两行。

- [ ] **Step 4: `src/seo/jsonld.ts` 加 `tuiyanArticleJsonLd`**

import 区加 `TuiyanPost` 类型（与现有 `MonthlyPost` import 同组同风格）；`monthlyArticleJsonLd` 函数之后加：

```typescript
export function tuiyanArticleJsonLd(post: TuiyanPost, lang: Lang): Record<string, unknown> {
  return articleJsonLdBase({
    headline: post.meta[lang].title,
    description: post.meta[lang].description,
    date: post.firstDay,
    slug: `tuiyan/${post.firstDay}`,
    lang,
  });
}
```

- [ ] **Step 5: `src/seo/meta.ts` 加两个 head 构建器**

import 区：`MonthlyPost` 类型同组加 `TuiyanPost`；jsonld import 列表按字母序插 `tuiyanArticleJsonLd,`。`buildMonthlyArchiveHead` 之后加：

```typescript
/** tuiyan 单篇 head */
export function buildTuiyanPostHead(post: TuiyanPost, lang: Lang): string {
  return buildStandardHead({
    lang,
    slug: `tuiyan/${post.firstDay}`,
    title: `${post.meta[lang].title} - ${siteName(lang)}`,
    description: post.meta[lang].description,
    ogType: "article",
    jsonLdHtml: toJsonLdScript(tuiyanArticleJsonLd(post, lang)),
  });
}

/** tuiyan 归档页 head */
export function buildTuiyanArchiveHead(lang: Lang): string {
  return buildStandardHead({
    lang,
    slug: "tuiyan",
    title: lang === "zh" ? `时辰推演 - ${SITE_NAME}` : `Hour Omens - ${SITE_NAME_EN}`,
    description:
      lang === "zh"
        ? "每个农历月一篇的特殊时辰榜单：纯阳之体、三合成局、方会连珠与魁罡日逐时推演，仿古批语附白话细解。"
        : "A monthly chart of extraordinary birth hours — all-yang pillars, trines, directional unions and Kui Gang days, each with an imperial astrologer's verdict explained in plain words.",
    ogType: "website",
    jsonLdHtml: toJsonLdScript(
      collectionPageJsonLd(lang, lang === "zh" ? "时辰推演" : "Hour Omens", "tuiyan"),
    ),
  });
}
```

注：jsonld/meta 两个函数与 monthly 落地时同模式——不另设直接单测，由 Task 7 integration 断言（canonical + Article JSON-LD）覆盖。

- [ ] **Step 6: 运行测试通过 + typecheck**

Run: `npm test -- test/sitemap.test.ts`
Expected: PASS

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 7: 提交**

```powershell
git add src/seo/jsonld.ts src/seo/meta.ts src/seo/sitemap.ts test/sitemap.test.ts
git commit -m "feat(tuiyan): wire seo meta, jsonld and sitemap"
```

---

### Task 7: 渲染 + 路由 + 导航 + 集成测试

**Files:**
- Modify: `src/layout/render.ts`
- Modify: `src/routes/pages.ts`
- Modify: `src/layout/nav.ts`
- Test: `test/integration.test.ts`

**Interfaces:**
- Consumes: Task 5 聚合模块（`TUIYAN_ARCHIVE_META` / `TuiyanPost` / `TuiyanArchiveItem` / `findTuiyanPost` / `tuiyanArchive`）、Task 6 head builders
- Produces: `renderTuiyanPost(post: TuiyanPost, lang: Lang): string`、`renderTuiyanArchive(items: TuiyanArchiveItem[], lang: Lang): string`；四条路由 `GET /:lang/tuiyan`、`/:lang/tuiyan/`、`/:lang/tuiyan/:firstDay`、`/:lang/tuiyan/:firstDay/`；导航「运势」下拉第四项（footer 运势列自动跟随，无需改 footer.ts）

- [ ] **Step 1: 写失败的集成测试**

`test/integration.test.ts` 的 `describe("monthly", ...)` 之后新加：

```typescript
describe("tuiyan", () => {
  it("renders zh tuiyan archive", async () => {
    const res = await fetchNoFollow("/zh/tuiyan/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("时辰推演");
    expect(html).toContain('href="/zh/tuiyan/2026-08-13/"');
  });

  it("renders en tuiyan archive", async () => {
    const res = await fetchNoFollow("/en/tuiyan/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Hour Omens");
  });

  it("renders existing zh tuiyan post with sections, canonical and article jsonld", async () => {
    const res = await fetchNoFollow("/zh/tuiyan/2026-08-13/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("tuiyan-summary");
    expect(html).toContain("tuiyan-grand");
    expect(html).toContain("tuiyan-kuigang");
    expect(html).toContain("tuiyan-daily");
    expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/zh/tuiyan/2026-08-13/">`);
    expect(html).toContain('"@type":"Article"');
  });

  it("renders existing en tuiyan post", async () => {
    const res = await fetchNoFollow("/en/tuiyan/2026-08-13/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("tuiyan-grand");
    expect(html).toContain('hreflang="en"');
  });

  it("redirects /zh/tuiyan/2026-08-13 to trailing-slash", async () => {
    const res = await fetchNoFollow("/zh/tuiyan/2026-08-13");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/zh/tuiyan/2026-08-13/");
  });

  it("redirects /zh/tuiyan to /zh/tuiyan/", async () => {
    const res = await fetchNoFollow("/zh/tuiyan");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/zh/tuiyan/");
  });

  it("404s unknown tuiyan post and malformed date", async () => {
    const missing = await fetchNoFollow("/zh/tuiyan/2027-01-01/");
    expect(missing.status).toBe(404);
    const malformed = await fetchNoFollow("/zh/tuiyan/not-a-date/");
    expect(malformed.status).toBe(404);
  });

  it("shows tuiyan in fortune nav dropdown on both languages", async () => {
    const zh = await (await fetchNoFollow("/zh/")).text();
    expect(zh).toContain('href="/zh/tuiyan/"');
    expect(zh).toContain("时辰推演");
    const en = await (await fetchNoFollow("/en/")).text();
    expect(en).toContain('href="/en/tuiyan/"');
    expect(en).toContain("Hour Omens");
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- test/integration.test.ts -t tuiyan`
Expected: FAIL（归档/单篇均 404）

- [ ] **Step 3: `src/layout/render.ts` 加两个渲染函数**

imports：monthly 相关 import 之后加 `import { TUIYAN_ARCHIVE_META, type TuiyanArchiveItem, type TuiyanPost } from "../pages/tuiyan";`（形式随现有分组风格）；meta import 列表按字母序插 `buildTuiyanArchiveHead,` 与 `buildTuiyanPostHead,`。`renderMonthlyArchive` 之后加：

```typescript
/** tuiyan 单篇：导航高亮归档页（slug="tuiyan"），语言切换指向同篇另一语言版 */
export function renderTuiyanPost(post: TuiyanPost, lang: Lang): string {
  return layout(
    lang,
    buildTuiyanPostHead(post, lang),
    renderNav(lang, "tuiyan", `tuiyan/${post.firstDay}`),
    post.content[lang],
  );
}

/** tuiyan 归档页：按农历月首日倒序列出文章链接 */
export function renderTuiyanArchive(items: TuiyanArchiveItem[], lang: Lang): string {
  const title = TUIYAN_ARCHIVE_META.title[lang];
  const links = items
    .map(
      (item) =>
        `      <article class="tuiyan-archive-item">\n        <h2><a href="${pagePath(lang, `tuiyan/${item.firstDay}`)}">${item.title[lang]}</a></h2>\n      </article>`,
    )
    .join("\n");
  const main = `      <h1>${title}</h1>\n${links}`;
  return layout(lang, buildTuiyanArchiveHead(lang), renderNav(lang, "tuiyan", "tuiyan"), main);
}
```

- [ ] **Step 4: `src/routes/pages.ts` 加四条路由**

imports：`import { findTuiyanPost, tuiyanArchive } from "../pages/tuiyan";`（monthly import 之后）；render import 列表加 `renderTuiyanArchive,` `renderTuiyanPost,`（按现有字母序）。monthly 路由块之后、固定页 `/:lang/:slug` 301 之前加：

```typescript
// /zh/tuiyan → 301 补尾斜杠
pages.get("/:lang/tuiyan", (c) => {
  const lang = c.req.param("lang");
  if (!isLang(lang)) return c.notFound();
  return c.redirect(pagePath(lang, "tuiyan"), 301);
});

// /zh/tuiyan/ → 归档页
pages.get("/:lang/tuiyan/", (c) => {
  const lang = c.req.param("lang");
  if (!isLang(lang)) return c.notFound();
  return c.html(renderTuiyanArchive(tuiyanArchive(), lang));
});

// /zh/tuiyan/2026-08-13 → 301 补尾斜杠
pages.get("/:lang/tuiyan/:firstDay", (c) => {
  const lang = c.req.param("lang");
  const firstDay = c.req.param("firstDay");
  if (!isLang(lang)) return c.notFound();
  return c.redirect(pagePath(lang, `tuiyan/${firstDay}`), 301);
});

// /zh/tuiyan/2026-08-13/ → 单篇（firstDay 必须是合法 YYYY-MM-DD）
pages.get("/:lang/tuiyan/:firstDay/", (c) => {
  const lang = c.req.param("lang");
  const firstDay = c.req.param("firstDay");
  if (!isLang(lang)) return c.notFound();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDay)) return c.notFound();
  const post = findTuiyanPost(firstDay);
  if (!post) return c.notFound();
  return c.html(renderTuiyanPost(post, lang));
});
```

- [ ] **Step 5: `src/layout/nav.ts` 「运势」下拉加第四项**

import 区 monthly 同组加 `TUIYAN_ARCHIVE_META`；`FORTUNE_NAV_ITEMS` 数组末尾加一行：

```typescript
  { slug: TUIYAN_ARCHIVE_META.slug, label: TUIYAN_ARCHIVE_META.title },
```

注：footer.ts 运势列直接展开 `FORTUNE_NAV_ITEMS`，自动跟随，无需改动。

- [ ] **Step 6: 运行集成测试通过**

Run: `npm test -- test/integration.test.ts`
Expected: PASS（含既有全部用例——导航加项不应破坏现有断言）

- [ ] **Step 7: typecheck + 提交**

Run: `npm run typecheck`
Expected: 无错误

```powershell
git add src/layout/render.ts src/routes/pages.ts src/layout/nav.ts test/integration.test.ts
git commit -m "feat(tuiyan): add render, routes and nav entry with integration tests"
```

---

### Task 8: 样式 + AGENTS.md + 全量验证

**Files:**
- Modify: `public/assets/style.css`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: Task 3/4 正文里的 class（`tuiyan-lead` / `tuiyan-item` / `tuiyan-pillars` / `tuiyan-tags` / `tuiyan-verdict` / `tuiyan-note` / `tuiyan-table` / `tuiyan-archive-item`）
- Produces: 无代码接口；栏目上线收尾

- [ ] **Step 1: 归档条目选择器组扩一项**

`style.css` 中将：

```css
.weekly-archive-item,
.monthly-archive-item {
  margin-bottom: 1rem;
}
```

改为：

```css
.weekly-archive-item,
.monthly-archive-item,
.tuiyan-archive-item {
  margin-bottom: 1rem;
}
```

- [ ] **Step 2: 文件末尾（灵签样式块之后）加 tuiyan 样式块**

站内无全局 table 样式，各页表格自带 class（表头统一 `#f0e9df`、边框 `var(--border)`），tuiyan 沿用同一视觉语言：

```css
/* ========== 时辰推演栏目 ========== */

.tuiyan-lead {
  font-size: 1.02rem;
  line-height: 1.9;
  color: var(--fg);
  text-align: justify;
}

.tuiyan-item {
  margin: 1.5rem 0;
  padding: 1.1rem 1.25rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--paper);
}

.tuiyan-item h3 {
  font-size: 1.08rem;
  color: var(--fg);
  margin: 0 0 0.6rem;
}

.tuiyan-pillars {
  font-weight: 600;
  letter-spacing: 0.06em;
  margin: 0.4rem 0;
}

.tuiyan-tags {
  font-size: 0.92rem;
  opacity: 0.85;
  margin: 0.4rem 0;
}

.tuiyan-verdict {
  margin: 0.75rem 0;
  padding: 0.55rem 1rem;
  border-left: 3px solid var(--border);
  background: var(--paper);
  font-style: normal;
  font-weight: 500;
}

.tuiyan-note {
  font-size: 0.95rem;
  line-height: 1.85;
  color: var(--fg);
  text-align: justify;
}

.tuiyan-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
  margin: 1rem 0;
}

.tuiyan-table th,
.tuiyan-table td {
  border: 1px solid var(--border);
  padding: 0.4rem 0.55rem;
  text-align: center;
}

.tuiyan-table thead th {
  background: #f0e9df;
  font-weight: 600;
  white-space: nowrap;
}

@media (max-width: 800px) {
  .tuiyan-item { padding: 0.9rem 1rem; }
  .tuiyan-table { font-size: 0.82rem; display: block; overflow-x: auto; }
}
```

- [ ] **Step 3: 更新 `AGENTS.md`（四处）**

1. **常用命令**代码块，`npm run qian:validate` 行之前加：

```powershell
npm run tuiyan -- YYYY-MM-DD  # 生成期工具：时辰推演骨架生成器（参数 = 农历月内任意一天，输出该农历月每天×12时辰的特殊格局：纯阳/纯阴、天乙、羊刃、桃花、驿马、将星、华盖、三合局、方会、魁罡、干支合，按一级大格/魁罡日/每日亮点分级）
```

2. **目录结构与职责**中：
   - `pages/monthly.ts` 行后加 `  pages/tuiyan.ts      ★ 时辰推演聚合模块：TUIYAN_POSTS / TUIYAN_ARCHIVE_META / findTuiyanPost / tuiyanArchive（不进 registry）`
   - `fortune/` 块后加 `  tuiyan/               时辰推演模块：scan（格局规则表 + scanLunarMonth；scripts/tuiyan.ts CLI 与单测共用，非法参数 throw）`
   - `content/monthly/` 行后加 `  content/tuiyan/      时辰推演正文片段：YYYY-MM-DD.zh.html / .en.html（日期为农历月首日公历日期；总览 + 一级大格 + 魁罡专节 + 每日速查 + 免责）`
   - `scripts/fortune.ts` 行后加 `  tuiyan.ts            生成期 CLI 薄壳：时辰推演骨架输出（计算核心在 src/tuiyan/scan.ts）`
   - `seo/meta.ts` 行的 daily/weekly/monthly 之后提及 tuiyan；`seo/jsonld.ts` 行加 `tuiyanArticleJsonLd`；`seo/sitemap.ts` 行括号内加 tuiyan；`layout/nav.ts` 「运势」下拉描述加「时辰推演」；`layout/render.ts` 函数清单加 `renderTuiyanPost / renderTuiyanArchive`；`routes/pages.ts` 行 daily/weekly/monthly 后加 tuiyan
3. **核心约定第 2 条**末尾（月运③之后）加：`④ 时辰推演：src/content/tuiyan/ 加 YYYY-MM-DD.zh.html + .en.html（日期为农历月首日公历日期）→ src/pages/tuiyan.ts 的 TUIYAN_POSTS 加一条 TuiyanPost。`
4. **「每周 / 每月运势栏目」章节之后**新增「时辰推演栏目」章节：

```markdown
## 时辰推演栏目

### 架构概览

与运势三栏目同源架构：纯静态、零运行时 LLM/历法计算。骨架由 `npm run tuiyan -- 日期`（农历月内任意一天）自动推出（lunar-javascript 排四柱 + `src/tuiyan/scan.ts` 规则表打标记），文案基于骨架撰写烘焙进 git。每个农历月一篇。

- **归档页**：`/:lang/tuiyan/`（倒序）
- **单篇页**：`/:lang/tuiyan/YYYY-MM-DD/`（日期 = 农历月首日公历日期，闰月天然无歧义）
- **聚合模块**：`src/pages/tuiyan.ts`

### 内容结构（section class）

| 段 | class | 内容 | 数据来源 |
|---|---|---|---|
| 总览 | `tuiyan-summary` | 月柱分段/节气/纯阴纯阳统计/大格计数 | `npm run tuiyan` |
| 一级大格 | `tuiyan-grand` | 三合成局 ∨ 方会 ∨ 标记总数≥4 的时辰逐条批断（仿古批语+白话） | 同上 + 手写 |
| 魁罡专节 | `tuiyan-kuigang` | 魁罡日全天 12 时辰简表（已入一级者交叉引用不重复） | 同上 |
| 每日速查 | `tuiyan-daily` | 29/30 行表：日柱/纯阳日/天乙/桃花/驿马/将星/羊刃/华盖所在时辰 | 同上（CLI daily 数组） |
| 免责 | `tuiyan-disclaimer` | 文化框架声明 | 手写 |

### 生产流程

用户说"写时辰推演"：确定农历月 → `npm run tuiyan -- 月内任一天` → 写中文（总览+20条批语+魁罡节+速查表）→ 写英文（术语表见 spec）→ 注册 tuiyan.ts → 测试提交。

### 已知边界

- 时辰口径：取时辰中点排盘（子时取 0 点早子时）；月柱分段以每日午时月柱为代表。
- 纯阴 0 个/纯阳 78 个（2026 七月）只进统计与速查表标注，不单独成批。
- 白露后月柱转阴，纯阳日不再成纯阳四柱（正文文案已说明）。
- 设计与决策记录见 [时辰推演设计文档](./docs/superpowers/specs/2026-08-29-tuiyan-column-design.md)。
```

- [ ] **Step 4: 全量验证**

Run: `npm test`
Expected: 全绿（Windows 尾部 miniflare EBUSY 警告为无害噪音）

Run: `npm run typecheck`
Expected: 无错误

Run: `npm run dev` 后抽查（可选）：`/zh/tuiyan/`、`/en/tuiyan/2026-08-13/`、首页导航下拉第四项。

- [ ] **Step 5: 提交**

```powershell
git add public/assets/style.css AGENTS.md
git commit -m "feat(tuiyan): add styles and update AGENTS.md"
```
