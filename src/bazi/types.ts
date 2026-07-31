import type { Lang } from "../config/site";

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
}

export interface InterpretRequest {
  part: Part;
  lang: Lang;
  chart: BaziChart;
}

/** Cloudflare Rate Limiting 绑定的最小接口（不引入完整 workers-types） */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface BaziEnv {
  LLM_BASE_URL?: string;
  LLM_MODEL?: string;
  LLM_API_KEY?: string;
  BAZI_RATE_LIMITER?: RateLimiter;
}
