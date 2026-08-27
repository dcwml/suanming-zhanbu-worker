import type { Hono } from "hono";
import { authProblem, type SiteAuthEnv } from "../auth";
import { callLlm, type LlmEnv } from "../llm";
import type { Lang } from "../config/site";
import { GENERATORS } from "../llmgen/registry";
import { recordApiCall, type StatsEnv } from "../stats";

const MAX_BODY_BYTES = 64 * 1024;

function err(code: string, message: string) {
  return { ok: false as const, error: { code, message } };
}

/** 注册自用内容生成路由（在 api 子应用内，basePath 已是 /api） */
export function registerLlmgenRoutes(api: Hono<{ Bindings: SiteAuthEnv & LlmEnv & StatsEnv }>): void {
  api.post("/llm/generate", async (c) => {
    // 0. 记录 API 调用（异步，不阻塞主流程）
    const db = c.env?.STATS_DB;
    if (db) {
      recordApiCall(db, "/api/llm/generate").catch(() => {});
    }

    // 1. 鉴权（自用端点：SITE_API_KEY + x-api-key；未配置 → 503 优先于 401）
    const denied = authProblem(c.env, c.req.header("x-api-key"));
    if (denied) return c.json(err(denied.code, denied.message), denied.status);

    // 2. 体积上限（先读 text 再 parse，避免超大 body 进 JSON 解析）
    const raw = await c.req.text();
    if (raw.length > MAX_BODY_BYTES) return c.json(err("payload_too_large", "Request body too large."), 413);

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return c.json(err("invalid_json", "Request body must be valid JSON."), 400);
    }

    // 3. type 查表（回显 type 一律截断）
    const b = (body ?? {}) as { type?: unknown; data?: unknown };
    if (typeof b.type !== "string" || !Object.hasOwn(GENERATORS, b.type)) {
      return c.json(
        err(
          "invalid_request",
          `Unknown type: ${String(b.type).slice(0, 64)}. Must be one of: ${Object.keys(GENERATORS).join(", ")}.`,
        ),
        400,
      );
    }
    const gen = GENERATORS[b.type as keyof typeof GENERATORS];

    // 4. data 浅校验（错误消息是字段名描述，不回显用户输入值）
    const v = gen.validate(b.data);
    if (!v.ok) return c.json(err("invalid_request", v.message), 400);

    // 5. 组提示词 → 调 LLM（user 只在 validate 通过后调用，断言安全）
    const lang = (v.value as { lang: Lang }).lang;
    const r = await callLlm(c.env ?? {}, gen.system(lang), gen.user(v.value));
    if (!r.ok) {
      const messages: Record<typeof r.code, string> = {
        not_configured: "Service is not configured.",
        upstream_error: "Service returned an error, please retry.",
        upstream_timeout: "Service timed out, please retry.",
      };
      return c.json(err(r.code, messages[r.code]), r.status);
    }
    return c.json({ ok: true, data: { type: b.type, lang, markdown: r.content } });
  });
}
