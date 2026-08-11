import type { Lang } from "../config/site";
import type { LlmEnv, RateLimiter } from "../llm";

export type { RateLimiter } from "../llm";

export interface ZejiPillars {
  year: string;
  month: string;
  day: string;
  hour: string;
}

/** 一位相关人：生肖模式只传 yearBranch；八字模式传 pillars（两处都传亦可） */
export interface ZejiPerson {
  yearBranch?: string;
  pillars?: ZejiPillars;
}

export interface ZejiCandidate {
  solar: string;           // YYYY-MM-DD
  lunar: string;           // 农历描述，如"七月初十"
  dayGanZhi: string;       // 日柱，如"甲子"
  zhiXing: string;         // 建除值星，如"成"
  tianShenLuck: "吉" | "凶";
  xiu: string;             // 二十八宿名
  jiShen: string[];
  xiongSha: string[];
  chongShengXiao: string;  // 冲生肖，如"马"
  shaDirection: string;    // 煞方，如"南"
}

export interface ZejiInterpretRequest {
  lang: Lang;
  matter: string;          // 事项中文原词，如"嫁娶"
  candidate: ZejiCandidate;
  persons: ZejiPerson[];   // 最多 2 人
}

export interface ZejiEnv extends LlmEnv {
  ZEJI_RATE_LIMITER?: RateLimiter;
}
