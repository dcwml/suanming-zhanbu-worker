// lunar-javascript 1.7.7 未附带类型声明；此处只声明 src/almanac/compute.ts 用到的 API 面。
// 升级 lunar-javascript 或新增调用时同步扩充。
declare module "lunar-javascript" {
  export interface JieQiNode {
    getName(): string;
    getSolar(): { toYmd(): string };
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
    toString(): string;
  }

  export interface Solar {
    getLunar(): Lunar;
  }

  export const Solar: {
    fromYmd(y: number, m: number, d: number): Solar;
  };
}
