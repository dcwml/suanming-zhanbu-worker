import type { Lang } from "../config/site";
import type { LlmEnv, RateLimiter } from "../llm";

export type { RateLimiter } from "../llm";

/** 五行 */
export const ELEMENTS = ["金", "木", "水", "火", "土"] as const;
export type ElementName = (typeof ELEMENTS)[number];

/** 六宫名（中文规范名；payload 不分语言一律传中文，英文场景由 prompt 附对照表） */
export const PALACE_NAMES = ["大安", "留连", "速喜", "赤口", "小吉", "空亡"] as const;
export type PalaceName = (typeof PALACE_NAMES)[number];

/** 吉凶等级 */
export type PalaceGrade = "大吉" | "吉" | "平" | "凶";

/**
 * 宫位静态属性（民间通行小六壬口诀体系）。
 * 这是数据表而非算法——后端不重算课式，落宫由前端算好传入，
 * 后端仅按宫名查表取口诀与属性组提示词。
 */
export interface PalaceInfo {
  name: PalaceName;
  /** 英文名（音译 + 意译） */
  en: string;
  /** 所配天神 */
  deity: string;
  deityEn: string;
  element: ElementName;
  grade: PalaceGrade;
  gradeEn: string;
  /** 核心意象（一句话） */
  omen: string;
  omenEn: string;
  /** 通行口诀全文 */
  poem: string;
  poemEn: string;
}

export const PALACES: readonly PalaceInfo[] = [
  {
    name: "大安",
    en: "Da An (Great Peace)",
    deity: "青龙",
    deityEn: "Green Dragon",
    element: "木",
    grade: "大吉",
    gradeEn: "Great Fortune",
    omen: "身不动时，静守安稳，谋事可成",
    omenEn: "Stillness — hold steady and peace is preserved; plans may succeed",
    poem: "大安事事昌，求谋在东方，失物去不远，宅舍保安康。行人身未动，病者主无妨，将军回田野，仔细好推详。",
    poemEn:
      "Da An brings prosperity in all things; seek your plans toward the east. Lost objects are not far away; the household stays safe and well. The traveler has not yet set out; the sick face no harm. The general returns to the countryside — ponder carefully and all becomes clear.",
  },
  {
    name: "留连",
    en: "Liu Lian (Lingering)",
    deity: "玄武",
    deityEn: "Black Tortoise",
    element: "水",
    grade: "平",
    gradeEn: "Neutral",
    omen: "卒未归时，拖延晦暗，事难速成",
    omenEn: "Lingering — delays and unclear prospects; matters are slow to complete",
    poem: "留连事难成，求谋日未明，官事只宜缓，去者未回程。失物南方见，急讨方心称，更须防口舌，人口且平平。",
    poemEn:
      "Liu Lian — affairs are hard to complete; plans stay unclear day after day. Official matters should be deferred; the one who left has not returned. Lost objects may be found in the south if sought promptly; guard against quarrels, and people and affairs remain middling.",
  },
  {
    name: "速喜",
    en: "Su Xi (Swift Joy)",
    deity: "朱雀",
    deityEn: "Vermilion Bird",
    element: "火",
    grade: "吉",
    gradeEn: "Favorable",
    omen: "人即至时，喜事将临，信音即至",
    omenEn: "Swift joy — happy news and good tidings approach quickly",
    poem: "速喜喜来临，求财向南行，失物申午未，逢人路上寻。官事有福德，病者无祸侵，田宅六畜吉，行人有信音。",
    poemEn:
      "Su Xi — joy is on its way; seek wealth toward the south. Lost objects at shen, wu or wei hours may be found along the road. Official matters carry blessings; the sick recover; fields, homes and livestock prosper; the traveler sends word.",
  },
  {
    name: "赤口",
    en: "Chi Kou (Red Mouth)",
    deity: "白虎",
    deityEn: "White Tiger",
    element: "金",
    grade: "凶",
    gradeEn: "Unfavorable",
    omen: "官事凶时，口舌是非，争执宜防",
    omenEn: "Quarrels — disputes and friction; beware of lawsuits and harsh words",
    poem: "赤口主口舌，官非切宜防，失物速速讨，行人有惊慌。六畜多作怪，病者出西方，更须防咒咀，诚恐染瘟殃。",
    poemEn:
      "Chi Kou rules quarrels and disputes; guard carefully against lawsuits. Seek lost objects at once; travelers face alarm. Livestock behave strangely; illness points west; beware of malice and curses, lest misfortune spread.",
  },
  {
    name: "小吉",
    en: "Xiao Ji (Minor Fortune)",
    deity: "六合",
    deityEn: "Six Harmony",
    element: "水",
    grade: "吉",
    gradeEn: "Favorable",
    omen: "人来喜时，和合吉庆，凡事可商",
    omenEn: "Harmony — friendly unions and good news; matters can be settled amicably",
    poem: "小吉最吉昌，路上好商量，阴人来报喜，失物在坤方。行人即便至，交关甚是强，凡事皆和合，病者叩穹苍。",
    poemEn:
      "Xiao Ji — a most favorable sign; matters are settled amicably on the road. A woman brings good news; lost objects lie toward the southwest. The traveler arrives soon; dealings go well; all things harmonize; the sick recover through prayer.",
  },
  {
    name: "空亡",
    en: "Kong Wang (Void)",
    deity: "勾陈",
    deityEn: "Hook Array",
    element: "土",
    grade: "凶",
    gradeEn: "Unfavorable",
    omen: "音信稀时，诸事落空，谋事难成",
    omenEn: "Void — plans fall through; little to gain, news stays silent",
    poem: "空亡事不祥，阴人少乖张，求财无利益，行人有灾殃。失物寻不见，官事有刑伤，病人逢暗鬼，解禳保安康。",
    poemEn:
      "Kong Wang — affairs bode ill; matters run contrary. Seeking wealth brings no gain; travelers face harm. Lost objects will not be found; lawsuits bring injury; the sick encounter hidden evils — dispel them to regain peace.",
  },
];

/** 按宫名查表 */
export const PALACE_BY_NAME: Readonly<Record<PalaceName, PalaceInfo>> = Object.fromEntries(
  PALACES.map((p) => [p.name, p]),
) as Record<PalaceName, PalaceInfo>;

export type CastMethod = "time" | "number";

export interface InterpretRequest {
  lang: Lang;
  question: string;
  method: CastMethod;
  /** 时间起课：公历时刻 YYYY-MM-DD HH:mm */
  solar?: string;
  /** 时间起课：农历表述（如「丙午年七月初三午时」） */
  lunar?: string;
  /** 数字起课：三个正整数（月数、日数、时数） */
  numbers?: [number, number, number];
  /** 月上起月所落之宫 */
  monthPalace: PalaceName;
  /** 日上起日所落之宫 */
  dayPalace: PalaceName;
  /** 时上起时所落之宫（断课落宫） */
  resultPalace: PalaceName;
}

export interface XiaoliurenEnv extends LlmEnv {
  XIAOLIUREN_RATE_LIMITER?: RateLimiter;
}
