/* eslint-disable */
// 生成期工具：计算指定日期的黄历宜忌数据，输出结构化 JSON。
// 仅在本地 Node 运行，不入 Worker 运行时。
// 用法：npm run almanac -- 2026-08-03
// compute() 同时导出供 scripts/fortune.ts 复用（周/月骨架生成器）。
import { fileURLToPath } from "node:url";
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

/** 仅在直接执行本文件时运行 CLI（被 fortune.ts import 时不触发） */
const isDirectRun = (() => {
  try {
    return process.argv[1] === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  const arg = process.argv[2];
  const today = new Date();
  const dateStr = arg ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    console.error(`Invalid date: ${dateStr} (expected YYYY-MM-DD)`);
    process.exit(1);
  }

  const result = compute(dateStr);
  console.log(JSON.stringify(result, null, 2));
}
