/**
 * 封面图生成 CLI（本机运行的生成期工具，非部署产物；图片烘焙进 R2，站点零运行时依赖）
 *
 * 用法：
 *   npm run cover -- 2026-09-17           # 生成并上传到远程 R2（生产可见）
 *   npm run cover -- 2026-09-17 --local   # 上传到 wrangler 本地模拟（npm run dev 预览用）
 *
 * 流程：npm run almanac 同源当日数据构造 prompt → Agnes 生图（1K 16:9，画面无文字）
 *      → sharp 压主图 jpg + 归档缩略图 webp → wrangler r2 object put 上传
 *      （复用本机 wrangler 登录态，无需额外 S3 凭证）
 *
 * 上传后需在 src/pages/daily.ts 对应条目手工加：cover: "/covers/daily/YYYY-MM-DD.jpg"
 * 引用完整性用 npm run covers:check 校验。
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { compute } from "../src/almanac/compute";
import { buildCoverPrompt, MOOD_LABELS } from "../src/cover/prompt";
import { coverThumbPath } from "../src/config/site";

const BUCKET = "suanming-zhanbu-workers";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const API_BASE = process.env.IMAGE_API_BASE ?? "https://apihub.agnes-ai.cn";
const IMAGE_MODEL = "agnes-image-2.5-flash";


function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

/** 从 .dev.vars 读取 key（本地生成期专用，不入库） */
function loadDevVars(): Record<string, string> {
  try {
    const raw = readFileSync(path.resolve(import.meta.dirname, "../.dev.vars"), "utf8");
    const vars: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return vars;
  } catch {
    return {};
  }
}

function apiKey(): string {
  const devVars = loadDevVars();
  const key = process.env.IMAGE_API_KEY ?? process.env.LLM_API_KEY ?? devVars.IMAGE_API_KEY ?? devVars.LLM_API_KEY;
  if (!key) fail("缺少生图 API key：请设置 IMAGE_API_KEY 或 LLM_API_KEY（env 或 .dev.vars）");
  return key;
}

async function generateImage(prompt: string, key: string): Promise<Buffer> {
  const res = await fetch(`${API_BASE}/v1/images/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      size: "1K",
      ratio: "16:9",
      extra_body: { response_format: "url" },
    }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!res.ok) fail(`生图接口返回 ${res.status}：${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { data?: Array<{ url?: string; b64_json?: string }> };
  const item = json.data?.[0];
  if (item?.url) {
    const img = await fetch(item.url, { signal: AbortSignal.timeout(120_000) });
    if (!img.ok) fail(`下载生成图失败：HTTP ${img.status}`);
    return Buffer.from(await img.arrayBuffer());
  }
  if (item?.b64_json) return Buffer.from(item.b64_json, "base64");
  fail(`生图接口响应缺少图片数据：${JSON.stringify(json).slice(0, 300)}`);
}

/** 上传到 R2（--remote 远程 / --local wrangler 本地模拟），复用 wrangler 登录态 */
function upload(r2Key: string, file: string, contentType: string, local: boolean): void {
  const location = local ? "--local" : "--remote";
  const r = spawnSync(
    "npx",
    [
      "wrangler",
      "r2",
      "object",
      "put",
      `${BUCKET}/${r2Key}`,
      "--file",
      file,
      "--content-type",
      contentType,
      "--cache-control",
      // 无空格写法：Windows 下 spawnSync(shell:true) 会按空格拆参数
      "public,max-age=31536000,immutable",
      location,
    ],
    { stdio: "inherit", shell: process.platform === "win32" },
  );
  if (r.status !== 0) fail(`上传 ${r2Key} 失败`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== "--local");
  const local = process.argv.includes("--local");
  const date = args[0];
  if (!date || !DATE_RE.test(date)) fail("用法：npm run cover -- YYYY-MM-DD [--local]");

  const data = compute(date);
  const { prompt, mood, element, styleName, composition } = buildCoverPrompt(data, date);
  console.log(
    `▶ ${date} 生肖${data.zodiac}日（${data.dayGanZhi}）情绪=${MOOD_LABELS[mood]} 画风=${styleName}（天干${data.wuxing}）纳音=${data.naYin}(${element}) 构图=${composition} — 正在生成封面…`,
  );

  const raw = await generateImage(prompt, apiKey());

  const outDir = path.resolve(import.meta.dirname, "../tmp/covers");
  mkdirSync(outDir, { recursive: true });

  const jpgPath = path.join(outDir, `${date}.jpg`);
  await sharp(raw).jpeg({ quality: 85, mozjpeg: true }).toFile(jpgPath);

  const thumbPath = path.join(outDir, `${date}.thumb.webp`);
  await sharp(raw).resize({ width: 480 }).webp({ quality: 80 }).toFile(thumbPath);

  upload(`covers/daily/${date}.jpg`, jpgPath, "image/jpeg", local);
  upload(`covers/daily/${date}.thumb.webp`, thumbPath, "image/webp", local);

  rmSync(jpgPath, { force: true });
  rmSync(thumbPath, { force: true });

  console.log(`\n✅ 已上传：`);
  console.log(`   covers/daily/${date}.jpg`);
  console.log(`   covers/daily/${date}.thumb.webp`);
  console.log(`\n下一步：在 src/pages/daily.ts 的 ${date} 条目加一行：`);
  console.log(`   cover: "/covers/daily/${date}.jpg",`);
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
