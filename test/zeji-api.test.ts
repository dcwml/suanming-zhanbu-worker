import { fetchMock } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { api } from "../src/routes/api";
import type { ZejiEnv } from "../src/zeji/types";
import { validZejiRequest } from "./fixtures/zeji-request";

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});
afterEach(() => {
  fetchMock.assertNoPendingInterceptors();
});

const baseEnv: ZejiEnv = {
  LLM_BASE_URL: "https://apihub.agnes-ai.cn",
  LLM_MODEL: "agnes-2.0-flash",
  LLM_API_KEY: "test-key",
};

function allowLimiter(success: boolean): ZejiEnv["ZEJI_RATE_LIMITER"] {
  return { limit: async () => ({ success }) };
}

function req(body: unknown): Request {
  return new Request("http://localhost/api/zeji/interpret", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "1.2.3.4" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/zeji/interpret", () => {
  it("returns markdown on success", async () => {
    fetchMock
      .get("https://apihub.agnes-ai.cn")
      .intercept({ path: "/v1/chat/completions", method: "POST" })
      .reply(200, { choices: [{ message: { content: "## 择吉解读\n内容" } }] });
    const res = await api.fetch(req(validZejiRequest()), { ...baseEnv, ZEJI_RATE_LIMITER: allowLimiter(true) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; data: { markdown: string } };
    expect(json.ok).toBe(true);
    expect(json.data.markdown).toContain("择吉解读");
  });

  it("works without rate limiter binding (local dev)", async () => {
    fetchMock
      .get("https://apihub.agnes-ai.cn")
      .intercept({ path: "/v1/chat/completions", method: "POST" })
      .reply(200, { choices: [{ message: { content: "ok" } }] });
    const res = await api.fetch(req(validZejiRequest()), baseEnv);
    expect(res.status).toBe(200);
  });

  it("returns 429 when rate limited", async () => {
    const res = await api.fetch(req(validZejiRequest()), { ...baseEnv, ZEJI_RATE_LIMITER: allowLimiter(false) });
    expect(res.status).toBe(429);
    const json = (await res.json()) as { ok: boolean; error: { code: string } };
    expect(json).toMatchObject({ ok: false, error: { code: "rate_limited" } });
  });

  it("returns 400 on invalid json", async () => {
    const res = await api.fetch(req("{oops"), baseEnv);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("invalid_json");
  });

  it("returns 400 on validation failure without echoing user input", async () => {
    const body = validZejiRequest();
    body.persons = [{ yearBranch: "猫" }];
    body.matter = "secretTokenXYZ";
    const res = await api.fetch(req(body), baseEnv);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string; message: string } };
    expect(json.error.code).toBe("invalid_request");
    expect(json.error.message).not.toContain("secretTokenXYZ");
  });

  it("returns 413 when body exceeds 8KB", async () => {
    const res = await api.fetch(req(JSON.stringify(validZejiRequest()) + " ".repeat(9000)), baseEnv);
    expect(res.status).toBe(413);
  });

  it("returns 500 not_configured when llm key missing", async () => {
    const res = await api.fetch(req(validZejiRequest()), {});
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("not_configured");
  });

  it("maps upstream failure to 502", async () => {
    fetchMock
      .get("https://apihub.agnes-ai.cn")
      .intercept({ path: "/v1/chat/completions", method: "POST" })
      .reply(500, "boom");
    const res = await api.fetch(req(validZejiRequest()), baseEnv);
    expect(res.status).toBe(502);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("upstream_error");
  });
});
