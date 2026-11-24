import { afterEach, beforeEach, expect, it, vi } from "vitest";

const clearSession = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({
  getAuthProvider: () => ({
    clearSession,
    getBearerToken: async () => null,
  }),
  resetAuthProvider: vi.fn(),
}));
vi.mock("@/config/env", () => ({ env: { apiBase: "/api/v1" } }));

const replace = vi.fn();

beforeEach(() => {
  vi.resetModules();
  clearSession.mockClear();
  replace.mockClear();
  vi.stubGlobal("window", {
    location: {
      origin: "https://expendit.example",
      pathname: "/dashboard/transactions",
      search: "?category=travel",
      hash: "#ledger",
      replace,
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("clears a stale session once for concurrent 401s and preserves the destination", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async () => new Response("Unauthorized", { status: 401 }),
  );
  const { api, ApiError } = await import("./client");

  const results = await Promise.allSettled([
    api.get("/transactions"),
    api.get("/orgs"),
  ]);

  expect(
    results.every(
      (result) =>
        result.status === "rejected" && result.reason instanceof ApiError,
    ),
  ).toBe(true);
  expect(clearSession).toHaveBeenCalledOnce();
  expect(replace).toHaveBeenCalledExactlyOnceWith(
    "/signin?next=%2Fdashboard%2Ftransactions%3Fcategory%3Dtravel%23ledger",
  );
});

it("does not redirect repeatedly when /me returns 401 on the sign-in page", async () => {
  window.location.pathname = "/signin";
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(null, { status: 401 }),
  );
  const { api } = await import("./client");

  await expect(api.get("/me")).rejects.toMatchObject({ status: 401 });

  expect(clearSession).toHaveBeenCalledOnce();
  expect(replace).not.toHaveBeenCalled();
});

it.each([
  ["/auth/sso/exchange", {}, 401],
  ["/uploads", { headers: { "Upload-Ticket": "expired" } }, 401],
  ["/transactions", {}, 403],
])(
  "preserves normal error handling for %s (%s, %s)",
  async (path, options, status) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status }),
    );
    const { api } = await import("./client");
    await expect(api.post(path, undefined, options)).rejects.toMatchObject({
      status,
    });
    expect(clearSession).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  },
);
