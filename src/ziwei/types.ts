import type { Lang } from "../config/site";
import type { LlmEnv, RateLimiter } from "../llm";

export type { RateLimiter } from "../llm";

export type Part = "mingpan" | "daxian" | "liunian";

export interface MajorStar {
  name: string;
  /** 亮度：庙/旺/得/利/平/不/陷 */
  brightness: string;
  /** 四化单字（禄/权/科/忌）或空串 */
  mutagen: string;
}

export interface MinorStar {
  name: string;
  /** 吉=六吉、煞=六煞、禄=禄存、马=天马 */
  kind: "吉" | "煞" | "禄" | "马";
  mutagen: string;
}

export interface PalaceInfo {
  /** 宫名：命宫/兄弟/夫妻/子女/财帛/疾厄/迁移/仆役/官禄/田宅/福德/父母 */
  name: string;
  /** 地支 */
  branch: string;
  /** 是否身宫 */
  isBody: boolean;
  majors: MajorStar[];
  minors: MinorStar[];
}

export interface ScopeInfo {
  /** 干支 */
  ganZhi: string;
  /** 大限年龄区间，如 "36-45"（仅 decadal 有） */
  ageRange?: string;
  /** 该限/年十二宫名 */
  palaceNames: string[];
  /** 四化对应星名 [禄, 权, 科, 忌] */
  mutagen: string[];
}

export interface YearlyInfo extends ScopeInfo {
  year: number;
}

export interface ZiweiChart {
  gender: "male" | "female";
  /** YYYY-MM-DD */
  solar: string;
  lunar: string;
  /** 时辰，如 "午时" */
  time: string;
  /** 生肖，如 "马" */
  zodiac: string;
  /** 命主 */
  soul: string;
  /** 身主 */
  body: string;
  /** 五行局，如 "火六局" */
  fiveElementsClass: string;
  /** 固定 12 项 */
  palaces: PalaceInfo[];
  /** 当前大限 */
  decadal: ScopeInfo;
  /** 当前流年 */
  yearly: YearlyInfo;
}

export interface InterpretRequest {
  part: Part;
  lang: Lang;
  chart: ZiweiChart;
}

export interface ZiweiEnv extends LlmEnv {
  ZIWEI_RATE_LIMITER?: RateLimiter;
}
