import { describe, expect, it } from "vitest";
import {
  BRANCHES,
  ZODIACS,
  ZODIAC_EN,
  ZODIAC_OF_BRANCH,
  branchRelation,
  liuchongOf,
  liuhaiOf,
  liuheOf,
  pickFortuneRanks,
  sanhePartners,
  shaDirection,
  weekZodiacScores,
  type Branch,
} from "../src/fortune/rules";

describe("branchRelation", () => {
  it("returns 六合 for the six harmony pairs in both directions", () => {
    const pairs: [Branch, Branch][] = [
      ["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"],
    ];
    for (const [a, b] of pairs) {
      expect(branchRelation(a, b)).toBe("六合");
      expect(branchRelation(b, a)).toBe("六合");
    }
  });

  it("returns 相冲 for the six clash pairs in both directions", () => {
    const pairs: [Branch, Branch][] = [
      ["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"],
    ];
    for (const [a, b] of pairs) {
      expect(branchRelation(a, b)).toBe("相冲");
      expect(branchRelation(b, a)).toBe("相冲");
    }
  });

  it("returns 相害 for the six harm pairs in both directions", () => {
    const pairs: [Branch, Branch][] = [
      ["子", "未"], ["丑", "午"], ["寅", "巳"], ["卯", "辰"], ["申", "亥"], ["酉", "戌"],
    ];
    for (const [a, b] of pairs) {
      expect(branchRelation(a, b)).toBe("相害");
      expect(branchRelation(b, a)).toBe("相害");
    }
  });

  it("returns 三合 for members of the same trinity", () => {
    const groups: Branch[][] = [
      ["申", "子", "辰"], ["寅", "午", "戌"], ["巳", "酉", "丑"], ["亥", "卯", "未"],
    ];
    for (const g of groups) {
      expect(branchRelation(g[0], g[1])).toBe("三合");
      expect(branchRelation(g[0], g[2])).toBe("三合");
      expect(branchRelation(g[1], g[2])).toBe("三合");
    }
  });

  it("returns 值日 for identical branches and null for unrelated pairs", () => {
    expect(branchRelation("子", "子")).toBe("值日");
    expect(branchRelation("子", "寅")).toBeNull();
    expect(branchRelation("丑", "辰")).toBeNull();
  });
});

describe("single-branch lookups", () => {
  it("liuheOf returns the unique harmony partner", () => {
    expect(liuheOf("子")).toBe("丑");
    expect(liuheOf("巳")).toBe("申");
  });

  it("liuchongOf returns the opposite branch", () => {
    expect(liuchongOf("子")).toBe("午");
    expect(liuchongOf("亥")).toBe("巳");
  });

  it("liuhaiOf returns the harm partner", () => {
    expect(liuhaiOf("子")).toBe("未");
    expect(liuhaiOf("酉")).toBe("戌");
  });

  it("sanhePartners returns the other two trinity members", () => {
    expect(sanhePartners("子").sort().join("")).toBe("申辰");
    expect(sanhePartners("午").sort().join("")).toBe("寅戌");
  });
});

describe("shaDirection", () => {
  it("follows the three-harmony sha rule", () => {
    expect(shaDirection("寅")).toBe("北");
    expect(shaDirection("午")).toBe("北");
    expect(shaDirection("戌")).toBe("北");
    expect(shaDirection("申")).toBe("南");
    expect(shaDirection("子")).toBe("南");
    expect(shaDirection("辰")).toBe("南");
    expect(shaDirection("巳")).toBe("东");
    expect(shaDirection("酉")).toBe("东");
    expect(shaDirection("丑")).toBe("东");
    expect(shaDirection("亥")).toBe("西");
    expect(shaDirection("卯")).toBe("西");
    expect(shaDirection("未")).toBe("西");
  });
});

