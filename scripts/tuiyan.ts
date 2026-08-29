/* eslint-disable */
// 生成期 CLI 薄壳：参数解析 + 输出。计算核心在 src/tuiyan/scan.ts。
// 仅在本地 Node 运行，不入 Worker 运行时。
//
// 用法：
//   npm run tuiyan -- 2026-08-13   # 参数 = 农历月首日（月内任意一天亦可，自动归一到首日）
import { scanLunarMonth } from "../src/tuiyan/scan";

const target = process.argv[2];

if (!target) {
  console.error("用法：npm run tuiyan -- YYYY-MM-DD（农历月首日）");
  process.exit(1);
}

try {
  console.log(JSON.stringify(scanLunarMonth(target), null, 2));
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
