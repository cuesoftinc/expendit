// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./client";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("api client (repositories' single network seam)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("targets the mock server in TEST_MODE and sends org/idempotency headers", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ ok: true }));
    await api.post(
      "/transactions",
      { amount: 1 },
      { orgId: "org-cuesoft", idempotencyKey: "key-1" },
    );
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe("/api/mock/v1/transactions");
    const headers = init?.headers as Record<string, string>;
    expect(headers["X-Org-Id"]).toBe("org-cuesoft");
    expect(headers["Idempotency-Key"]).toBe("key-1");
  });

  it("serializes query params and skips undefined values", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ items: [] }));
    await api.get("/transactions", {
      query: { direction: "income", cursor: undefined, limit: 5 },
    });
    expect(String(fetchSpy.mock.calls[0][0])).toBe(
      "/api/mock/v1/transactions?direction=income&limit=5",
    );
  });

  it("parses the ecosystem error envelope into ApiError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "tax_identity_incomplete",
            message: "Complete your tax profile",
            details: { missing: ["tin"] },
          },
        },
        422,
      ),
    );
    const error = await api
      .post("/tax/filings/x/generate")
      .catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(422);
    expect(apiError.code).toBe("tax_identity_incomplete");
    expect(apiError.details).toEqual({ missing: ["tin"] });
  });

  it("returns undefined for 204 responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    await expect(api.delete("/bank-links/x")).resolves.toBeUndefined();
  });
});
