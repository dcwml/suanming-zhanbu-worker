import type { BaziChart } from "../../src/bazi/types";

/** 合法的排盘数据夹具（1990-05-20 14:00 男）。每次调用返回全新对象，测试可安全修改。 */
export function validChart(): BaziChart {
  return {
    gender: "male",
    solar: "1990-05-20 14:00",
    lunar: "一九九〇年四月廿六 未时",
    pillars: {
      year: { ganZhi: "庚午", shiShenGan: "比肩", hideGan: "丁,己", shiShenZhi: "正官,正印", naYin: "路旁土", xunKong: "戌亥" },
      month: { ganZhi: "辛巳", shiShenGan: "劫财", hideGan: "丙,庚,戊", shiShenZhi: "七杀,比肩,偏印", naYin: "白蜡金", xunKong: "申酉" },
      day: { ganZhi: "庚辰", shiShenGan: "日主", hideGan: "戊,乙,癸", shiShenZhi: "偏印,正财,伤官", naYin: "白蜡金", xunKong: "申酉" },
      hour: { ganZhi: "癸未", shiShenGan: "伤官", hideGan: "己,丁,乙", shiShenZhi: "正印,正官,正财", naYin: "杨柳木", xunKong: "申酉" },
    },
    dayMaster: "庚金",
    wuxingCount: { 金: 3, 木: 0, 水: 1, 火: 2, 土: 2 },
    qiYun: "出生后 8 年 3 个月 12 天起运，1998 年起运",
    daYun: [
      { ganZhi: "壬午", startAge: 9, startYear: 1998, endYear: 2007, isCurrent: false },
      { ganZhi: "癸未", startAge: 19, startYear: 2008, endYear: 2017, isCurrent: false },
      { ganZhi: "甲申", startAge: 29, startYear: 2018, endYear: 2027, isCurrent: true },
    ],
    now: {
      solar: "2026-07-31",
      lunar: "丙午年六月十八",
      ganZhi: { year: "丙午", month: "乙未", day: "甲子" },
      liuNian: [
        { year: 2026, ganZhi: "丙午", age: 37 },
        { year: 2027, ganZhi: "丁未", age: 38 },
      ],
      liuYue: [
        { month: 1, ganZhi: "己丑" },
        { month: 7, ganZhi: "乙未" },
      ],
    },
    // 命局神煞（对齐问真查表；天干庚辛庚癸、地支午巳辰未、年纳音路旁土=土，手算结果）：
    //   吉神：天乙贵人(庚→丑未，时柱未)、国印贵人(庚→辰，日柱辰)、福星贵人(庚→午，年柱午)、
    //         月德贵人(月支巳→庚，年柱+日柱)、德秀贵人(月支巳→乙庚辛，年柱+月柱+日柱)、
    //         天德贵人(月支巳→辛，月柱辛)、天医(月支巳→辰，日柱辰)
    //   凶煞：流霞(庚→辰，日柱辰)、劫煞(日支辰→巳，月柱巳)、亡神(年支午→巳，月柱巳)、
    //         天罗地网(日支辰→巳，月柱巳)、寡宿(年支午→辰，日柱辰)、吊客(年支午→辰，日柱辰)、
    //         童子煞(月支巳→卯未辰+纳音土→辰巳，日柱辰+时柱未)、地网(纳音土→辰巳，日柱辰)、
    //         十恶大败(庚辰∈集合)、魁罡日(庚辰∈集合)
    shenSha: {
      auspicious: [
        { name: "天乙贵人", pillars: ["时柱"] },
        { name: "国印贵人", pillars: ["日柱"] },
        { name: "福星贵人", pillars: ["年柱"] },
        { name: "月德贵人", pillars: ["年柱", "日柱"] },
        { name: "德秀贵人", pillars: ["年柱", "月柱", "日柱"] },
        { name: "天德贵人", pillars: ["月柱"] },
        { name: "天医", pillars: ["日柱"] },
      ],
      inauspicious: [
        { name: "流霞", pillars: ["日柱"] },
        { name: "劫煞", pillars: ["月柱"] },
        { name: "亡神", pillars: ["月柱"] },
        { name: "天罗地网", pillars: ["月柱"] },
        { name: "寡宿", pillars: ["日柱"] },
        { name: "吊客", pillars: ["日柱"] },
        { name: "童子煞", pillars: ["日柱", "时柱"] },
        { name: "地网", pillars: ["日柱"] },
        { name: "十恶大败", pillars: ["日柱"] },
        { name: "魁罡日", pillars: ["日柱"] },
      ],
    },
  };
}

/** 组装完整请求体 */
export function validBody(part = "bazi", lang = "zh"): { part: string; lang: string; chart: BaziChart } {
  return { part, lang, chart: validChart() };
}