describe("weekZodiacScores", () => {
  // 2026-08-17 ~ 2026-08-23 的实际日支：亥 子 丑 寅 卯 辰 巳
  const days = [
    { date: "2026-08-17", weekday: 1, dayZhi: "亥" as Branch },
    { date: "2026-08-18", weekday: 2, dayZhi: "子" as Branch },
    { date: "2026-08-19", weekday: 3, dayZhi: "丑" as Branch },
    { date: "2026-08-20", weekday: 4, dayZhi: "寅" as Branch },
    { date: "2026-08-21", weekday: 5, dayZhi: "卯" as Branch },
    { date: "2026-08-22", weekday: 6, dayZhi: "辰" as Branch },
    { date: "2026-08-23", weekday: 7, dayZhi: "巳" as Branch },
  ];
  const scores = weekZodiacScores(days);
  const byZodiac = (z: string) => scores.find((s) => s.zodiac === z)!;

  it("covers all twelve zodiacs", () => {
    expect(scores.map((s) => s.zodiac).sort()).toEqual([...ZODIACS].sort());
  });

  it("scores 鼠 correctly (周三六合丑 +1, 周六三合辰 +1)", () => {
    const rat = byZodiac("鼠");
    expect(rat.score).toBe(2);
    expect(rat.positives).toBe(2);
    expect(rat.negatives).toBe(0);
    expect(rat.relations.some((r) => r.date === "2026-08-19" && r.kind === "六合")).toBe(true);
    expect(rat.relations.some((r) => r.date === "2026-08-22" && r.kind === "三合")).toBe(true);
  });

  it("scores 马 correctly (周四三合寅 +1, 周二冲子 -1, 周三害丑 -1)", () => {
    const horse = byZodiac("马");
    expect(horse.score).toBe(-1);
    expect(horse.positives).toBe(1);
    expect(horse.negatives).toBe(2);
  });

  it("scores 蛇 correctly (周一冲亥 -1, 周三三合丑 +1, 周四害寅 -1)", () => {
    const snake = byZodiac("蛇");
    expect(snake.score).toBe(-1);
    expect(snake.positives).toBe(1);
    expect(snake.negatives).toBe(2);
  });

  it("marks 值日 only for zodiacs whose branch appears that week", () => {
    for (const s of scores) {
      const zhiri = s.relations.filter((r) => r.kind === "值日");
      expect(zhiri.length).toBeLessThanOrEqual(1);
    }
    const withZhiri = scores.filter((s) => s.relations.some((r) => r.kind === "值日")).map((s) => s.zodiac).sort();
    // 本周日支 亥子丑寅卯辰巳 对应生肖
    expect(withZhiri).toEqual(["猪", "鼠", "牛", "虎", "兔", "龙", "蛇"].sort());
  });
});

describe("pickFortuneRanks", () => {
  const days = [
    { date: "2026-08-17", weekday: 1, dayZhi: "亥" as Branch },
    { date: "2026-08-18", weekday: 2, dayZhi: "子" as Branch },
    { date: "2026-08-19", weekday: 3, dayZhi: "丑" as Branch },
    { date: "2026-08-20", weekday: 4, dayZhi: "寅" as Branch },
    { date: "2026-08-21", weekday: 5, dayZhi: "卯" as Branch },
    { date: "2026-08-22", weekday: 6, dayZhi: "辰" as Branch },
    { date: "2026-08-23", weekday: 7, dayZhi: "巳" as Branch },
  ];

  it("reproduces the published reference ranking for week 2026-08-17", () => {
    const ranks = pickFortuneRanks(weekZodiacScores(days), "马");
    expect([...ranks.teJi].sort()).toEqual(["牛", "鸡", "鼠"].sort());
    expect([...ranks.ciJi].sort()).toEqual(["狗", "猴", "猪"].sort());
    expect(ranks.zhonggao).toBe("马");
  });

  it("breaks zhonggao ties with the year zodiac", () => {
    // 马与蛇同分（-1），丙午年生肖为马 → 忠告落在马
    const ranks = pickFortuneRanks(weekZodiacScores(days), "马");
    expect(ranks.zhonggao).toBe("马");
    const ranksSnakeYear = pickFortuneRanks(weekZodiacScores(days), "蛇");
    expect(ranksSnakeYear.zhonggao).toBe("蛇");
  });
});

describe("static tables", () => {
  it("has 12 branches, 12 zodiacs and matching maps", () => {
    expect(BRANCHES).toHaveLength(12);
    expect(ZODIACS).toHaveLength(12);
    expect(ZODIAC_OF_BRANCH["子"]).toBe("鼠");
    expect(ZODIAC_OF_BRANCH["亥"]).toBe("猪");
    expect(Object.keys(ZODIAC_EN)).toHaveLength(12);
    expect(ZODIAC_EN["鸡"]).toBe("Rooster");
  });
});
