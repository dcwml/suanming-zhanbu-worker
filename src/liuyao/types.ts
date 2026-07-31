import type { Lang } from "../config/site";
import type { LlmEnv, RateLimiter } from "../llm";

export type { RateLimiter } from "../llm";

/** 一条动爻信息（position 从初爻=1 到上爻=6） */
export interface MovingLine {
  position: number;
  text: string;
}

/** 卦象文本（本卦或变卦） */
export interface HexagramText {
  name: string;
  statement: string;
}

export interface NowInfo {
  /** YYYY-MM-DD */
  solar: string;
}

export interface InterpretRequest {
  lang: Lang;
  question: string;
  /** 6 个爻值，每项 ∈ {6,7,8,9}（铜钱法） */
  lines: number[];
  now: NowInfo;
  primary: HexagramText;
  changed?: HexagramText;
  moving?: MovingLine[];
}

export interface LiuyaoEnv extends LlmEnv {
  LIUYAO_RATE_LIMITER?: RateLimiter;
}
