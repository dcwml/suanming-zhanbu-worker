/* eslint-disable */
// 生成期 CLI 薄壳：参数解析 + 输出。计算核心在 src/almanac/compute.ts（与线上 /api/almanac 共用）。
// 仅在本地 Node 运行，不入 Worker 运行时。
// 用法：npm run almanac -- 2026-08-03
import { compute } from "../src/almanac/compute";

const arg = process.argv[2];
const today = new Date();
const dateStr = arg ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
  console.error(`Invalid date: ${dateStr} (expected YYYY-MM-DD)`);
  process.exit(1);
}

console.log(JSON.stringify(compute(dateStr), null, 2));
