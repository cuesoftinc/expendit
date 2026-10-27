// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const params = (path: string[]) => ({ params: Promise.resolve({ path }) });

describe("/api/v1 proxy (system-design.md §7.1)", () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];

  beforeEach(() => {
    process.env.API_ORIGIN = "http://common:8080";
    process.env.UPLOADS_ORIGIN = "http://statements:8081";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        return new Response(JSON.stringify({ ok: true }), {
          status: 201,
          headers: {
            "content-type": "application/json",
            "retry-after": "7",
            "set-cookie": "x=1",
          },
        });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    calls.length = 0;
  });

  it("sends API calls to common with the auth, org and idempotency headers", async () => {
    const response = await POST(
      new Request("http://web.local/api/v1/import?x=1", {
        method: "POST",
        headers: {
          Authorization: "Bearer t",
          "X-Org-Id": "org-1",
          "Idempotency-Key": "k",
          "Content-Type": "application/json",
          Cookie: "session=secret",
        },
        body: JSON.stringify({ file_name: "a.csv", size: 1 }),
      }),
      params(["import"]),
    );
    expect(calls[0].url).toBe("http://common:8080/api/v1/import?x=1");
    const sent = calls[0].init.headers as Headers;
    expect(sent.get("authorization")).toBe("Bearer t");
    expect(sent.get("x-org-id")).toBe("org-1");
    expect(sent.get("idempotency-key")).toBe("k");
    expect(sent.get("cookie")).toBeNull(); // only contract headers pass
    expect(response.status).toBe(201);
    expect(response.headers.get("retry-after")).toBe("7");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("sends uploads to statements with the ticket", async () => {
    await POST(
      new Request("http://web.local/api/v1/uploads", {
        method: "POST",
        headers: { "Upload-Ticket": "v1.a.b" },
        body: "file",
      }),
      params(["uploads"]),
    );
    expect(calls[0].url).toBe("http://statements:8081/api/v1/uploads");
    expect((calls[0].init.headers as Headers).get("upload-ticket")).toBe(
      "v1.a.b",
    );
  });

  it("answers 502 in the error envelope when the backend is down", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("ECONNREFUSED"))),
    );
    const response = await GET(
      new Request("http://web.local/api/v1/orgs"),
      params(["orgs"]),
    );
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("backend_unavailable");
  });
});
