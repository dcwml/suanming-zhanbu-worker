import type { ZiweiChart } from "../../src/ziwei/types";

/** 合法的紫微排盘夹具（1990-08-15 午时 女，iztro 2.6.0 实测产物）。每次调用返回全新对象，测试可安全修改。 */
export function validChart(): ZiweiChart {
  return {
    gender: "female",
    solar: "1990-08-15",
    lunar: "一九九〇年六月廿五",
    time: "午时",
    zodiac: "马",
    soul: "巨门",
    body: "火星",
    fiveElementsClass: "火六局",
    palaces: [
      { name: "父母", branch: "寅", isBody: false, majors: [], minors: [] },
      { name: "福德", branch: "卯", isBody: false, majors: [{ name: "天府", brightness: "得", mutagen: "" }], minors: [] },
      { name: "田宅", branch: "辰", isBody: false, majors: [{ name: "太阴", brightness: "陷", mutagen: "科" }], minors: [{ name: "文昌", kind: "吉", mutagen: "" }] },
      { name: "官禄", branch: "巳", isBody: false, majors: [{ name: "廉贞", brightness: "陷", mutagen: "" }, { name: "贪狼", brightness: "陷", mutagen: "" }], minors: [{ name: "右弼", kind: "吉", mutagen: "" }, { name: "地空", kind: "煞", mutagen: "" }, { name: "地劫", kind: "煞", mutagen: "" }] },
      { name: "仆役", branch: "午", isBody: false, majors: [{ name: "巨门", brightness: "旺", mutagen: "" }], minors: [] },
      { name: "迁移", branch: "未", isBody: false, majors: [{ name: "天相", brightness: "得", mutagen: "" }], minors: [{ name: "天钺", kind: "吉", mutagen: "" }, { name: "火星", kind: "煞", mutagen: "" }, { name: "陀罗", kind: "煞", mutagen: "" }] },
      { name: "疾厄", branch: "申", isBody: false, majors: [{ name: "天同", brightness: "旺", mutagen: "忌" }, { name: "天梁", brightness: "陷", mutagen: "" }], minors: [{ name: "禄存", kind: "禄", mutagen: "" }, { name: "天马", kind: "马", mutagen: "" }] },
      { name: "财帛", branch: "酉", isBody: false, majors: [{ name: "武曲", brightness: "利", mutagen: "权" }, { name: "七杀", brightness: "庙", mutagen: "" }], minors: [{ name: "左辅", kind: "吉", mutagen: "" }, { name: "铃星", kind: "煞", mutagen: "" }, { name: "擎羊", kind: "煞", mutagen: "" }] },
      { name: "子女", branch: "戌", isBody: false, majors: [{ name: "太阳", brightness: "不", mutagen: "禄" }], minors: [{ name: "文曲", kind: "吉", mutagen: "" }] },
      { name: "夫妻", branch: "亥", isBody: false, majors: [], minors: [] },
      { name: "兄弟", branch: "子", isBody: false, majors: [{ name: "天机", brightness: "庙", mutagen: "" }], minors: [] },
      { name: "命宫", branch: "丑", isBody: true, majors: [{ name: "紫微", brightness: "庙", mutagen: "" }, { name: "破军", brightness: "旺", mutagen: "" }], minors: [{ name: "天魁", kind: "吉", mutagen: "" }] },
    ],
    decadal: {
      ganZhi: "丙戌",
      ageRange: "36-45",
      palaceNames: ["官禄", "仆役", "迁移", "疾厄", "财帛", "子女", "夫妻", "兄弟", "命宫", "父母", "福德", "田宅"],
      mutagen: ["天同", "天机", "文昌", "廉贞"],
    },
    yearly: {
      year: 2026,
      ganZhi: "丙午",
      palaceNames: ["财帛", "子女", "夫妻", "兄弟", "命宫", "父母", "福德", "田宅", "官禄", "仆役", "迁移", "疾厄"],
      mutagen: ["天同", "天机", "文昌", "廉贞"],
    },
  };
}

/** 组装完整请求体 */
export function validBody(part = "mingpan", lang = "zh"): { part: string; lang: string; chart: ZiweiChart } {
  return { part, lang, chart: validChart() };
}
