import type { Lang } from "../config/site";
import type { compute } from "../almanac/compute";
import type { buildWeek, buildMonth } from "../fortune/skeleton";

/** GET /api/almanac 的 data 形状（与 compute() 输出同构） */
export type AlmanacData = ReturnType<typeof compute>;
/** GET /api/fortune/week 的 data 形状 */
export type WeekData = ReturnType<typeof buildWeek>;
/** GET /api/fortune/month 的 data 形状 */
export type MonthData = ReturnType<typeof buildMonth>;

export interface DailyGenerateData {
  lang: Lang;
  date: string; // YYYY-MM-DD
  almanac: AlmanacData;
}
export interface WeeklyGenerateData {
  lang: Lang;
  monday: string; // YYYY-MM-DD
  week: WeekData;
}
export interface MonthlyGenerateData {
  lang: Lang;
  month: string; // YYYY-MM
  skeleton: MonthData;
}

/** 已注册的生成类型 */
export type GenType =
  | "daily-reading"
  | "daily-zodiac"
  | "daily-story"
  | "weekly-summary"
  | "weekly-zodiac"
  | "weekly-days"
  | "monthly-summary"
  | "monthly-zodiac"
  | "monthly-lucky";

export type ValidateResult<D> = { ok: true; value: D } | { ok: false; message: string };

/** 单个生成条目的强类型定义（栏目文件内部使用） */
export interface GeneratorDef<D> {
  validate(data: unknown): ValidateResult<D>;
  system(lang: Lang): string;
  user(data: D): string;
}

/** 注册表条目的统一形状（路由层使用；user 只在 validate 通过后调用） */
export interface AnyGenerator {
  validate(data: unknown): ValidateResult<unknown>;
  system(lang: Lang): string;
  user(data: unknown): string;
}

/** 把强类型条目适配为注册表条目 */
export function makeGenerator<D>(def: GeneratorDef<D>): AnyGenerator {
  return {
    validate: def.validate,
    system: def.system,
    user: (data) => def.user(data as D), // 仅在 validate 通过后调用，断言安全
  };
}
