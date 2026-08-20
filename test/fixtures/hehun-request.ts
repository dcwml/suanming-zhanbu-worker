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
