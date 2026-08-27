import { fetchMock } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { api } from "../src/routes/api";
import { compute } from "../src/almanac/compute";
import type { SiteAuthEnv } from "../src/auth";
import type { LlmEnv } from "../src/llm";
import type { StatsEnv } from "../src/stats";

type TestEnv = SiteAuthEnv & LlmEnv & StatsEnv;

// LLM_BASE_URL 不含 /v1：callLlm 内部拼 `${LLM_BASE_URL}/v1/chat/completions`（与 bazi-api.test.ts 同源 stub）
const baseEnv: TestEnv = {
  SITE_API_KEY: "test-key",
  LLM_BASE_URL: "https://apihub.agnes-ai.com",
  LLM_MODEL: "test-model",
  LLM_API_KEY: "test-llm-key",
};

// 锚点：2026-08-17 癸亥日、生肖猪（Task 2 Step 0 已复核）
const goodData = { lang: "zh", date: "2026-08-17", almanac: compute("2026-08-17") };

function req(body: string, key?: string): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (key !== undefined) headers["x-api-key"] = key;
  return new Request("http://localhost/api/llm/generate", { method: "POST", headers, body });
}

const jsonBody = (type: unknown, data: unknown) => JSON.stringify({ type, data });

type ApiJson = {
  ok: boolean;
  data?: { type?: string; lang?: string; markdown?: string };
  error?: { code: string; message?: string };
};

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});

afterEach(() => {
  fetchMock.assertNoPendingInterceptors();
});

function stubLlm(content: string, status = 200): void {
  fetchMock
    .get("https://apihub.agnes-ai.com")
    .intercept({ path: "/v1/chat/completions", method: "POST" })
    .reply(status, { choices: [{ message: { content } }] });
}

describe("POST /api/llm/generate", () => {
  it("returns 503 not_configured when SITE_API_KEY is not set", async () => {
    const res = await api.fetch(req(jsonBody("daily-reading", goodData), "any"), {});
    expect(res.status).toBe(503);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("not_configured");
  });

  it("returns 401 unauthorized without x-api-key", async () => {
    const res = await api.fetch(req(jsonBody("daily-reading", goodData)), baseEnv);
    expect(res.status).toBe(401);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("unauthorized");
  });

  it("returns 401 unauthorized with wrong key", async () => {
    const res = await api.fetch(req(jsonBody("daily-reading", goodData), "wrong"), baseEnv);
    expect(res.status).toBe(401);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("unauthorized");
  });

  it("returns 400 invalid_json on malformed body", async () => {
    const res = await api.fetch(req("{not json", "test-key"), baseEnv);
    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("invalid_json");
  });

  it("returns 413 payload_too_large over 64KB", async () => {
    // 体积检查在 JSON.parse 之前，body 无效也没关系
    const big = '{"type":"daily-reading","data":"' + " ".repeat(66_000) + '"}';
    const res = await api.fetch(req(big, "test-key"), baseEnv);
    expect(res.status).toBe(413);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("payload_too_large");
  });

  it("returns 400 invalid_request on unknown type", async () => {
    const res = await api.fetch(req(jsonBody("yearly-summary", goodData), "test-key"), baseEnv);
    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("invalid_request");
    expect(json.error?.message).toContain("Unknown type");
  });

  it("returns 400 invalid_request on prototype-inherited key like toString", async () => {
    // `in` 会沿原型链命中 Object.prototype.toString；必须只认 GENERATORS 自有键
    const res = await api.fetch(req(jsonBody("toString", {}), "test-key"), baseEnv);
    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("invalid_request");
    expect(json.error?.message).toContain("Unknown type");
  });

  it("returns 400 invalid_request when data fails validation", async () => {
    const res = await api.fetch(
      req(jsonBody("daily-reading", { lang: "zh", date: "2026-08-17" }), "test-key"),
      baseEnv,
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("invalid_request");
  });

  it("returns generated markdown echoing type and lang", async () => {
    stubLlm("### 今日导引\n\n癸亥日宜祭祀。");
    const res = await api.fetch(req(jsonBody("daily-reading", goodData), "test-key"), baseEnv);
    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiJson;
    expect(json.ok).toBe(true);
    expect(json.data?.type).toBe("daily-reading");
    expect(json.data?.lang).toBe("zh");
    expect(json.data?.markdown).toContain("癸亥日宜祭祀");
  });

  it("returns 500 not_configured when LLM env is missing", async () => {
    const env: TestEnv = { SITE_API_KEY: "test-key" };
    const res = await api.fetch(req(jsonBody("daily-reading", goodData), "test-key"), env);
    expect(res.status).toBe(500);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("not_configured");
  });

  it("returns 502 upstream_error when LLM replies 500", async () => {
    stubLlm("unused", 500);
    const res = await api.fetch(req(jsonBody("daily-reading", goodData), "test-key"), baseEnv);
    expect(res.status).toBe(502);
    const json = (await res.json()) as ApiJson;
    expect(json.error?.code).toBe("upstream_error");
  });
});
