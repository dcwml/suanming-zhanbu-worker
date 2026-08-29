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
