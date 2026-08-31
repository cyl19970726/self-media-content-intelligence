import { describe, expect, it } from "vitest";
import { RedFoxClient, RedFoxError, resolveRedFoxProxyUrl } from "./redfox-client.js";

describe("RedFoxClient", () => {
  it("keeps the credential in the server request header and counts successful requests", async () => {
    let observedKey = "";
    const client = new RedFoxClient({ apiKey: "test-secret", fetchImpl: async (_input, init) => {
      observedKey = new Headers(init?.headers).get("REDFOX_API_KEY") ?? "";
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }});
    expect(await client.post("/endpoint", { public: true })).toEqual({ ok: true });
    expect(observedKey).toBe("test-secret");
    expect(client.usageSnapshot()).toEqual({ "/endpoint": 1 });
  });

  it("maps authentication responses without exposing the response body", async () => {
    const client = new RedFoxClient({ apiKey: "bad", fetchImpl: async () => new Response("private upstream body", { status: 403 }) });
    await expect(client.post("/endpoint", {})).rejects.toMatchObject({ kind: "authentication", status: 403 } satisfies Partial<RedFoxError>);
    await expect(client.post("/endpoint", {})).rejects.not.toThrow(/private upstream body/);
  });

  it("uses only standard proxy environment variables", () => {
    expect(resolveRedFoxProxyUrl({
      REDFOX_PROXY_URL: "http://127.0.0.1:7890",
      HTTPS_PROXY: "http://127.0.0.1:7897"
    })).toBe("http://127.0.0.1:7897");
    expect(resolveRedFoxProxyUrl({})).toBeNull();
  });
});
