/**
 * 生产环境统计报告 CLI（本机运行的自用工具）
 *
 * 用法：
 *   npm run stats:report                              # 默认近 30 天、Top 20
 *   npm run stats:report -- --days 7 --top 15         # 自定义窗口与条数
 *   npm run stats:report -- --key <生产SITE_API_KEY>   # 显式传 key
 *   SITE_API_KEY=<生产key> npm run stats:report        # 或走环境变量
 *
 * key 来源优先级：--key > 环境变量 SITE_API_KEY > .dev.vars 的 SITE_API_KEY。
 * 注意：.dev.vars 里是本地 key，与生产不同值——用它请求会 401，
 * 报错信息会提示；忘掉生产 key 就重设：npx wrangler secret put SITE_API_KEY。
 *
 * 数据端点（生产）：GET /api/stats/overview、/api/stats/pages、/api/stats/apis
 * 另注：本脚本自身的请求 UA 含 tsx/node，会被服务端爬虫过滤，不污染统计。
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_BASE = "https://suanming-zhanbu.com";

// ── 参数解析 ─────────────────────────────────────────────

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

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

function parseArgs(argv: string[]): { days: number; top: number; key?: string; base: string } {
  let days = 30;
  let top = 20;
  let key: string | undefined;
  let base = DEFAULT_BASE;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--days") days = Number(argv[++i]);
    else if (a === "--top") top = Number(argv[++i]);
    else if (a === "--key") key = argv[++i];
    else if (a === "--base") base = argv[++i].replace(/\/$/, "");
    else fail(`未知参数：${a}（支持 --days N --top N --key K --base URL）`);
  }
  if (!Number.isInteger(days) || days < 1 || days > 365) fail("--days 须为 1-365 的整数");
  if (!Number.isInteger(top) || top < 1) fail("--top 须为正整数");
  return { days, top, key, base };
}

// ── 接口调用 ─────────────────────────────────────────────

type ApiJson<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

async function getJson<T>(base: string, apiPath: string, key: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base}${apiPath}`, {
      headers: { "x-api-key": key },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    fail(`请求失败（${apiPath}）：${e instanceof Error ? e.message : String(e)}`);
  }
  if (res.status === 401) {
    fail(
      "401 unauthorized：key 不被生产环境接受。.dev.vars 里是本地 key（与生产不同值），" +
        "请用 --key 传入生产 SITE_API_KEY，或设置环境变量 SITE_API_KEY；忘掉就重设：npx wrangler secret put SITE_API_KEY",
    );
  }
  if (!res.ok) {
    let detail = "";
    try {
      const j = (await res.json()) as ApiJson<T>;
      if (!j.ok) detail = ` — ${j.error.code}: ${j.error.message}`;
    } catch {
      /* 保留空 detail */
    }
    fail(`HTTP ${res.status}（${apiPath}）${detail}`);
  }
  const j = (await res.json()) as ApiJson<T>;
  if (!j.ok) fail(`接口返回错误（${apiPath}）：${j.error.code}: ${j.error.message}`);
  return j.data;
}

// ── 渲染（导出便于离线验证） ─────────────────────────────

interface Overview {
  date: string;
  pv: { today: number; yesterday: number; last7: number; last30: number; total: number };
  uv: { today: number };
  api: { total: number; today: number };
}

interface PageStats {
  days: number;
  since: string;
  paths: Array<{ path: string; total_views: number; recent_views: number }>;
  daily: Array<{ date: string; views: number }>;
}

interface ApiStats {
  endpoints: Array<{
    api_path: string;
    total_calls: number;
    today_calls: number;
    by_status: Record<string, number>;
  }>;
}

const fmt = (n: number): string => n.toLocaleString("en-US");
const pad = (n: number, w: number): string => fmt(n).padStart(w);

function bar(views: number, max: number, width = 36): string {
  if (max <= 0 || views <= 0) return "";
  return "█".repeat(Math.max(1, Math.round((views / max) * width)));
}

