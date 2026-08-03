/* eslint-disable */
// 生成期工具：计算指定日期的黄历宜忌数据，输出结构化 JSON。
// 仅在本地 Node 运行，不入 Worker 运行时。
// 用法：npm run almanac -- 2026-08-03
import { Solar } from "lunar-javascript";

/** 天干 → 五行 */
const GAN_WUXING: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

function compute(dateStr: string) {
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

  return {
    solar: `${y}年${m}月${d}日`,
    lunar: lunar.toString(),
    dayGanZhi,
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
  };
}

const arg = process.argv[2];
const today = new Date();
const dateStr = arg ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
  console.error(`Invalid date: ${dateStr} (expected YYYY-MM-DD)`);
  process.exit(1);
}

const result = compute(dateStr);
console.log(JSON.stringify(result, null, 2));
