import { describe, expect, it } from "vitest";
import { api } from "../src/routes/api";

function req(path: string, init?: RequestInit): Request {
  return new Request(`https://example.com${path}`, init);
}

describe("POST /api/echo", () => {
  it("echoes a valid JSON body inside the ok envelope", async () => {
    const res = await api.fetch(req("/api/echo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hello: "世界" }),
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { echo: { hello: "世界" } } });
  });

  it("rejects invalid JSON with code invalid_json", async () => {
    const res = await api.fetch(req("/api/echo", { method: "POST", body: "not-json" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: { code: string } };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("invalid_json");
  });
});

describe("unknown api routes", () => {
  it("returns a JSON 404, not HTML", async () => {
    const res = await api.fetch(req("/api/nope"));
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = (await res.json()) as { ok: boolean; error: { code: string } };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("not_found");
  });

  it("truncates very long paths in the 404 message", async () => {
    const res = await api.fetch(req(`/api/${"x".repeat(500)}`));
    expect(res.status).toBe(404);
    const body = (await res.json()) as { ok: boolean; error: { message: string } };
    expect(body.error.message.length).toBeLessThan(200);
  });
});
