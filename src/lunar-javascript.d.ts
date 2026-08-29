// lunar-javascript 1.7.7 未附带类型声明；此处只声明 src/almanac/compute.ts 用到的 API 面。
// 升级 lunar-javascript 或新增调用时同步扩充。
// tuiyan/scan.ts 亦依赖此声明。
declare module "lunar-javascript" {
  export interface JieQiNode {
    getName(): string;
    getSolar(): { toYmd(): string };
  }

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

  export interface Lunar {
    getDayInGanZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getDayShengXiao(): string;
    getDayChong(): string;
    getDayChongShengXiao(): string;
    getDayNaYin(): string;
    getDayTianShen(): string;
    getDayTianShenLuck(): string;
    getDayYi(): string[];
    getDayJi(): string[];
    getDayJiShen(): string[];
    getDayXiongSha(): string[];
    getDayPositionXiDesc(): string;
    getDayPositionCaiDesc(): string;
    getDayPositionFuDesc(): string;
    getJieQi(): string;
    getPrevJieQi(includeEnd: boolean): JieQiNode;
    getNextJieQi(includeEnd: boolean): JieQiNode;
    getYearInGanZhi(): string;
    getMonthInGanZhi(): string;
    getMonthInGanZhiExact(): string; // 以精确时刻归节气月（交节日当天前后可不同）
    getEightChar(): EightChar;
    getMonth(): number; // 农历月数字，闰月为负
    getMonthInChinese(): string; // 如 "七"
    getDay(): number; // 农历日数字
    getDayInChinese(): string; // 如 "初一"
    toString(): string;
  }

  export interface Solar {
    getLunar(): Lunar;
  }

  export const Solar: {
    fromYmd(y: number, m: number, d: number): Solar;
    fromYmdHms(y: number, m: number, d: number, hour: number, minute: number, second: number): Solar;
  };
}
