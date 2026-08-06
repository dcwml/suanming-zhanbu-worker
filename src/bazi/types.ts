import type { Lang } from "../config/site";
import type { LlmEnv, RateLimiter } from "../llm";

export type { RateLimiter } from "../llm";

export type Part = "bazi" | "dayun" | "liunian";

export interface PillarData {
  ganZhi: string;
  /** 天干十神；日柱固定为「日主」 */
  shiShenGan: string;
  /** 藏干，逗号分隔，如 "戊,乙,癸" */
  hideGan: string;
  /** 藏干十神，逗号分隔，与藏干一一对应 */
  shiShenZhi: string;
  naYin: string;
  xunKong: string;
}

export interface DaYunItem {
  ganZhi: string;
  startAge: number;
  startYear: number;
  endYear: number;
  isCurrent: boolean;
}

export interface LiuNianItem {
  year: number;
  ganZhi: string;
  /** 虚岁 */
  age: number;
}

export interface LiuYueItem {
  /** 公历月份 1-12（流月干支按该月中旬所处节气月取值） */
  month: number;
  ganZhi: string;
}

export interface NowInfo {
  /** YYYY-MM-DD */
  solar: string;
  lunar: string;
  ganZhi: { year: string; month: string; day: string };
  liuNian: LiuNianItem[];
  liuYue: LiuYueItem[];
}

/** 单颗神煞命中项 */
export interface ShenShaItem {
  /** 神煞名，如 "天乙贵人" */
  name: string;
  /** 命中柱位，如 ["日柱", "时柱"]（统一存中文标签） */
  pillars: string[];
}

/** 命局神煞集合 */
export interface ShenShaData {
  /** 吉神 */
  auspicious: ShenShaItem[];
  /** 凶煞 */
  inauspicious: ShenShaItem[];
}

export interface BaziChart {
  gender: "male" | "female";
  solar: string;
  lunar: string;
  pillars: { year: PillarData; month: PillarData; day: PillarData; hour: PillarData };
  /** 如 "庚金" */
  dayMaster: string;
  wuxingCount: Record<string, number>;
  qiYun: string;
  daYun: DaYunItem[];
  now: NowInfo;
  /** 命局神煞（前端计算产物，可选——旧请求可能不含此字段） */
  shenSha?: ShenShaData;
}

export interface InterpretRequest {
  part: Part;
  lang: Lang;
  chart: BaziChart;
}

export interface BaziEnv extends LlmEnv {
  BAZI_RATE_LIMITER?: RateLimiter;
}
