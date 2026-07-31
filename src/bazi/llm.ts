import type { BaziEnv } from "./types";

export type LlmResult =
  | { ok: true; content: string }
  | { ok: false; code: "not_configured" | "upstream_error" | "upstream_timeout"; status: 500 | 502 | 504 };

/**
 * 调用 OpenAI 兼容的 chat/completions 接口（非流式）。
 * timeoutMs 参数化便于测试注入短超时；生产默认 60 秒。
 */
export async function callLlm(
  env: BaziEnv,
  system: string,
  user: string,
  timeoutMs = 60_000,
): Promise<LlmResult> {
  const { LLM_BASE_URL, LLM_MODEL, LLM_API_KEY } = env;
  if (!LLM_BASE_URL || !LLM_MODEL || !LLM_API_KEY) {
    return { ok: false, code: "not_configured", status: 500 };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, code: "upstream_error", status: 502 };
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim() === "") {
      return { ok: false, code: "upstream_error", status: 502 };
    }
    return { ok: true, content };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, code: "upstream_timeout", status: 504 };
    }
    return { ok: false, code: "upstream_error", status: 502 };
  } finally {
    clearTimeout(timer);
  }
}
