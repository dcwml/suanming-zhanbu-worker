/**
 * 封面 prompt 规则引擎单测（src/cover/prompt.ts）
 *
 * 覆盖：情绪三档分级（吉 / 凶中化解 / 晦）、纳音五行归类与回落、
 * prompt 组装（防错锚句、无文字约束、吉中带谨、节气、确定性构图）。
 */

import { describe, expect, it } from "vitest";
import { compute } from "../src/almanac/compute";
import {
  buildCoverPrompt,
  classifyMood,
  elementOf,
  type CoverAlmanacData,
} from "../src/cover/prompt";

/** 构造测试数据（只需 prompt 引擎关心的字段） */
function d(overrides: Partial<CoverAlmanacData> = {}): CoverAlmanacData {
  return {
    zodiac: "马",
    naYin: "沙中金",
    wuxing: "木",
    tianShenLuck: "吉",
    jiShen: ["a", "b", "c", "d", "e"],
    xiongSha: ["1", "2", "3"],
    jieQi: "",
    ...overrides,
  };
}

describe("classifyMood", () => {
  it("黄道天神值日 → 吉", () => {
    expect(classifyMood(d({ tianShenLuck: "吉" }))).toBe("auspicious");
  });

  it("黑道值日且吉神 >= 凶煞+2 → 凶中化解", () => {
    expect(classifyMood(d({ tianShenLuck: "凶", jiShen: ["1", "2", "3", "4"], xiongSha: ["1", "2"] }))).toBe("resolving");
  });

  it("黑道值日且化解不足 → 晦", () => {
    expect(classifyMood(d({ tianShenLuck: "凶", jiShen: ["1", "2"], xiongSha: ["1", "2", "3"] }))).toBe("somber");
  });

  it("真实日期锚点：09-17 金匮吉日；09-16 朱雀凶但众吉化解；08-06 天刑凶化解不足", () => {
    expect(classifyMood(compute("2026-09-17"))).toBe("auspicious");
    expect(classifyMood(compute("2026-09-16"))).toBe("resolving");
    expect(classifyMood(compute("2026-08-06"))).toBe("somber");
  });
});

describe("elementOf", () => {
  it("纳音尾字归五行", () => {
    expect(elementOf(d({ naYin: "沙中金" }))).toBe("金");
    expect(elementOf(d({ naYin: "天河水" }))).toBe("水");
    expect(elementOf(d({ naYin: "大林木" }))).toBe("木");
  });

  it("纳音尾字不可识别时回落日干五行", () => {
    expect(elementOf(d({ naYin: "未知", wuxing: "火" }))).toBe("火");
  });
});

describe("buildCoverPrompt", () => {
  it("始终保留生肖防错锚句与无文字约束", () => {
    const r = buildCoverPrompt(d({ zodiac: "蛇" }), "2026-09-16");
    expect(r.prompt).toContain("竹叶青蛇");
    expect(r.prompt).toContain("不得出现任何文字");
  });

  it("天干五行 → 画风：五档各归其位", () => {
    expect(buildCoverPrompt(d({ wuxing: "金" }), "2026-09-17").styleName).toBe("金碧山水");
    expect(buildCoverPrompt(d({ wuxing: "木" }), "2026-09-17").styleName).toBe("木刻版画");
    expect(buildCoverPrompt(d({ wuxing: "水" }), "2026-09-17").styleName).toBe("水墨写意");
    expect(buildCoverPrompt(d({ wuxing: "火" }), "2026-09-17").styleName).toBe("敦煌壁画");
    expect(buildCoverPrompt(d({ wuxing: "土" }), "2026-09-17").styleName).toBe("浅绛山水");
  });

  it("prompt 首句携带对应画风描述；未知五行回落默认水墨工笔", () => {
    expect(buildCoverPrompt(d({ wuxing: "火" }), "2026-09-17").prompt).toContain("敦煌壁画风格");
    expect(buildCoverPrompt(d({ wuxing: "未知" }), "2026-09-17").prompt).toContain("中国传统水墨画与工笔重彩");
  });

  it("吉日凶煞偏多时叠加吉中带谨", () => {
    const r = buildCoverPrompt(d({ tianShenLuck: "吉", jiShen: ["1"], xiongSha: ["1", "2", "3"] }), "2026-09-17");
    expect(r.mood).toBe("auspicious");
    expect(r.prompt).toContain("谨慎之气");
  });

  it("节气日融入物候意象", () => {
    const r = buildCoverPrompt(d({ jieQi: "白露" }), "2026-09-07");
    expect(r.prompt).toContain("白露");
  });

  it("同日重跑确定性（构图/场景不变），跨日错开", () => {
    const a = buildCoverPrompt(d(), "2026-09-17").prompt;
    const b = buildCoverPrompt(d(), "2026-09-17").prompt;
    expect(a).toBe(b);

    const comps = new Set<string>();
    for (let i = 1; i <= 30; i++) {
      const date = `2026-09-${String(i).padStart(2, "0")}`;
      comps.add(buildCoverPrompt(d(), date).composition);
    }
    expect(comps.size).toBeGreaterThan(1);
  });

  it("真实日期示例：09-17 与 09-29 同为马日但画风与场景均不同", () => {
    const r1 = buildCoverPrompt(compute("2026-09-17"), "2026-09-17");
    const r2 = buildCoverPrompt(compute("2026-09-29"), "2026-09-29");
    expect(r1.element).toBe("金");
    expect(r2.element).toBe("水");
    // 天干五行：甲→木刻版画、丙→敦煌壁画
    expect(r1.styleName).toBe("木刻版画");
    expect(r2.styleName).toBe("敦煌壁画");
    expect(r1.prompt).not.toBe(r2.prompt);
  });
});
