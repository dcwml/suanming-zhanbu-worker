import type { Lang } from "../config/site";
import type { LlmEnv, RateLimiter } from "../llm";

export type { RateLimiter } from "../llm";

/** 单柱（前端排好传入，后端只校验结构不重算） */
export interface PillarInfo {
  /** 干支，如「丙子」 */
  ganZhi: string;
  /** 藏干（逗号分隔，如「甲,丙,戊」） */
  hideGan: string;
  /** 纳音，如「涧下水」 */
  naYin: string;
}

/** 单人命盘子集（合婚只需四柱干支 + 日主 + 五行统计） */
export interface PersonChart {
  /** 公历生日 YYYY-MM-DD */
  solar: string;
  /** 农历生日文本，如「一九九六年正月初一 午时」 */
  lunar: string;
  /** 日主，如「丙火」 */
  dayMaster: string;
  /** 四柱（年/月/日/时） */
  pillars: { year: PillarInfo; month: PillarInfo; day: PillarInfo; hour: PillarInfo };
  /** 五行统计（键 ∈ 金木水火土；只数四柱明干明支 8 个） */
  wuxingCount: Record<string, number>;
}

/** 地支关系（年支/日支配对共用；取值与前端 hehun.js 查表一致） */
export type BranchRelationValue = "liuhe" | "sanhe" | "chong" | "hai" | "same" | "none";

/** 天干关系（日干配对） */
export type StemRelationValue = "wuhe" | "none";

export interface Pairing {
  /** 年支关系 */
  yearZhi: BranchRelationValue;
  /** 日支关系 */
  dayZhi: BranchRelationValue;
  /** 日干关系 */
  dayGan: StemRelationValue;
}

export interface InterpretRequest {
  lang: Lang;
  male: PersonChart;
  female: PersonChart;
  pairing: Pairing;
}

export interface HehunEnv extends LlmEnv {
  HEHUN_RATE_LIMITER?: RateLimiter;
}
