/* eslint-disable */
// 生成期 CLI 薄壳：参数解析 + 输出。计算核心在 src/fortune/skeleton.ts（与线上 /api/fortune/* 共用）。
// 仅在本地 Node 运行，不入 Worker 运行时。
//
// 用法：
//   npm run fortune:week -- 2026-08-17     # 参数必须是周一，输出该周 7 天骨架 + 生肖评分 + 吉运排序
//   npm run fortune:month -- 2026-08       # 输出该月月柱分段、节气、生肖月关系、吉日速查
import { buildWeek, buildMonth } from "../src/fortune/skeleton";

const mode = process.argv[2];
const target = process.argv[3];

try {
  if (mode === "week" && target) {
    console.log(JSON.stringify(buildWeek(target), null, 2));
  } else if (mode === "month" && target) {
    console.log(JSON.stringify(buildMonth(target), null, 2));
  } else {
    console.error("用法：npm run fortune:week -- YYYY-MM-DD（周一） | npm run fortune:month -- YYYY-MM");
    process.exit(1);
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
