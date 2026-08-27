import { dailyGenerators } from "./daily";
import { weeklyGenerators } from "./weekly";
import { monthlyGenerators } from "./monthly";
import type { AnyGenerator, GenType } from "./types";

/** 生成条目注册表：加新 type = 在栏目文件加条目并在此聚合 */
export const GENERATORS: Record<GenType, AnyGenerator> = {
  ...dailyGenerators,
  ...weeklyGenerators,
  ...monthlyGenerators,
};
