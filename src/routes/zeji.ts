import type { Hono } from "hono";
import { callLlm } from "../llm";
import { buildZejiSystemPrompt, buildZejiUserPrompt } from "../zeji/prompt";
import type { ZejiEnv } from "../zeji/types";
import { validateZejiInterpretRequest } from "../zeji/validate";
import { recordApiCall } from "../stats";
import type { StatsEnv } from "../stats";

const MAX_BODY_BYTES = 8 * 1024;

function err(code: string, message: string) {
  return { ok: false as const, error: { code, message } };
}

/** 注册择吉解读路由（在 api 子应用内，basePath 已是 /api） */
export function registerZejiRoutes(api: Hono<{ Bindings: ZejiEnv & StatsEnv }>): void {
  api.post("/zeji/interpret", async (c) => {
    // 0. 记录 API 调用（异步，不阻塞主流程）
    const db = c.env?.STATS_DB;
    if (db) {
      recordApiCall(db, "/api/zeji/interpret").catch(() => {});
    }

    // 1. 限流（绑定缺失则跳过，本地 dev / 测试环境可用）
    const limiter = c.env?.ZEJI_RATE_LIMITER;
    if (limiter) {
      const ip = c.req.header("cf-connecting-ip") ?? "unknown";
      const { success } = await limiter.limit({ key: ip });
      if (!success) return c.json(err("rate_limited", "Too many requests, please retry later."), 429);
    }

    // 2. 体积上限（先读 text 再 parse，避免超大 body 进 JSON 解析）
    const raw = await c.req.text();
    if (raw.length > MAX_BODY_BYTES) return c.json(err("payload_too_large", "Request body too large."), 413);

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return c.json(err("invalid_json", "Request body must be valid JSON."), 400);
    }

    // 3. 校验（错误消息是我们自己的字段名描述，不回显用户输入值）
    const v = validateZejiInterpretRequest(body);
    if (!v.ok) return c.json(err("invalid_request", v.message), 400);

    // 4. 组提示词 → 调 LLM
    const r = await callLlm(c.env ?? {}, buildZejiSystemPrompt(v.value.lang), buildZejiUserPrompt(v.value));
    if (!r.ok) {
      const messages: Record<typeof r.code, string> = {
        not_configured: "Service is not configured.",
        upstream_error: "Service returned an error, please retry.",
        upstream_timeout: "Service timed out, please retry.",
      };
      return c.json(err(r.code, messages[r.code]), r.status);
    }
    return c.json({ ok: true, data: { markdown: r.content } });
  });
}
