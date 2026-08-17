import { Hono } from "hono";
import { registerBaziRoutes } from "./bazi";
import { registerLiuyaoRoutes } from "./liuyao";
import { registerMeihuaRoutes } from "./meihua";
import { registerZejiRoutes } from "./zeji";
import type { BaziEnv } from "../bazi/types";
import type { LiuyaoEnv } from "../liuyao/types";
import type { MeihuaEnv } from "../meihua/types";
import type { ZejiEnv } from "../zeji/types";
import type { StatsEnv } from "../stats";

/**
 * /api/* 预留接口层。
 * 统一响应壳：{ ok: true, data } / { ok: false, error: { code, message } }
 * 未来接入 LLM 时按同样模式新增接口，例如 POST /api/divine。
 */
export const api = new Hono<{ Bindings: BaziEnv & LiuyaoEnv & MeihuaEnv & ZejiEnv & StatsEnv }>().basePath("/api");

api.post("/echo", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { ok: false, error: { code: "invalid_json", message: "Request body must be valid JSON." } },
      400,
    );
  }
  return c.json({ ok: true, data: { echo: body } });
});

registerBaziRoutes(api);
registerLiuyaoRoutes(api);
registerMeihuaRoutes(api);
registerZejiRoutes(api);

// 兜底：/api/* 未命中一律返回 JSON 404（而非 HTML 404 页）
api.all("*", (c) =>
  c.json(
    {
      ok: false,
      error: {
        code: "not_found",
        // 截断路径回显，避免超长路径放大响应体 / 日志注入
        message: `API endpoint not found: ${c.req.path.slice(0, 128)}`,
      },
    },
    404,
  ),
);

api.onError((_err, c) =>
  c.json({ ok: false, error: { code: "internal_error", message: "Internal Server Error" } }, 500),
);