export function renderOverview(o: Overview): string[] {
  return [
    `【总览】（统计日 ${o.date}，Asia/Shanghai）`,
    `  页面 PV    今日 ${pad(o.pv.today, 6)} │ 昨日 ${pad(o.pv.yesterday, 6)} │ 近7天 ${pad(o.pv.last7, 8)} │ 近30天 ${pad(o.pv.last30, 8)} │ 累计 ${pad(o.pv.total, 8)}`,
    `  独立访客   今日 ${pad(o.uv.today, 6)}（首页/八字/六爻三页的 UV 去重口径）`,
    `  API 调用   今日 ${pad(o.api.today, 6)} │ 累计 ${pad(o.api.total, 8)}`,
  ];
}

export function renderPages(p: PageStats, top: number): string[] {
  const lines = [
    `【页面浏览量 · 近 ${p.days} 天（自 ${p.since}）】共 ${p.paths.length} 个路径` +
      (p.paths.length > top ? `，显示 Top ${top}` : ""),
  ];
  if (p.paths.length === 0) {
    lines.push("  （暂无数据）");
    return lines;
  }
  const max = Math.max(...p.paths.slice(0, top).map((x) => x.recent_views));
  lines.push(
    `  ${pad("近N天", 8)} ${pad("累计", 10)}  路径`,
  );
  for (const row of p.paths.slice(0, top)) {
    lines.push(
      `  ${pad(row.recent_views, 8)} ${pad(row.total_views, 10)}  ${row.path}${row.recent_views > 0 ? "  " + bar(row.recent_views, max) : ""}`,
    );
  }
  lines.push(`  —— 按日序列（近 ${p.days} 天）——`);
  const dMax = Math.max(...p.daily.map((x) => x.views), 1);
  for (const d of p.daily.slice(0, 30)) {
    lines.push(`  ${d.date}  ${pad(d.views, 8)}  ${bar(d.views, dMax)}`);
  }
  if (p.daily.length > 30) lines.push(`  …（其余 ${p.daily.length - 30} 天略）`);
  return lines;
}

export function renderApis(a: ApiStats, top: number): string[] {
  const lines = [`【API 调用】共 ${a.endpoints.length} 个端点` + (a.endpoints.length > top ? `，显示 Top ${top}` : "")];
  if (a.endpoints.length === 0) {
    lines.push("  （暂无数据）");
    return lines;
  }
  for (const e of a.endpoints.slice(0, top)) {
    const status = Object.entries(e.by_status)
      .sort((x, y) => y[1] - x[1])
      .map(([code, n]) => `${code}:${fmt(n)}`)
      .join(" ");
    lines.push(
      `  ${pad(e.total_calls, 8)} 次 │ 今日 ${pad(e.today_calls, 5)} │ ${status.padEnd(24)}  ${e.api_path}`,
    );
  }
  return lines;
}

// ── 主流程 ───────────────────────────────────────────────

function keyFromDevVars(): string | undefined {
  return loadDevVars().SITE_API_KEY;
}

async function main(): Promise<void> {
  const { days, top, key: keyArg, base } = parseArgs(process.argv.slice(2));
  const key = keyArg ?? process.env.SITE_API_KEY ?? keyFromDevVars();
  if (!key) fail("缺少 key：用 --key 或环境变量 SITE_API_KEY 传入生产 SITE_API_KEY");

  const overview = await getJson<Overview>(base, "/api/stats/overview", key);
  const pages = await getJson<PageStats>(base, `/api/stats/pages?days=${days}`, key);
  const apis = await getJson<ApiStats>(base, "/api/stats/apis", key);

  const rule = "═".repeat(62);
  console.log(`${rule}\n 生产环境统计报告 · ${base.replace(/^https?:\/\//, "")}\n${rule}\n`);
  for (const line of renderOverview(overview)) console.log(line);
  console.log("");
  for (const line of renderPages(pages, top)) console.log(line);
  console.log("");
  for (const line of renderApis(apis, top)) console.log(line);
  console.log(`\n${rule}`);
}

/** 仅直接执行时运行 main（保持模块可被导入做离线渲染验证） */
const invoked = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;
if (invoked) {
  main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
}
