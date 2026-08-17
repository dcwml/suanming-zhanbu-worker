/* eslint-disable */
// 生成期工具：周运 / 月运数据骨架生成器。
// 仅在本地 Node 运行，不入 Worker 运行时。
//
// 用法：
//   npm run fortune:week -- 2026-08-17     # 参数必须是周一，输出该周 7 天骨架 + 生肖评分 + 吉运排序
//   npm run fortune:month -- 2026-08       # 输出该月月柱分段、节气、生肖月关系、吉日速查
//
// 历法数据一律来自 lunar-javascript（经 scripts/almanac.ts 的 compute()），
// 地支关系与评分规则来自 src/fortune/rules.ts（有单测）。
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
} from "../src/fortune/rules";
import { compute } from "./almanac";

const WEEKDAY_ZH = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const WEEKDAY_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function assertIsoDate(s: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    console.error(`Invalid date: ${s} (expected YYYY-MM-DD)`);
    process.exit(1);
  }
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/** 年支 → 生肖（由年柱干支第二字推导） */
function yearZodiacOf(yearGanZhi: string): Zodiac {
  return ZODIAC_OF_BRANCH[yearGanZhi.slice(-1) as Branch];
}

function buildWeek(monday: string) {
  assertIsoDate(monday);
  const [y, m, d] = monday.split("-").map(Number);
  if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() !== 1) {
    const dt = new Date(Date.UTC(y, m - 1, d));
    const offset = (dt.getUTCDay() + 6) % 7;
    console.error(`${monday} 不是周一；该周周一为 ${addDays(monday, -offset)}`);
    process.exit(1);
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

function buildMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    console.error(`Invalid month: ${month} (expected YYYY-MM)`);
    process.exit(1);
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

const mode = process.argv[2];
const target = process.argv[3];

if (mode === "week" && target) {
  console.log(JSON.stringify(buildWeek(target), null, 2));
} else if (mode === "month" && target) {
  console.log(JSON.stringify(buildMonth(target), null, 2));
} else {
  console.error("用法：npm run fortune:week -- YYYY-MM-DD（周一） | npm run fortune:month -- YYYY-MM");
  process.exit(1);
}
