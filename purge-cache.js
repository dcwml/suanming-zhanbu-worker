// 清理 Cloudflare 缓存脚本（零依赖，Node 18+）
//
// 用法：
//   node purge-cache.js                     清空整个 zone 的缓存
//   node purge-cache.js <url> [url ...]     只清指定 URL（需完整绝对地址）
//   npm run purge                           同第一种
//
// 凭证（按优先级）：环境变量 > .dev.vars（已 gitignore，勿提交）
//   CLOUDFLARE_ZONE_ID     Cloudflare 控制台 → 域名概述页右下角 Zone ID
//   CLOUDFLARE_API_TOKEN   My Profile → API Tokens，权限只需 Zone → Cache Purge → Purge
import { readFileSync } from "node:fs";

/** 解析 .dev.vars（KEY=VALUE 每行一条，# 开头为注释），文件不存在返回空对象 */
function loadDevVars() {
  let text;
  try {
    text = readFileSync(new URL("./.dev.vars", import.meta.url), "utf8");
  } catch {
    return {};
  }
  const vars = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !line.trimStart().startsWith("#")) {
      vars[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return vars;
}

const devVars = loadDevVars();
const zoneId = process.env.CLOUDFLARE_ZONE_ID ?? devVars.CLOUDFLARE_ZONE_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN ?? devVars.CLOUDFLARE_API_TOKEN;

if (!zoneId || !apiToken) {
  console.error(
    [
      "缺少凭证，无法调用 Cloudflare API：",
      `  CLOUDFLARE_ZONE_ID   ${zoneId ? "已设置" : "缺失"}`,
      `  CLOUDFLARE_API_TOKEN ${apiToken ? "已设置" : "缺失"}`,
      "请通过环境变量提供，或写入项目根目录 .dev.vars（该文件已被 gitignore）。",
    ].join("\n"),
  );
  process.exit(1);
}

const files = process.argv.slice(2);
const body = files.length > 0 ? { files } : { purge_everything: true };

const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const result = await res.json().catch(() => null);

if (res.ok && result?.success) {
  console.log(
    files.length > 0
      ? `已清理 ${files.length} 个 URL 的缓存：\n${files.map((f) => `  ${f}`).join("\n")}`
      : "已清空整个 zone 的缓存。",
  );
} else {
  console.error(
    [
      "清理缓存失败：",
      `  HTTP 状态码: ${res.status}`,
      ...(result?.errors ?? []).map((e) => `  错误 ${e.code}: ${e.message}`),
      "  文档: https://developers.cloudflare.com/api/resources/cache/methods/purge/",
    ].join("\n"),
  );
  process.exit(1);
}
