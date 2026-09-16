/**
 * 封面引用校验：扫描 src/pages/daily.ts 源码中引用的 cover 路径，
 * 逐个请求 R2 自定义域名，确认主图 jpg 与缩略图 thumb.webp 都真实存在。
 *
 * 用法：npm run covers:check（需要网络；写作流程收尾步骤，见每日内容生产手册）
 *
 * 说明：用正则从源码提取而非 import——pages/daily.ts 引了 90+ 个 .html Text 模块，
 * 只有 wrangler/Workers 运行时能把它们解析成字符串，tsx 无法直接加载。
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { coverThumbPath, coverUrl } from "../src/config/site";

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function exists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(30_000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const source = readFileSync(path.resolve(import.meta.dirname, "../src/pages/daily.ts"), "utf8");
  const covers = [...source.matchAll(/cover:\s*"([^"]+)"/g)].map((m) => m[1]);
  if (covers.length === 0) {
    console.log("没有引用任何封面（daily.ts 中无 cover 字段），无事可查。");
    return;
  }

  let missing = 0;
  for (const cover of covers) {
    const mainOk = await exists(coverUrl(cover));
    const thumbOk = await exists(coverUrl(coverThumbPath(cover)));
    if (mainOk && thumbOk) {
      console.log(`✓ ${cover}（含缩略图）`);
    } else {
      missing += 1;
      if (!mainOk) console.error(`✗ 缺主图：${coverUrl(cover)}`);
      if (!thumbOk) console.error(`✗ 缩略图缺失：${coverUrl(coverThumbPath(cover))}`);
    }
  }

  if (missing > 0) fail(`${missing} 个封面引用在 R2 上不完整；请重跑 npm run cover -- <日期> 补齐。`);
  console.log(`\n✅ ${covers.length} 个封面引用全部完整。`);
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
