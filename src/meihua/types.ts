import type { Lang } from "../config/site";
import type { LlmEnv, RateLimiter } from "../llm";

export type { RateLimiter } from "../llm";

/** 八卦名（中文规范名；payload 不分语言一律传中文，英文场景由 prompt 附对照表） */
export const TRIGRAMS = ["乾", "兑", "离", "震", "巽", "坎", "艮", "坤"] as const;
export type TrigramName = (typeof TRIGRAMS)[number];

/** 五行 */
export const ELEMENTS = ["金", "木", "水", "火", "土"] as const;
export type ElementName = (typeof ELEMENTS)[number];

/** 经卦信息（卦名 + 五行） */
export interface TrigramInfo {
  trigram: TrigramName;
  element: ElementName;
}

/** 重卦信息（卦名 + 卦辞 + 上下卦） */
export interface HexInfo {
  name: string;
  statement: string;
  upper: TrigramName;
  lower: TrigramName;
}

export type CastMethod = "time" | "number";

export interface InterpretRequest {
  lang: Lang;
  question: string;
  method: CastMethod;
  /** 时间起卦：公历时刻 YYYY-MM-DD HH:mm */
  solar?: string;
  /** 时间起卦：农历表述（如「丙午年七月初五未时」） */
  lunar?: string;
  /** 数字起卦：两个正整数（上卦数、下卦数） */
  numbers?: [number, number];
  /** 本卦 */
  primary: HexInfo;
  /** 互卦 */
  mutual: HexInfo;
  /** 变卦 */
  changed: HexInfo;
  /** 动爻位置（1=初爻 … 6=上爻） */
  movingLine: number;
  /** 体卦 */
  body: TrigramInfo;
  /** 用卦 */
  application: TrigramInfo;
}

export interface MeihuaEnv extends LlmEnv {
  MEIHUA_RATE_LIMITER?: RateLimiter;
}
