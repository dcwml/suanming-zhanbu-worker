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
import { coverThumbPath } from "../src/config/site";

const BUCKET = "suanming-zhanbu-workers";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const API_BASE = process.env.IMAGE_API_BASE ?? "https://apihub.agnes-ai.cn";
const IMAGE_MODEL = "agnes-image-2.5-flash";

type AlmanacData = ReturnType<typeof compute>;

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

/** 十二生肖外形特征表：生图模型常把「蛇」画成龙，必须显式消歧 */
const ZODIAC_APPEARANCE: Record<string, string> = {
  鼠: "一只灵巧的小老鼠，尖吻圆耳、细长尾巴",
  牛: "一头温顺健壮的黄牛，双角弯月形",
  虎: "一只威风凛凛的老虎，虎纹鲜明",
  兔: "一只温顺可爱的白兔，长耳短尾",
  龙: "一条神采奕奕的中国龙，鹿角蛇身、鹰爪飘逸",
  蛇: "一条翡翠绿色的小青蛇，形似真实的竹叶青蛇：圆钝的小三角头、红色信子、纤细修长的身体，正优雅地盘绕在山岩灵芝之上",
  马: "一匹俊逸矫健的骏马，鬃毛飞扬",
  羊: "一只温顺优雅的山羊，卷角有须",
  猴: "一只聪明灵动的猴子，体态轻盈",
  鸡: "一只昂首挺立的雄鸡，彩羽金冠",
  狗: "一只忠诚俊朗的猎犬，体态匀称",
  猪: "一头圆润憨态的猪，体态丰腴",
};

/** 由当日黄历数据构造生图 prompt（国风水墨、画面不含文字避免乱码） */
function buildPrompt(d: AlmanacData): string {
  const jieQi = d.jieQi ? `，融入「${d.jieQi}」节气的物候意象` : "";
  const shen = d.jiShen.slice(0, 3).join("、");
  const appearance = ZODIAC_APPEARANCE[d.zodiac] ?? `一只优雅的生肖${d.zodiac}`;
  return [
    "中国传统水墨画与工笔重彩结合的横幅插画。",
    `画面主角是${appearance}（生肖${d.zodiac}），位于画面中央偏右，细节精致，神态安详吉庆。`,
    `背景为晨雾远山、苍松灵芝与祥云纹样${jieQi}，以柔和微光点缀${shen}等吉神意象。`,
    "色调古朴雅致：黛青、赭石、米白，辅以淡淡金晕。构图疏朗留白，氛围安宁吉祥。",
    "画面中不得出现任何文字、数字、印章、边框或水印。",
  ].join("");
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
  const prompt = buildPrompt(data);
  console.log(`▶ ${date} 生肖${data.zodiac}日（${data.dayGanZhi}）— 正在生成封面…`);

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
