import { fetchMock } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { callLlm } from "../src/bazi/llm";

const env = {
  LLM_BASE_URL: "https://apihub.agnes-ai.com",
  LLM_MODEL: "agnes-2.0-flash",
  LLM_API_KEY: "test-key",
};

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});

afterEach(() => {
  fetchMock.assertNoPendingInterceptors();
});

function intercept() {
  return fetchMock
    .get("https://apihub.agnes-ai.com")
    .intercept({ path: "/v1/chat/completions", method: "POST" });
}

describe("callLlm", () => {
  it("returns content on success", async () => {
    intercept().reply(200, { choices: [{ message: { content: "## 解读\n内容" } }] });
    const r = await callLlm(env, "sys", "user");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.content).toContain("解读");
  });

  it("returns not_configured/500 when credentials missing", async () => {
    const r = await callLlm({}, "sys", "user");
    expect(r).toMatchObject({ ok: false, code: "not_configured", status: 500 });
  });

  it("maps upstream 500 to upstream_error/502", async () => {
    intercept().reply(500, "boom");
    const r = await callLlm(env, "sys", "user");
    expect(r).toMatchObject({ ok: false, code: "upstream_error", status: 502 });
  });

  it("maps empty content to upstream_error/502", async () => {
    intercept().reply(200, { choices: [{ message: { content: "" } }] });
    const r = await callLlm(env, "sys", "user");
    expect(r).toMatchObject({ ok: false, code: "upstream_error", status: 502 });
  });

  it("maps timeout to upstream_timeout/504", async () => {
    intercept()
      .reply(200, { choices: [{ message: { content: "slow" } }] })
      .delay(500);
    const r = await callLlm(env, "sys", "user", 20);
    expect(r).toMatchObject({ ok: false, code: "upstream_timeout", status: 504 });
  });
});
