import { Hono } from "hono";
import { langFromPath } from "./config/site";
import { renderError, renderNotFound } from "./layout/render";
import { api } from "./routes/api";
import { pages } from "./routes/pages";
import { isBotUserAgent, recordApiCall, recordPagePathView, type StatsEnv } from "./stats";

const app = new Hono<{ Bindings: StatsEnv }>();

// api 先挂载：/api/* 未命中时返回 JSON 404，而不是落入页面路由
app.route("/", api);
app.route("/", pages);

// 全站访问统计埋点：一处中间件覆盖所有页面与 API（含未来新增路由）。
// - API：/api/* 全部请求按「天 × 路径 × HTTP 状态码」记 api_stats
// - 页面：GET 且 200 的 HTML 页按「天 × 规范路径」记 page_views（301/404 不算浏览量）
// - 爬虫/脚本 UA 一律不计；waitUntil 异步写，不阻塞响应；D1 失败静默（统计不影响主流程）
app.use("*", async (c, next) => {
  try {
    await next();
  } finally {
    // handler 抛错时 next() 以 rejection 传播，此刻 c.res 尚未生成，无从记录状态码，
    // 该请求交由 onError 返回 500、不记入统计
    const db = c.env?.STATS_DB;
    const path = c.req.path;
    const res = c.res;
    if (db && res && !isBotUserAgent(c.req.header("user-agent"))) {
      try {
        if (path.startsWith("/api/")) {
          c.executionCtx.waitUntil(recordApiCall(db, path, String(res.status)));
        } else if (
          c.req.method === "GET" &&
          res.status === 200 &&
          path !== "/sitemap.xml" &&
          path !== "/robots.txt"
        ) {
          // 静态资源命中时请求不进 Worker；此处只会收到页面路由（404 的资产请求被 status 过滤）
          c.executionCtx.waitUntil(recordPagePathView(db, path.endsWith("/") ? path : `${path}/`));
        }
      } catch {
        /* executionCtx 不可用等场景静默跳过 */
      }
    }
  }
});

app.notFound((c) => c.html(renderNotFound(langFromPath(c.req.path)), 404));

app.onError((err, c) => {
  // 记录到 Cloudflare dashboard 便于排查，响应体不泄露细节
  console.error(err);
  return c.html(renderError(langFromPath(c.req.path)), 500);
});

export default app;
